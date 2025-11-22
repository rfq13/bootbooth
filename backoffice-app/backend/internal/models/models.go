package models

type Booking struct {
    ID string
    UserID string
    OutletID string
    PackageID string
    Status string
}

type Session struct {
    ID string
    BookingID string
    OutletID string
    Status string
}