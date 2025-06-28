package services

import (
	"blog_backend/app/config"
	"blog_backend/app/models"
	"blog_backend/app/repository"
	"blog_backend/app/utils"
	"fmt"
)

type AuthService interface {
	Register(username, email, password string) (*models.User, error)
	Login(email, password string) (user *models.User, token string, err error)
}

type authServiceImpl struct {
	cfg *config.Config

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

func (a *authServiceImpl) Login(email, password string) (user *models.User, token string, err error) {
	user = &models.User{}
	user.Email = email
	user.Password, err = utils.HashPassword(password)
	if err != nil {
		return nil, "", fmt.Errorf("hash password failed: %w", err)
	}
	user, err = a.userRepo.RetriveUser(user)
	if err != nil {
		return nil, "", fmt.Errorf("retrieve user failed: %w", err)
	}
	token, err = utils.CreateJWTToken(a.cfg.JWTSecret, user.ID, user.Email)
	if err != nil {
		return nil, "", fmt.Errorf("create jwt token failed: %w", err)
	}
	return user, token, nil
}

func NewAuthService(cfg *config.Config, userRepo repository.UserRepository) AuthService {
	return &authServiceImpl{
		cfg:      cfg,
		userRepo: userRepo,
	}
}
