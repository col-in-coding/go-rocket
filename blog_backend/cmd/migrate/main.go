package main

import (
	"blog_backend/app/config"
	"blog_backend/app/utils"
	"fmt"
	// "blog_backend/migrations"
)

func main() {
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		fmt.Printf("Error loading config: %v\n", err)
		return
	}

	// Create the tables
	db, err := utils.InitDatabase(cfg)
	if err != nil {
		fmt.Printf("Error initializing database: %v\n", err)
		return
	}
	// if err := migrations.InitTables(db); err != nil {
	// 	fmt.Printf("Error initializing tables: %v\n", err)
	// 	return
	// }
	// fmt.Println("Database migration completed successfully.")

}
