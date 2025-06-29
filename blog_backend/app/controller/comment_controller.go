package controller

import (
	"blog_backend/app/dto"
	"blog_backend/app/services"
	"fmt"

	"github.com/gin-gonic/gin"
)

type CommentController struct {
	commentService services.CommentService
}

func (c CommentController) CreateComment(ctx *gin.Context) {
	request := &dto.CommentCreateRequest{}
	if err := ctx.ShouldBindJSON(request); err != nil {
		ctx.JSON(400, gin.H{"error": err.Error()})
		return
	}

	comment, err := c.commentService.CreateComment(request.PostID, ctx.GetInt("userId"), request.Content)
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}

	resp := dto.CommentCreateResponse{
		Message: "Comment created successfully",
		CommentItem: dto.CommentItem{
			ID:        comment.ID,
			Content:   comment.Content,
			UserID:    comment.UserID,
			PostID:    comment.PostID,
			CreatedAt: comment.CreatedAt.Format("2006-01-02 15:04:05"),
		},
	}
	ctx.JSON(200, resp)
}

func (c CommentController) RetrieveComment(ctx *gin.Context) {
	request := &dto.CommentRetrieveRequest{}
	if err := ctx.ShouldBindUri(request); err != nil {
		ctx.JSON(400, gin.H{"error": err.Error()})
		return
	}

	comment, err := c.commentService.RetrieveComment(request.CommentID)
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}

	resp := dto.CommentRetrieveResponse{
		Message: "Comment retrieved successfully",
		CommentItem: dto.CommentItem{
			ID:        comment.ID,
			Content:   comment.Content,
			UserID:    comment.UserID,
			PostID:    comment.PostID,
			CreatedAt: comment.CreatedAt.Format("2006-01-02 15:04:05"),
		},
	}
	ctx.JSON(200, resp)
}

func (c CommentController) UpdateComment(ctx *gin.Context) {
	var uriRequest dto.CommentUpdateURIRequest
	if err := ctx.ShouldBindUri(&uriRequest); err != nil {
		ctx.JSON(400, gin.H{"error": fmt.Errorf("invalid URI: %w", err)})
		return
	}
	var jsonRequest dto.CommentUpdateBodyRequest
	if err := ctx.ShouldBindJSON(&jsonRequest); err != nil {
		ctx.JSON(400, gin.H{"error": fmt.Errorf("invalid JSON body: %w", err)})
		return
	}

	updatedComment, err := c.commentService.UpdateComment(ctx.GetInt("userId"), uriRequest.CommentID, jsonRequest.Content)
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}
	resp := dto.CommentUpdateResponse{
		Message: "Comment updated successfully",
		CommentItem: dto.CommentItem{
			ID:        updatedComment.ID,
			Content:   updatedComment.Content,
			UserID:    updatedComment.UserID,
			PostID:    updatedComment.PostID,
			CreatedAt: updatedComment.CreatedAt.Format("2006-01-02 15:04:05"),
		},
	}
	ctx.JSON(200, resp)
}

func (c CommentController) DeleteComment(ctx *gin.Context) {
	request := &dto.CommentDeleteRequest{}
	if err := ctx.ShouldBindUri(request); err != nil {
		ctx.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if err := c.commentService.DeleteComment(ctx.GetInt("userId"), request.CommentID); err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(200, gin.H{"message": "Comment deleted successfully"})
}

func (c CommentController) ListComments(ctx *gin.Context) {
	request := &dto.ListCommentsRequest{}
	if err := ctx.ShouldBindUri(request); err != nil {
		ctx.JSON(400, gin.H{"error": err.Error()})
		return
	}

	comments, err := c.commentService.ListComments(request.PostID)
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}

	resp := dto.ListCommentsResponse{
		Message:  "Comments retrieved successfully",
		Comments: make([]dto.CommentItem, len(comments)),
	}
	for i, comment := range comments {
		resp.Comments[i] = dto.CommentItem{
			ID:        comment.ID,
			Content:   comment.Content,
			UserID:    comment.UserID,
			PostID:    comment.PostID,
			CreatedAt: comment.CreatedAt.Format("2006-01-02 15:04:05"),
		}
	}
	ctx.JSON(200, resp)
}

func NewCommentController(commentService services.CommentService) *CommentController {
	return &CommentController{
		commentService: commentService,
	}
}
