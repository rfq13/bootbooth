package backend

import (
    "sync"
    "time"
)

type boothInfo struct {
    ID string
    Name string
    Location string
    OutletID string
    ConnectedAt time.Time
}

type boothHub struct { mu sync.Mutex; booths map[string]boothInfo }

func newBoothHub() *boothHub { return &boothHub{ booths: map[string]boothInfo{} } }

func (h *boothHub) register(info boothInfo) { h.mu.Lock(); h.booths[info.ID] = info; h.mu.Unlock() }
func (h *boothHub) unregister(id string) { h.mu.Lock(); delete(h.booths, id); h.mu.Unlock() }
func (h *boothHub) list() []boothInfo { h.mu.Lock(); defer h.mu.Unlock(); out := make([]boothInfo, 0, len(h.booths)); for _, v := range h.booths { out = append(out, v) }; return out }