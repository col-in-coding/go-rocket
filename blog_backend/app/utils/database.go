package utils

import (
	"blog_backend/app/config"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func InitDatabase(config *config.Config) (*gorm.DB, error) {
	dsn := "host=localhost user=postgres password=postgres dbname=mydb port=5432 sslmode=disable TimeZone=Asia/Shanghai"
	return gorm.Open(postgres.Open(dsn), &gorm.Config{})
}
