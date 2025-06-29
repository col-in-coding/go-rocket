package services

import (
	"blog_backend/app/models"
	"blog_backend/app/repository"
	"fmt"
)

type CommentService interface {
	CreateComment(postID int, userID int, content string) (*models.Comment, error)
	RetrieveComment(commentID int) (*models.Comment, error)
	UpdateComment(userId int, commentID int, content string) (*models.Comment, error)
	DeleteComment(userId int, commentID int) error
	ListComments(postID int) ([]*models.Comment, error)
}

type commentServiceImpl struct {
	commentRepo repository.CommentRepository
}

func (c *commentServiceImpl) CreateComment(postID int, userID int, content string) (*models.Comment, error) {
	comment := &models.Comment{
		PostID:  postID,
		UserID:  userID,
		Content: content,
	}
	createdComment, err := c.commentRepo.CreateComment(comment)
	if err != nil {
		return nil, fmt.Errorf("failed to create comment: %w", err)
	}
	return createdComment, nil
}

func (c *commentServiceImpl) RetrieveComment(commentID int) (*models.Comment, error) {
	comment, err := c.commentRepo.RetrieveComment(commentID)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve comment: %w", err)
	}
	return comment, nil
}

func (c *commentServiceImpl) UpdateComment(userId int, commentID int, content string) (*models.Comment, error) {
	comment, err := c.commentRepo.RetrieveComment(commentID)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve comment for update: %w", err)
	}
	if comment.UserID != userId {
		return nil, fmt.Errorf("user does not have permission to update this comment")
	}
	comment.Content = content
	updatedComment, err := c.commentRepo.UpdateComment(comment)
	if err != nil {
		return nil, fmt.Errorf("failed to update comment: %w", err)
	}
	return updatedComment, nil
}

func (c *commentServiceImpl) DeleteComment(userId, commentID int) error {
	// Check if the comment exists before attempting to delete
	comment, err := c.commentRepo.RetrieveComment(commentID)
	if err != nil {
		return fmt.Errorf("failed to retrieve comment for deletion: %w", err)
	}
	if comment.UserID != userId {
		return fmt.Errorf("user does not have permission to delete this comment")
	}
	// Proceed to delete the comment
	if err := c.commentRepo.DeleteComment(commentID); err != nil {
		return fmt.Errorf("failed to delete comment: %w", err)
	}
	return nil
}

func (c *commentServiceImpl) ListComments(postID int) ([]*models.Comment, error) {
	comments, err := c.commentRepo.ListComments(postID)
	if err != nil {
		return nil, fmt.Errorf("failed to list comments: %w", err)
	}
	return comments, nil
}

func NewCommentService(commentRepo repository.CommentRepository) CommentService {
	return &commentServiceImpl{
		commentRepo: commentRepo,
	}
}
