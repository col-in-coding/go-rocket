package dto

type PostCreateRequest struct {
	Title   string `json:"title" binding:"required,min=3,max=100"`
	Content string `json:"content" binding:"required,min=10"`
}

type PostCreateResponse struct {
	Message  string   `json:"message"`
	PostItem PostItem `json:"post_item"`
}

type PostRetrieveRequest struct {
	PostID int `uri:"post_id" binding:"required"`
}

type PostRetrieveResponse struct {
	Message  string   `json:"message"`
	PostItem PostItem `json:"post_item"`
}

type PostUpdateRequest struct {
	PostID  int    `json:"post_id" binding:"required"`
	Title   string `json:"title" binding:"required,min=3,max=100"`
	Content string `json:"content" binding:"required,min=10"`
}

type PostUpdateResponse struct {
	Message  string   `json:"message"`
	PostItem PostItem `json:"post_item"`
}

type PostDeleteRequest struct {
	PostID int `uri:"post_id" binding:"required"`
}

type PostDeleteResponse struct {
	Message string `json:"message"`
}

type PostItem struct {
	PostID    int    `json:"post_id"`
	Title     string `json:"title"`
	Content   string `json:"content"`
	UserID    int    `json:"user_id"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}
