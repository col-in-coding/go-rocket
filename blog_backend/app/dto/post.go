package dto

type PostCreateRequest struct {
	Title   string `json:"title" binding:"required,min=3,max=100"`
	Content string `json:"content" binding:"required,min=10"`
}

type PostCreateResponse struct {
	Message string `json:"message"`
	PostID  int    `json:"post_id"`
	UserID  int    `json:"user_id"`
}

type PostGetRequest struct {
	PostID int `uri:"post_id" binding:"required"`
}

type PostGetResponse struct {
	PostID    int    `json:"post_id"`
	Title     string `json:"title"`
	Content   string `json:"content"`
	UserID    int    `json:"user_id"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type PostUpdateRequest struct {
	PostID  int    `json:"post_id" binding:"required"`
	Title   string `json:"title" binding:"required,min=3,max=100"`
	Content string `json:"content" binding:"required,min=10"`
}

type PostUpdateResponse struct {
	Message string `json:"message"`
	PostID  int    `json:"post_id"`
	UserID  int    `json:"user_id"`
}

type PostDeleteRequest struct {
	PostID int `uri:"post_id" binding:"required"`
}

type PostDeleteResponse struct {
	Message string `json:"message"`
}
