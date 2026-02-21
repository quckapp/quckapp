package config

import "os"

type Config struct {
	Port       string
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	JWTSecret  string
}

func Load() *Config {
	return &Config{
		Port:       getEnv("PORT", "8085"),
		DBHost:     getEnv("MYSQL_HOST", "localhost"),
		DBPort:     getEnv("MYSQL_PORT", "3306"),
		DBUser:     getEnv("MYSQL_USERNAME", "root"),
		DBPassword: getEnv("MYSQL_PASSWORD", "root_secret"),
		DBName:     getEnv("MYSQL_DATABASE", "quckapp_admin"),
		JWTSecret:  getEnv("JWT_SECRET", "local-dev-jwt-secret-key-for-testing-only-32-chars"),
	}
}

func (c *Config) DSN() string {
	return c.DBUser + ":" + c.DBPassword + "@tcp(" + c.DBHost + ":" + c.DBPort + ")/" + c.DBName + "?parseTime=true&charset=utf8mb4"
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
