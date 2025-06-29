package services

import (
	"blog_backend/app/models"
	"blog_backend/app/repository"
	"fmt"
)

type PostService interface {
	CreatePost(title string, content string, userId int) (*models.Post, error)
	RetrievePost(id int) (*models.Post, error)
	UpdatePost(userId int, id int, title, content string) (*models.Post, error)
	DeletePost(userId int, id int) error
}

type postServiceImpl struct {
	postRepo repository.PostRepository
}

func (p *postServiceImpl) CreatePost(title string, content string, userId int) (*models.Post, error) {
	post := &models.Post{
		Title:   title,
		Content: content,
		UserID:  userId,
	}
	createdPost, err := p.postRepo.CreatePost(post)
	if err != nil {
		return nil, fmt.Errorf("failed to create post: %w", err)
	}
	return createdPost, nil
}

func (p *postServiceImpl) RetrievePost(id int) (*models.Post, error) {
	post, err := p.postRepo.RetrievePost(id)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve post: %w", err)
	}
	return post, nil
}

func (p *postServiceImpl) UpdatePost(userId int, id int, title, content string) (*models.Post, error) {
	post, err := p.postRepo.RetrievePost(id)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve post for update: %w", err)
	}
	if post.UserID != userId {
		return nil, fmt.Errorf("user does not have permission to update this post")
	}
	post.Title = title
	post.Content = content
	updatedPost, err := p.postRepo.UpdatePost(post)
	if err != nil {
		return nil, fmt.Errorf("failed to update post: %w", err)
	}
	return updatedPost, nil
}

func (p *postServiceImpl) DeletePost(userId int, id int) error {
	post, err := p.postRepo.RetrievePost(id)
	if err != nil {
		return fmt.Errorf("failed to retrieve post for deletion: %w", err)
	}
	if post.UserID != userId {
		return fmt.Errorf("permission denied")
	}
	if err := p.postRepo.DeletePost(id); err != nil {
		return fmt.Errorf("failed to delete post: %w", err)
	}
	return nil
}

func NewPostService(postRepo repository.PostRepository) PostService {
	return &postServiceImpl{
		postRepo: postRepo,
	}
}
