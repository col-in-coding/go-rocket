package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Database struct {
		DBhost     string `json:"db_host"`
		DBport     string `json:"db_port"`
		DBuser     string `json:"db_user"`
		DBpassword string `json:"db_password"`
		DBname     string `json:"db_name"`
	} `json:"database"`
	ServerPort string `json:"server_port"`
	JWTSecret  string
}

var AppConfig Config

func LoadConfig() (conf *Config, err error) {
	if err := godotenv.Load(".env"); err != nil {
		return nil, fmt.Errorf("error loading .env file: %w", err)
	}
	AppConfig.Database.DBhost = os.Getenv("DB_HOST")
	AppConfig.Database.DBport = os.Getenv("DB_PORT")
	AppConfig.Database.DBuser = os.Getenv("DB_USER")
	AppConfig.Database.DBpassword = os.Getenv("DB_PASSWORD")
	AppConfig.Database.DBname = os.Getenv("DB_NAME")
	AppConfig.ServerPort = os.Getenv("SERVER_PORT")
	AppConfig.JWTSecret = os.Getenv("JWT_SECRET")
	if AppConfig.Database.DBhost == "" || AppConfig.Database.DBport == "" ||
		AppConfig.Database.DBuser == "" || AppConfig.Database.DBpassword == "" ||
		AppConfig.Database.DBname == "" || AppConfig.ServerPort == "" || AppConfig.JWTSecret == "" {
		return nil, fmt.Errorf("missing required environment variables")
	}
	return &AppConfig, nil
}
