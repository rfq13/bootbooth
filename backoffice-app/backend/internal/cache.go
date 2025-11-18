package backend

import (
    "sync"
    "time"
)

type cacheItem struct { v any; exp time.Time }

type ttlCache struct { m map[string]cacheItem; mu sync.Mutex }

func newTTLCache() *ttlCache { return &ttlCache{ m: map[string]cacheItem{} } }

func (c *ttlCache) set(k string, v any, ttl time.Duration) { c.mu.Lock(); c.m[k] = cacheItem{ v: v, exp: time.Now().Add(ttl) }; c.mu.Unlock() }

func (c *ttlCache) get(k string) (any, bool) { c.mu.Lock(); it, ok := c.m[k]; if ok && time.Now().Before(it.exp) { c.mu.Unlock(); return it.v, true }; if ok { delete(c.m, k) }; c.mu.Unlock(); return nil, false }