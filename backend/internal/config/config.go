package config

import (
	"log"
	"os"

	"github.com/ilyakaznacheev/cleanenv"
)

type Config struct {
	Env          string `yaml:"env" env-default:"dev" env-requried:"true"`
	JWTSecretKey string `yaml:"jwtsecretkey"`
	Server       `yaml:"server"`
	Database     `yaml:"database"`
}

type Server struct {
	Port string `yaml:"port" env-default:":8080"`
}

type Database struct {
	DBname     string `yaml:"db_name"`
	DBpassword string `yaml:"db_password"`
	DBusername string `yaml:"db_username"`
}

func MustLoad() *Config {
	configPath := os.Getenv("CONFIG_PATH")

	if configPath == "" {
		log.Fatalf("No env file")
	}

	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		log.Fatalf("Config file is not exists: %s", err.Error())
	}

	var cfg Config

	if err := cleanenv.ReadConfig(configPath, &cfg); err != nil {
		log.Fatalf("Cannot read config: %s", err.Error())
	}

	return &cfg
}
