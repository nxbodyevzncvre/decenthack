package grpcserver

import (
	"context"
	"log"
	"net"
	"sync"

	"github.com/nxbodyevzncvre/decenthack/backend/dronepb"
	"google.golang.org/grpc"
)

type DroneCoordinatesStore struct {
	sync.RWMutex
	data map[int32][]*dronepb.Coordinate
}

func NewDroneCoordinatesStore() *DroneCoordinatesStore {
	return &DroneCoordinatesStore{
		data: make(map[int32][]*dronepb.Coordinate),
	}
}

type Server struct {
	dronepb.UnimplementedDroneServiceServer
	Store *DroneCoordinatesStore
}

func (s *Server) SendCoordinates(ctx context.Context, req *dronepb.CoordinatesBatchRequest) (*dronepb.CoordinatesResponse, error) {
	log.Printf("Received coordinates from drone %d", req.DroneId)

	s.Store.Lock()
	s.Store.data[req.DroneId] = req.Coordinates
	s.Store.Unlock()

	return &dronepb.CoordinatesResponse{
		Status: "OK",
	}, nil
}

func StartGRPCServer(store *DroneCoordinatesStore) {
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	grpcServer := grpc.NewServer()
	dronepb.RegisterDroneServiceServer(grpcServer, &Server{Store: store})

	log.Println("gRPC server listening on :50051")
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
