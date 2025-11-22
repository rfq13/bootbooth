package repository

type Repository interface {
    ListOutlets() ([]map[string]any, error)
    ListAdminUsers() ([]map[string]any, error)
    ListBookings(status string) ([]map[string]any, error)
    GetSessionStatus(id string) (map[string]any, error)
    OverrideSession(id, admin string) (map[string]any, error)
    CreateBooking(userName, outletName string) (map[string]any, error)
    ConfirmPayment(bookingID string) (map[string]any, error)
    Arrival(id string, nowUnix int64, toleranceMinutes int) (map[string]any, error)
    Start(id string) (map[string]any, error)
    Finish(id string) (map[string]any, error)
    GetSystemConfig() (map[string]any, error)
    UpdateSystemConfig(sessionMinutes int, toleranceMinutes int) (map[string]any, error)
}

type MemoryRepo struct{}

func (m MemoryRepo) ListOutlets() ([]map[string]any, error) { return []map[string]any{}, nil }
func (m MemoryRepo) ListAdminUsers() ([]map[string]any, error) { return []map[string]any{}, nil }
func (m MemoryRepo) ListBookings(status string) ([]map[string]any, error) { return []map[string]any{}, nil }
func (m MemoryRepo) GetSessionStatus(id string) (map[string]any, error) { return map[string]any{"status": "AWAITING_CUSTOMER"}, nil }
func (m MemoryRepo) OverrideSession(id, admin string) (map[string]any, error) { return map[string]any{"status": "OVERRIDDEN"}, nil }
func (m MemoryRepo) CreateBooking(userName, outletName string) (map[string]any, error) { return map[string]any{"id":"bk-mem","status":"PENDING_PAYMENT","user_name":userName,"outlet_name":outletName}, nil }
func (m MemoryRepo) ConfirmPayment(bookingID string) (map[string]any, error) { return map[string]any{"id":bookingID,"status":"PAID"}, nil }
func (m MemoryRepo) Arrival(id string, nowUnix int64, toleranceMinutes int) (map[string]any, error) { return map[string]any{"id":id,"status":"ARRIVED"}, nil }
func (m MemoryRepo) Start(id string) (map[string]any, error) { return map[string]any{"id":id,"status":"ONGOING"}, nil }
func (m MemoryRepo) Finish(id string) (map[string]any, error) { return map[string]any{"id":id,"status":"DONE"}, nil }
func (m MemoryRepo) GetSystemConfig() (map[string]any, error) { return map[string]any{"session_duration_minutes": 20, "arrival_tolerance_minutes": 15}, nil }
func (m MemoryRepo) UpdateSystemConfig(sessionMinutes int, toleranceMinutes int) (map[string]any, error) { return map[string]any{"session_duration_minutes": sessionMinutes, "arrival_tolerance_minutes": toleranceMinutes}, nil }