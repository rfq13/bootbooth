package main

import (
    "context"
    "encoding/base64"
    "errors"
    "log"
    "os"
    "os/exec"
    "path/filepath"
    "sort"
    "strings"
    "sync"
    "time"
)

type Camera struct {
    Model string `json:"model"`
    Port  string `json:"port"`
}

type GPhotoWrapper struct {
    outputDir        string
    previewDir       string
    isPreviewActive  bool
    previewStopCh    chan struct{}
    mu               sync.Mutex
}

func NewGPhotoWrapper() *GPhotoWrapper {
    gp := &GPhotoWrapper{
        outputDir:     filepath.Join("..", "server", "uploads"),
        previewDir:    filepath.Join("..", "server", "previews"),
        previewStopCh: make(chan struct{}, 1),
    }
    _ = os.MkdirAll(gp.outputDir, 0755)
    _ = os.MkdirAll(gp.previewDir, 0755)
    return gp
}

func (gp *GPhotoWrapper) DetectCamera() ([]Camera, error) {
    cmd := exec.Command("gphoto2", "--auto-detect")
    out, err := cmd.CombinedOutput()
    if err != nil {
        return nil, err
    }
    lines := strings.Split(string(out), "\n")
    cams := make([]Camera, 0)
    for i := 2; i < len(lines); i++ { // skip header lines
        line := strings.TrimSpace(lines[i])
        if line == "" {
            continue
        }
        // parse: <model>  <port> (two or more spaces)
        parts := splitByMultipleSpaces(line)
        if len(parts) >= 2 {
            cams = append(cams, Camera{Model: parts[0], Port: parts[1]})
        }
    }
    return cams, nil
}

func splitByMultipleSpaces(s string) []string {
    // collapse multiple spaces to single and then split
    fields := make([]string, 0)
    cur := strings.Builder{}
    lastSpace := false
    for _, r := range s {
        if r == ' ' || r == '\t' {
            if lastSpace {
                continue
            }
            lastSpace = true
            if cur.Len() > 0 {
                fields = append(fields, cur.String())
                cur.Reset()
            }
        } else {
            lastSpace = false
            cur.WriteRune(r)
        }
    }
    if cur.Len() > 0 {
        fields = append(fields, cur.String())
    }
    return fields
}

func (gp *GPhotoWrapper) CapturePreviewFrame() (map[string]any, error) {
    ts := time.Now().UnixMilli()
    filename := "preview_" + formatInt(ts) + ".jpg"
    path := filepath.Join(gp.previewDir, filename)
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    cmd := exec.CommandContext(ctx, "gphoto2", "--capture-preview", "--force-overwrite", "--filename", path)
    out, err := cmd.CombinedOutput()
    if len(out) > 0 {
        msg := string(out)
        if strings.Contains(msg, "Capturing preview frame") {
            log.Printf("GPhoto2 preview message: %s", strings.TrimSpace(msg))
        }
    }
    if err != nil {
        return nil, err
    }
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, errors.New("Preview file not created")
    }
    gp.cleanupPreviews(3)
    b64 := base64.StdEncoding.EncodeToString(data)
    return map[string]any{
        "success":   true,
        "image":     "data:image/jpeg;base64," + b64,
        "timestamp": ts,
    }, nil
}

func (gp *GPhotoWrapper) StartPreviewStream(emit func(event string, payload any), fps int) map[string]any {
    gp.mu.Lock()
    defer gp.mu.Unlock()
    if gp.isPreviewActive {
        return map[string]any{"success": false, "error": "Preview already active"}
    }
    gp.isPreviewActive = true
    interval := time.Second
    if fps > 0 {
        interval = time.Second / time.Duration(fps)
    }
    stopCh := make(chan struct{})
    gp.previewStopCh = stopCh
    go func() {
        ticker := time.NewTicker(interval)
        defer ticker.Stop()
        for {
            select {
            case <-ticker.C:
                res, err := gp.CapturePreviewFrame()
                if err != nil {
                    emit("preview-error", map[string]any{"success": false, "error": err.Error()})
                    continue
                }
                // match client listener name
                emit("previewFrame", res)
            case <-stopCh:
                return
            }
        }
    }()
    return map[string]any{"success": true, "fps": fps}
}

func (gp *GPhotoWrapper) StopPreviewStream() map[string]any {
    gp.mu.Lock()
    defer gp.mu.Unlock()
    if gp.isPreviewActive {
        gp.isPreviewActive = false
        select {
        case gp.previewStopCh <- struct{}{}:
        default:
        }
        gp.previewStopCh = make(chan struct{}, 1)
    }
    return map[string]any{"success": true}
}

func (gp *GPhotoWrapper) CaptureImage() (map[string]any, error) {
    ts := time.Now().UnixMilli()
    filename := "photo_" + formatInt(ts) + ".jpg"
    path := filepath.Join(gp.outputDir, filename)
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    cmd := exec.CommandContext(ctx, "gphoto2", "--capture-image-and-download", "--filename", path, "--skip-existing")
    if err := cmd.Run(); err != nil {
        // stderr can contain non-error messages; still return error if command failed
        return nil, err
    }
    // Find created file (case-insensitive extension)
    entries, _ := os.ReadDir(gp.outputDir)
    var matched string
    for _, e := range entries {
        name := e.Name()
        if strings.HasPrefix(name, "photo_"+formatInt(ts)) && (strings.HasSuffix(strings.ToLower(name), ".jpg") || strings.HasSuffix(strings.ToLower(name), ".jpeg") || strings.HasSuffix(strings.ToLower(name), ".jpg")) {
            matched = name
            break
        }
    }
    if matched == "" {
        return nil, errors.New("Photo file not found")
    }
    return map[string]any{
        "success":   true,
        "filepath":  filepath.Join(gp.outputDir, matched),
        "filename":  matched,
        "url":       "/uploads/" + matched,
        "timestamp": ts,
    }, nil
}

func (gp *GPhotoWrapper) cleanupPreviews(keepLast int) {
    entries, err := os.ReadDir(gp.previewDir)
    if err != nil {
        return
    }
    type item struct{ name string; path string; time int64 }
    items := make([]item, 0)
    for _, e := range entries {
        name := e.Name()
        if !strings.HasPrefix(name, "preview_") { continue }
        p := filepath.Join(gp.previewDir, name)
        st, err := os.Stat(p)
        if err != nil { continue }
        items = append(items, item{name: name, path: p, time: st.ModTime().UnixMilli()})
    }
    sort.Slice(items, func(i, j int) bool { return items[i].time > items[j].time })
    for idx := keepLast; idx < len(items); idx++ {
        _ = os.Remove(items[idx].path)
    }
}

func formatInt(v int64) string {
    // fast int64 to string
    if v == 0 { return "0" }
    var b [20]byte
    i := len(b)
    for v > 0 {
        i--
        b[i] = byte('0' + v%10)
        v /= 10
    }
    return string(b[i:])
}