package repository

import (
	"blog_backend/app/models"
	"fmt"

	"gorm.io/gorm"
)

type PostRepository interface {
	CreatePost(post *models.Post) (*models.Post, error)
	RetrievePost(id int) (*models.Post, error)
	UpdatePost(post *models.Post) (*models.Post, error)
	DeletePost(id int) error
}

type postRepositoryGorm struct {
	db *gorm.DB
}

func (r *postRepositoryGorm) CreatePost(post *models.Post) (*models.Post, error) {
	if err := r.db.Create(post).Error; err != nil {
		return nil, fmt.Errorf("failed to create post: %w", err)
	}
	return post, nil
}

func (r *postRepositoryGorm) RetrievePost(id int) (*models.Post, error) {
	post := &models.Post{}
	if err := r.db.First(post, id).Error; err != nil {
		return nil, fmt.Errorf("failed to retrieve post with id %d: %w", id, err)
	}
	return post, nil
}

func (r *postRepositoryGorm) UpdatePost(post *models.Post) (*models.Post, error) {
	err := r.db.Model(&models.Post{}).Where("id = ?", post.ID).Updates(post).Error
	if err != nil {
		return nil, fmt.Errorf("failed to update post with id %d: %w", post.ID, err)
	}
	return post, nil
}

func (r *postRepositoryGorm) DeletePost(id int) error {
	if err := r.db.Delete(&models.Post{}, id).Error; err != nil {
		return fmt.Errorf("failed to delete post with id %d: %w", id, err)
	}
	return nil
}

func NewPostRepository(db *gorm.DB) PostRepository {
	return &postRepositoryGorm{db: db}
}
