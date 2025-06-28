package routes

import (
	"blog_backend/app/config"
	"blog_backend/app/controller"
	"blog_backend/app/utils"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(cfg *config.Config, router *gin.Engine, authController *controller.AuthController) {
	// Define your routes here
	router.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "pong",
		})
	})

	// Protected routes
	userRouter := router.Group("/user")
	{
		userRouter.POST("/register", authController.Register)
		userRouter.POST("/login", authController.Login)
		// Profile route is protected
		userRouter.Use(authMiddleWare(cfg.JWTSecret))
		// This middleware will check for a valid JWT token
		userRouter.GET("/profile", func(c *gin.Context) {
			userId, exists := c.Get("userId")
			if !exists {
				c.JSON(401, gin.H{"error": "Unauthorized"})
				return
			}
			email, _ := c.Get("email")
			c.JSON(200, gin.H{
				"userId": userId,
				"email":  email,
			})
		})
	}
	// Post routes get post is public, create post is protected
	postRouter := router.Group("/post")
	{
		postRouter.GET("/", func(c *gin.Context) {
			// Logic to retrieve posts
			c.JSON(200, gin.H{"message": "List of posts"})
		})
		// Create post route is protected
		postRouter.POST("/", authMiddleWare(cfg.JWTSecret), func(c *gin.Context) {
			// Logic to create a post
			userId, exists := c.Get("userId")
			if !exists {
				c.JSON(401, gin.H{"error": "Unauthorized"})
				return
			}

			// Here you would typically bind the request body to a struct
			// and save the post to the database.
			// For simplicity, we will just return a success message.

			c.JSON(200, gin.H{
				"message": "Post created successfully",
				"userId":  userId,
			})
		})
	}

}

func authMiddleWare(secretKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Implement your authentication logic here
		// For example, check for a valid token in the request header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(401, gin.H{"error": "Unauthorized"})
			return
		}

		// If token is valid, proceed to the next handler
		tokenString := authHeader[len("Bearer "):]
		claims, err := utils.VerifyJWTToken(secretKey, tokenString)
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"error": "Invalid token"})
			return
		}
		c.Set("userId", claims.UserID)
		c.Set("email", claims.Email)
		c.Next()
	}
}
