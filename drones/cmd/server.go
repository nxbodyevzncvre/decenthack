package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/qwaq-dev/drones/internal/config"
	"github.com/qwaq-dev/drones/internal/grpc"
	"github.com/qwaq-dev/drones/internal/processor"
	"github.com/qwaq-dev/drones/internal/repository"
)

func main() {
	cfg := config.Load()

	repo, err := repository.New(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to initialize repository: %v", err)
	}
	defer repo.Close()

	grpcClient, err := grpc.NewNotificationClient(cfg.GRPCServerAddress)
	if err != nil {
		log.Fatalf("Failed to initialize gRPC client: %v", err)
	}
	defer grpcClient.Close()

	flightProcessor := processor.New(repo, grpcClient, cfg)

	go flightProcessor.Start()

	log.Println("Flight processor service started")

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down flight processor service...")
	flightProcessor.Stop()
}
