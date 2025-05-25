package grpc

import (
	"context"
	"fmt"
	"log"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/qwaq-dev/drones/internal/structures"
	pb "github.com/qwaq-dev/drones/proto"
)

type NotificationClient struct {
	client pb.FlightNotificationServiceClient
	conn   *grpc.ClientConn
}

func NewNotificationClient(serverAddress string) (*NotificationClient, error) {
	conn, err := grpc.NewClient(serverAddress, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to gRPC server: %w", err)
	}

	client := pb.NewFlightNotificationServiceClient(conn)

	return &NotificationClient{
		client: client,
		conn:   conn,
	}, nil
}

func (nc *NotificationClient) Close() error {
	return nc.conn.Close()
}

func (nc *NotificationClient) NotifyStatusUpdate(ctx context.Context, applicationId int, status structures.Status, message, rejectionReason string) error {
	req := &pb.StatusUpdateRequest{
		ApplicationId:   int32(applicationId),
		Status:          string(status),
		Message:         message,
		RejectionReason: rejectionReason,
		Timestamp:       timestamppb.Now(),
	}

	resp, err := nc.client.NotifyStatusUpdate(ctx, req)
	if err != nil {
		return fmt.Errorf("failed to notify status update: %w", err)
	}

	if !resp.Success {
		return fmt.Errorf("status update notification failed: %s", resp.ErrorMessage)
	}

	log.Printf("Status update notification sent for application %d: %s", applicationId, status)
	return nil
}

func (nc *NotificationClient) NotifyFlightStarted(ctx context.Context, flight *structures.ActiveFlight) error {
	route := make([]*pb.RoutePoint, len(flight.Route))
	for i, point := range flight.Route {
		route[i] = &pb.RoutePoint{
			Id:            int32(point.Id),
			Latitude:      point.Latitude,
			Longitude:     point.Longitude,
			Altitude:      point.Altitude,
			PointOrder:    int32(point.PointOrder),
			ApplicationId: int32(point.ApplicationId),
		}
	}

	currentPos := &pb.DronePosition{
		ApplicationId: int32(flight.CurrentPosition.ApplicationId),
		DroneId:       int32(flight.CurrentPosition.DroneId),
		Latitude:      flight.CurrentPosition.Latitude,
		Longitude:     flight.CurrentPosition.Longitude,
		Altitude:      flight.CurrentPosition.Altitude,
		Speed:         flight.CurrentPosition.Speed,
		Heading:       flight.CurrentPosition.Heading,
		RouteProgress: flight.CurrentPosition.RouteProgress,
		Timestamp:     timestamppb.New(flight.CurrentPosition.Timestamp),
	}

	req := &pb.FlightStartedRequest{
		ApplicationId:    int32(flight.ApplicationId),
		DroneId:          int32(flight.DroneId),
		PilotId:          int32(flight.PilotId),
		Route:            route,
		CurrentPosition:  currentPos,
		StartTime:        timestamppb.New(flight.StartTime),
		EstimatedEndTime: timestamppb.New(flight.EstimatedEndTime),
	}

	resp, err := nc.client.NotifyFlightStarted(ctx, req)
	if err != nil {
		return fmt.Errorf("failed to notify flight started: %w", err)
	}

	if !resp.Success {
		return fmt.Errorf("flight started notification failed: %s", resp.ErrorMessage)
	}

	log.Printf("Flight started notification sent for application %d", flight.ApplicationId)
	return nil
}

func (nc *NotificationClient) UpdateDronePosition(ctx context.Context, position structures.DronePosition) error {
	req := &pb.DronePositionRequest{
		ApplicationId: int32(position.ApplicationId),
		DroneId:       int32(position.DroneId),
		Latitude:      position.Latitude,
		Longitude:     position.Longitude,
		Altitude:      position.Altitude,
		Speed:         position.Speed,
		Heading:       position.Heading,
		RouteProgress: position.RouteProgress,
		Timestamp:     timestamppb.New(position.Timestamp),
	}

	resp, err := nc.client.UpdateDronePosition(ctx, req)
	if err != nil {
		return fmt.Errorf("failed to update drone position: %w", err)
	}

	if !resp.Success {
		return fmt.Errorf("drone position update failed: %s", resp.ErrorMessage)
	}

	return nil
}

func (nc *NotificationClient) NotifyFlightCompleted(ctx context.Context, flight *structures.ActiveFlight, completionStatus string) error {
	finalPos := &pb.DronePosition{
		ApplicationId: int32(flight.CurrentPosition.ApplicationId),
		DroneId:       int32(flight.CurrentPosition.DroneId),
		Latitude:      flight.CurrentPosition.Latitude,
		Longitude:     flight.CurrentPosition.Longitude,
		Altitude:      flight.CurrentPosition.Altitude,
		Speed:         flight.CurrentPosition.Speed,
		Heading:       flight.CurrentPosition.Heading,
		RouteProgress: flight.CurrentPosition.RouteProgress,
		Timestamp:     timestamppb.New(flight.CurrentPosition.Timestamp),
	}

	req := &pb.FlightCompletedRequest{
		ApplicationId:    int32(flight.ApplicationId),
		DroneId:          int32(flight.DroneId),
		FinalPosition:    finalPos,
		CompletionTime:   timestamppb.Now(),
		CompletionStatus: completionStatus,
	}

	resp, err := nc.client.NotifyFlightCompleted(ctx, req)
	if err != nil {
		return fmt.Errorf("failed to notify flight completed: %w", err)
	}

	if !resp.Success {
		return fmt.Errorf("flight completed notification failed: %s", resp.ErrorMessage)
	}

	log.Printf("Flight completed notification sent for application %d", flight.ApplicationId)
	return nil
}

func (nc *NotificationClient) NotifyRestrictedZoneProximity(ctx context.Context, applicationId, droneId int, zone structures.RestrictedZone, alertLevel string, distance float64, position structures.DronePosition) error {
	req := &pb.RestrictedZoneAlertRequest{
		ApplicationId: int32(applicationId),
		DroneId:       int32(droneId),
		ZoneName:      zone.Name,
		ZoneLatitude:  zone.Latitude,
		ZoneLongitude: zone.Longtitude,
		ZoneRadius:    int32(zone.Radius),
		AlertLevel:    alertLevel,
		Distance:      distance,
		DronePosition: &pb.DronePosition{
			ApplicationId: int32(position.ApplicationId),
			DroneId:       int32(position.DroneId),
			Latitude:      position.Latitude,
			Longitude:     position.Longitude,
			Altitude:      position.Altitude,
			Speed:         position.Speed,
			Heading:       position.Heading,
			RouteProgress: position.RouteProgress,
			Timestamp:     timestamppb.New(position.Timestamp),
		},
		Timestamp: timestamppb.Now(),
	}

	resp, err := nc.client.NotifyRestrictedZoneProximity(ctx, req)
	if err != nil {
		return fmt.Errorf("failed to notify restricted zone proximity: %w", err)
	}

	if !resp.Success {
		return fmt.Errorf("restricted zone proximity notification failed: %s", resp.ErrorMessage)
	}

	log.Printf("Restricted zone alert sent: drone %d, %s level, %.1fm from zone '%s'",
		droneId, alertLevel, distance, zone.Name)
	return nil
}
