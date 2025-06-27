package app

import (
	"blog_backend/app/config"
	"blog_backend/app/controller"
	"blog_backend/app/repository"
	"blog_backend/app/routes"
	"blog_backend/app/services"
	"blog_backend/app/utils"
	"fmt"

	"github.com/gin-gonic/gin"
)

type App struct {
	router *gin.Engine

	authController *controller.AuthController
}

func NewApp(cfg *config.Config) (*App, error) {

	router := gin.Default()

	// Initialize database connection
	db, err := utils.InitDatabase(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}

	// Set up Repositories and Services
	userRepo := repository.NewUserRepository(db)
	authService := services.NewAuthService(userRepo)

	// Initialize Controllers
	authController := controller.NewAuthController(authService)

	// Set up routes
	routes.SetupRoutes(router, authController)

	return &App{
		router:         router,
		authController: authController,
	}, nil
}

func (a *App) Run(addr string) error {
	return a.router.Run(":" + addr)
}
