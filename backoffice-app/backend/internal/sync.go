package backend

import (
    "container/list"
    "time"
)

type syncJob struct { id string; created time.Time }

type syncQueue struct { q *list.List }

func newSyncQueue() *syncQueue { return &syncQueue{q: list.New()} }

func (s *syncQueue) push(j syncJob) { s.q.PushBack(j) }

func (s *syncQueue) pop() (syncJob, bool) {
    e := s.q.Front(); if e == nil { return syncJob{}, false }
    s.q.Remove(e); return e.Value.(syncJob), true
}