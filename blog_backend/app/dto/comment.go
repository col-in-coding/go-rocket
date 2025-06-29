package dto

type CommentCreateRequest struct {
	PostID  int    `json:"post_id" binding:"required"`
	UserID  int    `json:"user_id" binding:"required"`
	Content string `json:"content" binding:"required"`
}

type CommentCreateResponse struct {
	Message     string `json:"message"`
	CommentItem `json:"comment_item"`
}

type CommentRetrieveRequest struct {
	CommentID int `uri:"comment_id" binding:"required"`
}

type CommentRetrieveResponse struct {
	Message     string `json:"message"`
	CommentItem `json:"comment_item"`
}

type CommentUpdateURIRequest struct {
	CommentID int `uri:"comment_id" binding:"required"`
}

type CommentUpdateBodyRequest struct {
	Content string `json:"content" binding:"required"`
}

type CommentUpdateResponse struct {
	Message string `json:"message"`
	CommentItem
}

type CommentDeleteRequest struct {
	CommentID int `uri:"comment_id" binding:"required"`
}

type CommentDeleteResponse struct {
	Message string `json:"message"`
}

type ListCommentsRequest struct {
	PostID int `uri:"post_id" binding:"required"`
}

type ListCommentsResponse struct {
	Message  string        `json:"message"`
	Comments []CommentItem `json:"comments"`
}

type CommentItem struct {
	ID        int    `json:"id"`
	Content   string `json:"content"`
	UserID    int    `json:"user_id"`
	PostID    int    `json:"post_id"`
	CreatedAt string `json:"created_at"`
}
