package utils

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

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

type CustomClaims struct {
	UserID int    `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

func CreateJWTToken(secretKey string, userId int, email string) (string, error) {
	claims := CustomClaims{
		UserID: userId,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "Colin's Blog",
			Subject:   "user-auth",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString([]byte(secretKey))
	if err != nil {
		return "", err
	}
	return tokenStr, nil
}

func VerifyJWTToken(secretKey string, tokenStr string) (*CustomClaims, error) {
	fmt.Println("Verifying JWT Token:", tokenStr)

	// Verity the signing method
	token, err := jwt.ParseWithClaims(
		tokenStr,
		&CustomClaims{},
		func(token *jwt.Token) (any, error) {
			// Ensure the token's signing method is HMAC
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(secretKey), nil
		},
	)
	if err != nil {
		fmt.Println("Error parsing JWT Token:", err)
		return nil, err
	}
	// Verify the Claims
	if claims, ok := token.Claims.(*CustomClaims); ok && token.Valid {
		fmt.Println("JWT Token is valid")
		return claims, nil
	} else {
		fmt.Println("JWT Token is invalid")
		return nil, fmt.Errorf("invalid token")
	}
}
