package routes

import (
	"blog_backend/app/controller"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine, authController *controller.AuthController) {
	// Define your routes here
	router.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "pong",
		})
	})

	api := router.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", authController.Register)
			auth.POST("/login", authController.Login)
		}
	}
}
