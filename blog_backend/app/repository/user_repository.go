package repository

import (
	"blog_backend/app/models"

	"gorm.io/gorm"
)

type UserRepository interface {
	CreateUser(user *models.User) (*models.User, error)
	RetriveUser(user *models.User) (*models.User, error)
}

type userRepositoryGorm struct {
	db *gorm.DB
}

func (r *userRepositoryGorm) CreateUser(user *models.User) (*models.User, error) {
	if err := r.db.Create(user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

func (r *userRepositoryGorm) RetriveUser(user *models.User) (*models.User, error) {
	if err := r.db.First(user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepositoryGorm{db: db}
}
