package routes

import (
	"blog_backend/app/config"
	"blog_backend/app/controller"
	"blog_backend/app/utils"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(cfg *config.Config, router *gin.Engine,
	authController *controller.AuthController,
	postController *controller.PostController,
	commentController *controller.CommentController) {
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
		postRouter.GET("/:post_id", postController.RetrievePost)
		// Create post route is protected
		postRouter.Use(authMiddleWare(cfg.JWTSecret))
		postRouter.POST("/", postController.CreatePost)
		postRouter.PUT("/:post_id", postController.UpdatePost)
		postRouter.DELETE("/:post_id", postController.DeletePost)
	}

	commentRouter := router.Group("/comment")
	{
		commentRouter.GET("/:comment_id", commentController.RetrieveComment)
		commentRouter.GET("/post/:post_id", commentController.ListComments)
		commentRouter.Use(authMiddleWare(cfg.JWTSecret))
		commentRouter.PUT("/:comment_id", commentController.UpdateComment)
		commentRouter.POST("/", commentController.CreateComment)
		commentRouter.DELETE("/:comment_id", commentController.DeleteComment)
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
