package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port           string
	MongoDBURL     string
	DatabaseName   string
	KafkaBrokers   []string
	S3Endpoint     string
	S3Bucket       string
	S3AccessKey    string
	S3SecretKey    string
	S3Region       string
	MaxFileSize    int64
	AllowedTypes   []string
	CDNBaseURL     string
}

func Load() *Config {
	maxSize, _ := strconv.ParseInt(getEnv("MAX_FILE_SIZE", "104857600"), 10, 64) // 100MB default

	return &Config{
		Port:         getEnv("PORT", "4011"),
		MongoDBURL:   getEnv("MONGODB_URL", "mongodb://localhost:27017"),
		DatabaseName: getEnv("DATABASE_NAME", "quickchat_attachments"),
		KafkaBrokers: []string{getEnv("KAFKA_BROKERS", "localhost:9092")},
		S3Endpoint:   getEnv("S3_ENDPOINT", "http://localhost:9000"),
		S3Bucket:     getEnv("S3_BUCKET", "quickchat-attachments"),
		S3AccessKey:  getEnv("S3_ACCESS_KEY", "minioadmin"),
		S3SecretKey:  getEnv("S3_SECRET_KEY", "minioadmin"),
		S3Region:     getEnv("S3_REGION", "us-east-1"),
		MaxFileSize:  maxSize,
		AllowedTypes: []string{
			"image/jpeg", "image/png", "image/gif", "image/webp",
			"video/mp4", "video/webm",
			"audio/mpeg", "audio/wav", "audio/ogg",
			"application/pdf",
			"text/plain", "text/csv",
			"application/zip",
			"application/msword",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"application/vnd.ms-excel",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		},
		CDNBaseURL: getEnv("CDN_BASE_URL", "http://localhost:4012"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
