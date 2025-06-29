package repository

import (
	"blog_backend/app/models"
	"fmt"

	"gorm.io/gorm"
)

type CommentRepository interface {
	CreateComment(comment *models.Comment) (*models.Comment, error)
	RetrieveComment(id int) (*models.Comment, error)
	UpdateComment(comment *models.Comment) (*models.Comment, error)
	DeleteComment(id int) error
	ListComments(postID int) ([]*models.Comment, error)
}

type commentRepositoryGorm struct {
	db *gorm.DB
}

func (r *commentRepositoryGorm) CreateComment(comment *models.Comment) (*models.Comment, error) {
	if err := r.db.Create(comment).Error; err != nil {
		return nil, fmt.Errorf("failed to create comment: %w", err)
	}
	return comment, nil
}

func (r *commentRepositoryGorm) RetrieveComment(id int) (*models.Comment, error) {
	comment := &models.Comment{}
	if err := r.db.First(comment, id).Error; err != nil {
		return nil, fmt.Errorf("failed to retrieve comment with id %d: %w", id, err)
	}
	return comment, nil
}

func (r *commentRepositoryGorm) UpdateComment(comment *models.Comment) (*models.Comment, error) {
	if err := r.db.Model(&models.Comment{}).Where("id = ?", comment.ID).Updates(comment).Error; err != nil {
		return nil, fmt.Errorf("failed to update comment with id %d: %w", comment.ID, err)
	}
	return comment, nil
}

func (r *commentRepositoryGorm) DeleteComment(id int) error {
	if err := r.db.Delete(&models.Comment{}, id).Error; err != nil {
		return fmt.Errorf("failed to delete comment with id %d: %w", id, err)
	}
	return nil
}

func (r *commentRepositoryGorm) ListComments(postID int) ([]*models.Comment, error) {
	var comments []*models.Comment
	if err := r.db.Where("post_id = ?", postID).Find(&comments).Error; err != nil {
		return nil, fmt.Errorf("failed to list comments for post with id %d: %w", postID, err)
	}
	return comments, nil
}

func NewCommentRepository(db *gorm.DB) CommentRepository {
	return &commentRepositoryGorm{db: db}
}
