package main

import (
	"fmt"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type User struct {
	ID            int       `gorm:"primaryKey"`
	Name          string    `gorm:"size:100;not null"`
	Age           int       `gorm:"not null"`
	NumberOfPosts int       `gorm:"default:0"`
	Posts         []Post    `gorm:"foreignKey:UserID"`
	Comments      []Comment `gorm:"foreignKey:UserID"`
	CreatedAt     time.Time `gorm:"autoCreateTime;not null"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime;not null"`
}

type Post struct {
	ID          int       `gorm:"primaryKey"`
	Title       string    `gorm:"size:200;not null"`
	Content     string    `gorm:"type:text;not null"`
	UserID      int       `gorm:"not null"`
	User        User      `gorm:"foreignKey:UserID"`
	HasComments bool      `gorm:"default:false"`
	Comments    []Comment `gorm:"foreignKey:PostID"`
	CreatedAt   time.Time `gorm:"autoCreateTime;not null"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime;not null"`
}

func (p *Post) AfterCreate(tx *gorm.DB) (err error) {
	// Increment the user's number of posts after a post is created
	if err := tx.Model(&User{}).Where("id = ?", p.UserID).UpdateColumn("number_of_posts", gorm.Expr("number_of_posts + ?", 1)).Error; err != nil {
		return fmt.Errorf("failed to update user's number of posts: %w", err)
	}
	return
}

func (p *Post) AfterDelete(tx *gorm.DB) (err error) {
	// Decrement the user's number of posts after a post is deleted
	if err := tx.Model(&User{}).Where("id = ?", p.UserID).UpdateColumn("number_of_posts", gorm.Expr("number_of_posts - ?", 1)).Error; err != nil {
		return fmt.Errorf("failed to update user's number of posts: %w", err)
	}
	return
}

type Comment struct {
	ID        int       `gorm:"primaryKey"`
	Content   string    `gorm:"type:text;not null"`
	PostID    int       `gorm:"not null"`
	Post      Post      `gorm:"foreignKey:PostID"`
	UserID    int       `gorm:"not null"`
	User      User      `gorm:"foreignKey:UserID"`
	CreatedAt time.Time `gorm:"autoCreateTime;not null"`
	UpdatedAt time.Time `gorm:"autoUpdateTime;not null"`
}

// AfterCreate hook to update the Post's HasComments field
func (c *Comment) AfterCreate(tx *gorm.DB) (err error) {
	err = tx.Model(&Post{}).Where("id = ?", c.PostID).UpdateColumn("has_comments", true).Error
	if err != nil {
		return fmt.Errorf("failed to update post's HasComments field: %w", err)
	}
	return nil
}

func (c *Comment) AfterDelete(tx *gorm.DB) (err error) {
	err = tx.Model(&Post{}).
		Where("id = ?", c.PostID).
		UpdateColumn("has_comments", gorm.Expr("EXISTS (SELECT 1 FROM comments WHERE post_id = ?)", c.PostID)).
		Error
	if err != nil {
		return fmt.Errorf("failed to update post's HasComments field after comment deletion: %w", err)
	}
	return nil
}

func gormCurd() {
	dsn := "host=localhost user=postgres password=postgres dbname=mydb port=5432 sslmode=disable TimeZone=Asia/Shanghai"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		fmt.Println("Failed to connect to database:", err)
		return
	}

	// // Migrate the schema
	// err = db.AutoMigrate(&User{}, &Post{}, &Comment{})
	// if err != nil {
	// 	fmt.Println("Failed to migrate schema:", err)
	// 	return
	// }
	// fmt.Println("Database connected and schema migrated successfully")

	// err = seed(db)
	// if err != nil {
	// 	fmt.Println("Failed to seed database:", err)
	// 	return
	// }
	// fmt.Println("Database seeded successfully")

	// // Query the Posts by user id and their Comments
	// posts, err := getPosts(db, 1)
	// if err != nil {
	// 	fmt.Println("Failed to query posts:", err)
	// 	return
	// }
	// for _, post := range posts {
	// 	fmt.Printf("Post ID: %d, Title: %s, Content: %s\n", post.ID, post.Title, post.Content)
	// 	for _, comment := range post.Comments {
	// 		fmt.Printf("  Comment ID: %d, Content: %s\n", comment.ID, comment.Content)
	// 	}
	// }

	// // // Query the Post with the most Comments
	// postWithMostComments, err := getPostWithMostComments(db)
	// if err != nil {
	// 	fmt.Println("Failed to get post with most comments:", err)
	// 	return
	// }
	// fmt.Printf("Post with most comments: ID: %d, Title: %s, Content: %s\n", postWithMostComments.ID, postWithMostComments.Title, postWithMostComments.Content)
	// for _, comment := range postWithMostComments.Comments {
	// 	fmt.Printf("  Comment ID: %d, Content: %s\n", comment.ID, comment.Content)
	// }

	deleteComment(db, 1)
}

func seed(db *gorm.DB) error {
	// Create a user
	user := User{Name: "John Doe", Age: 30}
	if err := db.Create(&user).Error; err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	// Create a post for the user
	post := Post{Title: "First Post", Content: "This is the content of the first post.", UserID: user.ID}
	if err := db.Create(&post).Error; err != nil {
		return fmt.Errorf("failed to create post: %w", err)
	}

	// Create a comment on the post
	comment := Comment{Content: "Great post!", PostID: post.ID, UserID: user.ID}
	if err := db.Create(&comment).Error; err != nil {
		return fmt.Errorf("failed to create comment: %w", err)
	}

	return nil
}

func getPosts(db *gorm.DB, userID int) ([]Post, error) {
	var posts []Post
	err := db.Preload("Comments").Where("user_id = ?", userID).Find(&posts).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get posts: %w", err)
	}
	return posts, nil
}

func getPostWithMostComments(db *gorm.DB) (*Post, error) {
	var post Post
	err := db.
		Preload("Comments").
		Joins("LEFT JOIN comments ON comments.post_id = posts.id").
		Group("posts.id").
		Order("COUNT(comments.id) DESC").
		First(&post).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get post with most comments: %w", err)
	}
	return &post, nil
}

func deleteComment(db *gorm.DB, commentID int) error {
	var comment Comment
	if err := db.First(&comment, commentID).Error; err != nil {
		return fmt.Errorf("comment not found: %w", err)
	}
	if err := db.Delete(&comment).Error; err != nil {
		return fmt.Errorf("failed to delete comment: %w", err)
	}
	return nil
}
