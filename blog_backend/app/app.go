package app

import (
	"blog_backend/app/routes"

	"github.com/gin-gonic/gin"
)

type App struct {
	router *gin.Engine
}

func NewApp() (*App, error) {

	router := gin.Default()

	// Set up routes
	routes.SetupRoutes(router)

	return &App{
		router: router,
	}, nil
}

func (a *App) Run(addr string) error {
	return a.router.Run(addr)
}
