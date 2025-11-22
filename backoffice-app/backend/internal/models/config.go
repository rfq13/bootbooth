package models

import "time"

type SystemConfig struct {
    SessionDurationMinutes int
    ArrivalToleranceMinutes int
    UpdatedAt time.Time
}