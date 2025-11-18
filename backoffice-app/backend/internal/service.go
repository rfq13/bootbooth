package backend

import (
    "context"
    repo "backoffice/backend/internal/repository"
)

type Service struct { r repo.Repository }

func NewService(r repo.Repository) *Service { return &Service{ r: r } }

func (s *Service) GetSessionStatus(ctx context.Context, id string) (map[string]any, error) { return s.r.GetSessionStatus(id) }
func (s *Service) OverrideSession(ctx context.Context, id, admin string) (map[string]any, error) { return s.r.OverrideSession(id, admin) }
func (s *Service) ListOutlets(ctx context.Context) ([]map[string]any, error) { return s.r.ListOutlets() }
func (s *Service) ListAdminUsers(ctx context.Context) ([]map[string]any, error) { return s.r.ListAdminUsers() }
func (s *Service) ListBookings(ctx context.Context, status string) ([]map[string]any, error) { return s.r.ListBookings(status) }
func (s *Service) CreateBooking(ctx context.Context, userName, outletName string) (map[string]any, error) { return s.r.CreateBooking(userName, outletName) }
func (s *Service) ConfirmPayment(ctx context.Context, bookingID string) (map[string]any, error) { return s.r.ConfirmPayment(bookingID) }
func (s *Service) Arrival(ctx context.Context, id string, nowUnix int64, toleranceMinutes int) (map[string]any, error) { return s.r.Arrival(id, nowUnix, toleranceMinutes) }
func (s *Service) Start(ctx context.Context, id string) (map[string]any, error) { return s.r.Start(id) }
func (s *Service) Finish(ctx context.Context, id string) (map[string]any, error) { return s.r.Finish(id) }
func (s *Service) GetSystemConfig(ctx context.Context) (map[string]any, error) { return s.r.GetSystemConfig() }
func (s *Service) UpdateSystemConfig(ctx context.Context, sessionMinutes int, toleranceMinutes int) (map[string]any, error) { return s.r.UpdateSystemConfig(sessionMinutes, toleranceMinutes) }