package main

import (
	"blog_backend/app"
	"blog_backend/app/config"
	"fmt"
)

func main() {
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		fmt.Printf("Error loading config: %v\n", err)
		return
	}

	// Initialize the application
	appInstance, err := app.NewApp()
	if err != nil {
		fmt.Printf("Error initializing app: %v\n", err)
		return
	}

	// Run the application
	if err := appInstance.Run(cfg.Server.Address); err != nil {
		fmt.Printf("Error running app: %v\n", err)
	}
}
