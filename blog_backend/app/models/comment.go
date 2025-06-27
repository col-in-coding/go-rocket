package models

import (
	"time"
)

type Comment struct {
	ID        int       `gorm:"primaryKey"`
	Content   string    `gorm:"type:text;not null"`
	UserID    int       `gorm:"not null"`
	User      User      `gorm:"foreignKey:UserID"`
	PostID    int       `gorm:"not null"`
	Post      Post      `gorm:"foreignKey:PostID"`
	CreatedAt time.Time `gorm:"autoCreateTime;not null"`
}
