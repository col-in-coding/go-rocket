package models

import (
	"time"
)

type User struct {
	ID            int       `gorm:"primaryKey"`
	Username      string    `gorm:"size:100;not null"`
	Password      string    `gorm:"size:100;not null"`
	Email         string    `gorm:"size:100;not null;unique"`
	NumberOfPosts int       `gorm:"default:0"`
	CreatedAt     time.Time `gorm:"autoCreateTime;not null"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime;not null"`
	Posts         []Post    `gorm:"foreignKey:UserID"`
	Comments      []Comment `gorm:"foreignKey:UserID"`
}
