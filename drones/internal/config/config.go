package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	DatabaseURL            string
	GRPCServerAddress      string
	Port                   string
	ProcessingDelay        time.Duration
	PositionUpdateInterval time.Duration
	FlightSpeedMS          float64

	BaseLatitude  float64
	BaseLongitude float64
	BaseAltitude  float64
}

func Load() *Config {
	processingDelay, _ := strconv.Atoi(getEnv("PROCESSING_DELAY_SECONDS", "10"))
	flightSpeedMS, _ := strconv.ParseFloat(getEnv("FLIGHT_SPEED_MS", "15.0"), 64)

	baseLat, _ := strconv.ParseFloat(getEnv("BASE_LATITUDE", "51.15545"), 64)
	baseLon, _ := strconv.ParseFloat(getEnv("BASE_LONGITUDE", "71.41216"), 64)
	baseAlt, _ := strconv.ParseFloat(getEnv("BASE_ALTITUDE", "0.0"), 64)

	defaultDatabaseURL := "root:root@tcp(localhost:3306)/mydb"

	return &Config{
		DatabaseURL:            getEnv("DATABASE_URL", defaultDatabaseURL),
		GRPCServerAddress:      getEnv("GRPC_SERVER_ADDRESS", "localhost:1234"),
		Port:                   getEnv("PORT", "5051"),
		ProcessingDelay:        time.Duration(processingDelay) * time.Second,
		PositionUpdateInterval: time.Second,
		FlightSpeedMS:          flightSpeedMS,
		BaseLatitude:           baseLat,
		BaseLongitude:          baseLon,
		BaseAltitude:           baseAlt,
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
