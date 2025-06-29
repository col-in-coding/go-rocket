package controller

import (
	"blog_backend/app/dto"
	"blog_backend/app/services"
	"fmt"

	"github.com/gin-gonic/gin"
)

type AuthController struct {
	authService services.AuthService
}

func (a AuthController) Register(ctx *gin.Context) {

	request := &dto.UserRegisterRequest{}

	if err := ctx.ShouldBind(request); err != nil {
		ctx.JSON(400, gin.H{"error": err.Error()})
		return
	}

	fmt.Printf("Received user registration request: %+v\n", request)
	user, err := a.authService.Register(request.Username, request.Email, request.Password)
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}

	resp := dto.UserRegisterResponse{
		Message:  "User registered successfully",
		UserID:   user.ID,
		Username: user.Username,
		Email:    user.Email,
	}
	ctx.JSON(200, resp)
}

func (a AuthController) Login(ctx *gin.Context) {
	request := &dto.LoginRequest{}
	if err := ctx.ShouldBind(request); err != nil {
		ctx.JSON(400, gin.H{"error": err.Error()})
		return
	}

	_, token, err := a.authService.Login(request.Email, request.Password)
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}
	fmt.Println(token)

	resp := dto.LoginPesponse{Message: "Login Success", Token: token}
	ctx.JSON(200, resp)
}

func NewAuthController(authservice services.AuthService) *AuthController {
	return &AuthController{
		authService: authservice,
	}
}
