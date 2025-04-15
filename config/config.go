package config

import (
	"log"

	"github.com/joeshaw/envdecode"
	"github.com/joho/godotenv"
)

type Config struct {
	Server ServerConfig
	DB     DBConfig
}

type ServerConfig struct {
	Port string `env:"SERVER_PORT,required"`
}

type DBConfig struct {
	Host     string `env:"DB_HOST,required"`
	Port     string `env:"DB_PORT,required"`
	Name     string `env:"DB_NAME,required"`
	User     string `env:"DB_USER,required"`
	Password string `env:"DB_PASSWORD,required"`
}

func Load() (*Config, error) {
	_ = godotenv.Load()
	var cfg Config
	if err := envdecode.StrictDecode(&cfg); err != nil {
		log.Fatalf("failed to decode .env file: %v", err)
	}
	return &cfg, nil
}
