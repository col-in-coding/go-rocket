package models

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

type Post struct {
	ID        int       `gorm:"primaryKey"`
	Title     string    `gorm:"size:200;not null"`
	Content   string    `gorm:"type:text;not null"`
	UserID    int       `gorm:"not null"`
	User      User      `gorm:"foreignKey:UserID"`
	Comments  []Comment `gorm:"foreignKey:PostID"`
	CreatedAt time.Time `gorm:"autoCreateTime;not null"`
	UpdatedAt time.Time `gorm:"autoUpdateTime;not null"`
}

func (p *Post) AfterCreate(tx *gorm.DB) (err error) {
	// Increment the user's number of posts after a post is created
	if err := tx.Model(&User{}).Where("id = ?", p.UserID).UpdateColumn("number_of_posts", gorm.Expr("number_of_posts + ?", 1)).Error; err != nil {
		return fmt.Errorf("failed to update user's number of posts: %w", err)
	}
	return
}

func (p *Post) AfterDelete(tx *gorm.DB) (err error) {
	// Decrement the user's number of posts after a post is deleted
	if err := tx.Model(&User{}).Where("id = ?", p.UserID).UpdateColumn("number_of_posts", gorm.Expr("number_of_posts - ?", 1)).Error; err != nil {
		return fmt.Errorf("failed to update user's number of posts: %w", err)
	}
	return
}
