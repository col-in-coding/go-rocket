package utils

import "golang.org/x/crypto/bcrypt"

func HashPassword(password string) (string, error) {
	hashBytes, err := bcrypt.GenerateFromPassword(
		[]byte(password),
		bcrypt.DefaultCost,
	)
	return string(hashBytes), err
}

func CheckPassword(password, hasedPassword string) bool {
	err := bcrypt.CompareHashAndPassword(
		[]byte(hasedPassword), []byte(password),
	)
	return err == nil
}
