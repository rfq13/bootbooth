package backend

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
)

func hashPassword(password, salt, pepper string) string {
    h := sha256.New()
    h.Write([]byte(password))
    h.Write([]byte("~"))
    h.Write([]byte(salt))
    h.Write([]byte("~"))
    h.Write([]byte(pepper))
    return hex.EncodeToString(h.Sum(nil))
}

func genSalt() string {
    b := make([]byte, 16)
    _, _ = rand.Read(b)
    return hex.EncodeToString(b)
}
