# 🎨 Sistem Efek Dinamis - Photo Booth

## Overview

Sistem efek gambar yang dapat diterapkan secara real-time pada:

- 📹 **Stream preview MJPEG** - Efek langsung saat preview
- 🖼️ **Preview frame-by-frame** - Efek pada preview Socket.IO
- 📸 **Hasil capture** - Efek disimpan pada foto yang di-capture

## Daftar Efek

### 1. **Fish Eye** 🐟

Efek distorsi barrel yang memberikan tampilan lensa fish eye.

- **Parameter**: Intensity (0.0 - 1.0)
- **Use case**: Foto kreatif, selfie lucu

### 2. **Grayscale** ⚫

Konversi gambar menjadi hitam putih menggunakan luminance formula.

- **Parameter**: Tidak ada
- **Use case**: Foto klasik, artistic

### 3. **Sepia** 📜

Memberikan tone warm vintage seperti foto lama.

- **Parameter**: Tidak ada
- **Use case**: Foto retro, nostalgia

### 4. **Vignette** 🌑

Menggelapkan tepi gambar untuk fokus ke tengah.

- **Parameter**: Intensity (0.0 - 1.0)
- **Use case**: Portrait, focus enhancement

### 5. **Blur** 💨

Efek soft focus dengan box blur.

- **Parameter**: Intensity (0.0 - 1.0)
- **Use case**: Background blur, dreamy effect

### 6. **Sharpen** 🔪

Meningkatkan ketajaman edge untuk detail lebih jelas.

- **Parameter**: Tidak ada
- **Use case**: Meningkatkan detail foto

### 7. **Invert** 🔄

Membalik warna menjadi negative.

- **Parameter**: Tidak ada
- **Use case**: Artistic, creative

### 8. **Pixelate** 🟦

Efek mosaic/pixel art.

- **Parameter**: Pixel Size (2 - 30)
- **Use case**: Privacy blur, artistic

## API Usage

### Socket.IO Events

#### Set Effect

```javascript
socket.emit("set-effect", {
  effect: "fisheye", // effect type
  params: {
    intensity: 0.7, // 0.0 to 1.0
    radius: 1.0, // for fisheye/vignette
    pixelSize: 10, // for pixelate
  },
});
```

#### Get Current Effect

```javascript
socket.emit("get-effect");

socket.on("current-effect", (data) => {
  console.log("Current:", data.effect);
  console.log("Params:", data.params);
});
```

#### Listen for Effect Changes

```javascript
socket.on("effectChanged", (data) => {
  console.log("Effect changed to:", data.effect);
  console.log("With params:", data.params);
});
```

### HTTP REST API

#### Get Available Effects

```bash
GET /api/effects
```

Response:

```json
{
  "effects": [
    {
      "id": "fisheye",
      "name": "Fish Eye",
      "description": "Barrel distortion effect",
      "hasIntensity": true
    },
    ...
  ]
}
```

## Code Integration

### Backend (Go)

```go
// Set effect on MJPEG stream
mjpeg.SetEffect(EffectFishEye, EffectParams{
    Intensity: 0.7,
    Radius: 1.0,
})

// Set effect on GPhoto wrapper
gp.SetEffect(EffectGrayscale, EffectParams{})

// Apply effect to image bytes
processedData, err := effects.ApplyEffect(imageBytes)
```

### Frontend (React)

```jsx
import EffectControls from "./components/EffectControls";

function App() {
  const [socket, setSocket] = useState(null);

  return (
    <div>
      <EffectControls socket={socket} />
      {/* ... other components */}
    </div>
  );
}
```

## Cara Kerja

### 1. Real-time Stream (MJPEG)

```
Camera → gphoto2 → JPEG frames → Apply Effect → Send to Clients
```

### 2. Preview Frame-by-frame

```
gphoto2 --capture-preview → JPEG file → Apply Effect → Base64 → Socket.IO
```

### 3. Capture Photo

```
gphoto2 --capture-image → JPEG file → Apply Effect → Save to disk
```

## Performance Considerations

### Optimasi untuk Stream Real-time

1. **Fish Eye** - CPU intensive untuk resolusi tinggi

   - Caching distance calculations
   - Lower resolution untuk real-time

2. **Blur** - Dapat lambat dengan radius besar

   - Gunakan intensity rendah (0.3-0.5)
   - Box blur sederhana

3. **Pixelate** - Sangat cepat

   - Bagus untuk real-time

4. **Grayscale/Sepia/Invert** - Sangat cepat
   - Pixel-level operation
   - Ideal untuk stream

### Tips Performance

```go
// Reduce resolution for preview
if streaming {
    params.Intensity = 0.5  // Lower intensity
}

// Skip effect if too slow
timeout := 100 * time.Millisecond
if processingTime > timeout {
    return originalImage
}
```

## Custom Effect

Untuk menambah efek baru:

1. **Tambah konstanta** di `image_effects.go`:

```go
const (
    EffectCustom EffectType = "custom"
)
```

2. **Implement function**:

```go
func applyCustomEffect(img image.Image, params EffectParams) image.Image {
    // Your effect logic
    return processedImage
}
```

3. **Tambah ke switch case** di `ApplyEffect()`:

```go
case EffectCustom:
    processed = applyCustomEffect(img, params)
```

4. **Update UI** di `EffectControls.jsx`:

```javascript
{ id: 'custom', name: 'Custom', icon: '✨', hasParams: true }
```

## Testing

### Test Fish Eye Effect

```bash
# Send test image through effect pipeline
curl -X POST http://localhost:3001/api/test-effect \
  -H "Content-Type: application/json" \
  -d '{"effect":"fisheye","intensity":0.7}'
```

### Monitor Performance

```go
start := time.Now()
processedData, _ := effects.ApplyEffect(data)
duration := time.Since(start)
log.Printf("Effect processing: %v", duration)
```

## Troubleshooting

### Efek tidak muncul di stream

1. Check apakah effect sudah di-set dengan benar
2. Verify stream masih aktif
3. Check log untuk error processing

### Performance lambat

1. Reduce intensity parameter
2. Gunakan efek yang lebih sederhana
3. Lower preview resolution

### Efek berbeda antara preview dan capture

1. Pastikan kedua menggunakan effect instance yang sama
2. Sync parameter changes ke keduanya

## Example Workflow

```javascript
// User workflow
1. User membuka photobooth
2. Start preview stream
3. Select "Fish Eye" effect → Applied real-time
4. Adjust intensity slider → Updated immediately
5. Happy with preview → Capture photo
6. Photo saved with effect applied
7. Change to "Grayscale" → Preview updated
8. Capture another photo
```

## Future Enhancements

- [ ] Multiple effects combination
- [ ] Custom effect presets
- [ ] Face detection for selective effects
- [ ] GPU acceleration for complex effects
- [ ] Effect preview thumbnails
- [ ] Undo/Redo functionality
- [ ] Save effect presets per user

## License

Part of Photo Booth Camera System
