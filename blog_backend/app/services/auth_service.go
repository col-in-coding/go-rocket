package services

import (
	"blog_backend/app/models"
	"blog_backend/app/repository"
	"blog_backend/app/utils"
)

type AuthService interface {
	Register(username, email, password string) (*models.User, error)
}

type authServiceImpl struct {
	userRepo repository.UserRepository
}

func (a *authServiceImpl) Register(username, email, password string) (user *models.User, err error) {
	user = &models.User{}
	user.Username = username
	user.Email = email
	user.Password, err = utils.HashPassword(password)
	if err != nil {
		return nil, err
	}
	return a.userRepo.CreateUser(user)
}

func NewAuthService(userRepo repository.UserRepository) AuthService {
	return &authServiceImpl{userRepo: userRepo}
}
