package migrations

import (
	"blog_backend/app/models"

	"gorm.io/gorm"
)

func InitTables(db *gorm.DB) (err error) {

	// Migrate the schema
	err = db.AutoMigrate(
		&models.User{},
		&models.Post{},
		&models.Comment{},
	)
	if err != nil {
		return err
	}

	return nil
}
