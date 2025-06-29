# Blog Backend API

## Overview

This API provides functionality for user authentication, post management, and comment management. It follows RESTful principles and uses JWT for authentication.

---

## Features

- **User Management**: Register, login, and retrieve user profiles.
- **Post Management**: Create, update, delete, and retrieve posts.
- **Comment Management**: Add, update, delete, and retrieve comments for posts.
- **JWT Authentication**: Secure endpoints using JSON Web Tokens.

---

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/go-rocket.git
   cd go-rocket/blog_backend
   ```

2. Install dependencies:
   ```bash
   go mod tidy
   ```

3. Set up the `.env` file:
   ```plaintext
   JWT_SECRET=your_jwt_secret
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=your_db_name
   DB_PORT=5432
   ```

4. Run database migrations:
   ```bash
   go run main.go migrate
   ```

   This command will create the necessary tables in your database based on the models defined in the application.

5. Run the application:
   ```bash
   go run main.go
   ```

---

## API Documentation

### User Routes

#### 1. **Register User**
- **URL**: `/user/register`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "username": "string",
    "password": "string",
    "email": "string"
  }
  ```
- **Response**:
  ```json
  {
    "message": "User registered successfully",
    "user_id": 1,
    "username": "string",
    "email": "string"
  }
  ```

#### 2. **Login User**
- **URL**: `/user/login`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Login successful",
    "token": "string"
  }
  ```

#### 3. **Get User Profile**
- **URL**: `/user/profile`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "userId": 1,
    "email": "string"
  }
  ```

---

### Post Routes

#### 1. **Retrieve Post**
- **URL**: `/post/:post_id`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "message": "Post retrieved successfully",
    "post_item": {
      "post_id": 1,
      "title": "string",
      "content": "string",
      "user_id": 1,
      "created_at": "2025-06-28T12:00:00Z",
      "updated_at": "2025-06-28T12:30:00Z"
    }
  }
  ```

#### 2. **Create Post**
- **URL**: `/post`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "title": "string",
    "content": "string"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Post created successfully",
    "post_item": {
      "post_id": 1,
      "title": "string",
      "content": "string",
      "user_id": 1,
      "created_at": "2025-06-28T12:00:00Z",
      "updated_at": "2025-06-28T12:00:00Z"
    }
  }
  ```

#### 3. **Update Post**
- **URL**: `/post/:post_id`
- **Method**: `PUT`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "title": "string",
    "content": "string"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Post updated successfully",
    "post_item": {
      "post_id": 1,
      "title": "string",
      "content": "string",
      "user_id": 1,
      "created_at": "2025-06-28T12:00:00Z",
      "updated_at": "2025-06-28T12:30:00Z"
    }
  }
  ```

#### 4. **Delete Post**
- **URL**: `/post/:post_id`
- **Method**: `DELETE`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "message": "Post deleted successfully"
  }
  ```

---

### Comment Routes

#### 1. **Retrieve Comment**
- **URL**: `/comment/:comment_id`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "message": "Comment retrieved successfully",
    "comment_item": {
      "id": 1,
      "content": "string",
      "user_id": 1,
      "post_id": 1,
      "created_at": "2025-06-28T12:00:00Z"
    }
  }
  ```

#### 2. **List Comments for a Post**
- **URL**: `/comment/post/:post_id`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "message": "Comments retrieved successfully",
    "comments": [
      {
        "id": 1,
        "content": "string",
        "user_id": 1,
        "post_id": 1,
        "created_at": "2025-06-28T12:00:00Z"
      }
    ]
  }
  ```

#### 3. **Create Comment**
- **URL**: `/comment`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "post_id": 1,
    "user_id": 1,
    "content": "string"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Comment created successfully",
    "comment_item": {
      "id": 1,
      "content": "string",
      "user_id": 1,
      "post_id": 1,
      "created_at": "2025-06-28T12:00:00Z"
    }
  }
  ```

#### 4. **Update Comment**
- **URL**: `/comment/:comment_id`
- **Method**: `PUT`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "content": "string"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Comment updated successfully",
    "comment_item": {
      "id": 1,
      "content": "string",
      "user_id": 1,
      "post_id": 1,
      "created_at": "2025-06-28T12:00:00Z",
      "updated_at": "2025-06-28T12:30:00Z"
    }
  }
  ```

#### 5. **Delete Comment**
- **URL**: `/comment/:comment_id`
- **Method**: `DELETE`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "message": "Comment deleted successfully"
  }
  ```

---

## License

This project is licensed under the MIT License.