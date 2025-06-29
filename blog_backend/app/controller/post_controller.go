package controller

import (
	"blog_backend/app/dto"
	"blog_backend/app/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type PostController struct {
	postService services.PostService
}

func (p PostController) CreatePost(ctx *gin.Context) {
	var request dto.PostCreateRequest
	if err := ctx.ShouldBindJSON(&request); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	post, err := p.postService.CreatePost(request.Title, request.Content, ctx.GetInt("userId"))
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resp := dto.PostCreateResponse{
		Message: "Post created successfully",
		PostItem: dto.PostItem{
			PostID:    post.ID,
			Title:     post.Title,
			Content:   post.Content,
			UserID:    post.UserID,
			CreatedAt: post.CreatedAt.Format("2006-01-02 15:04:05"),
			UpdatedAt: post.UpdatedAt.Format("2006-01-02 15:04:05"),
		},
	}
	ctx.JSON(http.StatusOK, resp)
}

func (p PostController) RetrievePost(ctx *gin.Context) {
	var request dto.PostRetrieveRequest
	if err := ctx.ShouldBindUri(&request); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	post, err := p.postService.RetrievePost(request.PostID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resp := dto.PostRetrieveResponse{
		PostItem: dto.PostItem{
			PostID:    post.ID,
			Title:     post.Title,
			Content:   post.Content,
			UserID:    post.UserID,
			CreatedAt: post.CreatedAt.Format("2006-01-02 15:04:05"),
			UpdatedAt: post.UpdatedAt.Format("2006-01-02 15:04:05"),
		},
	}
	ctx.JSON(http.StatusOK, resp)
}

func (p PostController) UpdatePost(ctx *gin.Context) {
	var request dto.PostUpdateRequest
	if err := ctx.ShouldBindJSON(&request); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	post, err := p.postService.UpdatePost(ctx.GetInt("userId"), request.PostID, request.Title, request.Content)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resp := dto.PostUpdateResponse{
		Message: "Post updated successfully",
		PostItem: dto.PostItem{
			PostID:    post.ID,
			Title:     post.Title,
			Content:   post.Content,
			UserID:    post.UserID,
			CreatedAt: post.CreatedAt.Format("2006-01-02 15:04:05"),
			UpdatedAt: post.UpdatedAt.Format("2006-01-02 15:04:05"),
		},
	}
	ctx.JSON(http.StatusOK, resp)
}

func (p PostController) DeletePost(ctx *gin.Context) {
	var request dto.PostDeleteRequest
	if err := ctx.ShouldBindUri(&request); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userId := ctx.GetInt("userId")
	err := p.postService.DeletePost(userId, request.PostID)
	if err != nil {
		if err.Error() == "permission denied" {
			ctx.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to delete this post"})
		} else {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	resp := dto.PostDeleteResponse{
		Message: "Post deleted successfully",
	}
	ctx.JSON(http.StatusOK, resp)
}

func NewPostController(postService services.PostService) *PostController {
	return &PostController{
		postService: postService,
	}
}
