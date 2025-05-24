package server

import (
	"context"
	"log"
	"net"

	pb "github.com/nxbodyevzncvre/decenthack/proto"
	"google.golang.org/grpc"
)

// Интерфейс для WebSocket Hub
type WebSocketHub interface {
	Broadcast(message []byte)
	BroadcastJSON(data interface{}) error
}

type FlightNotificationServer struct {
	pb.UnimplementedFlightNotificationServiceServer
	websocketHub WebSocketHub
}

func NewFlightNotificationServer(wsHub WebSocketHub) *FlightNotificationServer {
	return &FlightNotificationServer{
		websocketHub: wsHub,
	}
}

func (s *FlightNotificationServer) NotifyStatusUpdate(ctx context.Context, req *pb.StatusUpdateRequest) (*pb.StatusUpdateResponse, error) {
	log.Printf("🔔 Received status update for application %d: %s", req.ApplicationId, req.Status)

	// Создаем уведомление для фронтенда
	notification := map[string]interface{}{
		"type":             "status_update",
		"application_id":   req.ApplicationId,
		"status":           req.Status,
		"message":          req.Message,
		"rejection_reason": req.RejectionReason,
		"timestamp":        req.Timestamp.AsTime(),
	}

	// Отправляем через WebSocket
	err := s.websocketHub.BroadcastJSON(notification)
	if err != nil {
		log.Printf("❌ Error broadcasting status update: %v", err)
		return &pb.StatusUpdateResponse{
			Success:      false,
			ErrorMessage: "Failed to broadcast notification",
		}, nil
	}

	log.Printf("✅ Status update broadcasted successfully")
	return &pb.StatusUpdateResponse{Success: true}, nil
}

func (s *FlightNotificationServer) NotifyFlightStarted(ctx context.Context, req *pb.FlightStartedRequest) (*pb.FlightStartedResponse, error) {
	log.Printf("🚁 Received flight started notification for application %d", req.ApplicationId)

	// Конвертируем данные для фронтенда
	notification := map[string]interface{}{
		"type":               "flight_started",
		"application_id":     req.ApplicationId,
		"drone_id":           req.DroneId,
		"pilot_id":           req.PilotId,
		"route":              convertRouteFromProto(req.Route),
		"current_position":   convertPositionFromProto(req.CurrentPosition),
		"start_time":         req.StartTime.AsTime(),
		"estimated_end_time": req.EstimatedEndTime.AsTime(),
	}

	err := s.websocketHub.BroadcastJSON(notification)
	if err != nil {
		log.Printf("❌ Error broadcasting flight started: %v", err)
		return &pb.FlightStartedResponse{
			Success:      false,
			ErrorMessage: "Failed to broadcast notification",
		}, nil
	}

	log.Printf("✅ Flight started notification broadcasted successfully")
	return &pb.FlightStartedResponse{Success: true}, nil
}

func (s *FlightNotificationServer) UpdateDronePosition(ctx context.Context, req *pb.DronePositionRequest) (*pb.DronePositionResponse, error) {
	// Отправляем обновление позиции на фронтенд
	notification := map[string]interface{}{
		"type":           "position_update",
		"application_id": req.ApplicationId,
		"drone_id":       req.DroneId,
		"latitude":       req.Latitude,
		"longitude":      req.Longitude,
		"altitude":       req.Altitude,
		"speed":          req.Speed,
		"heading":        req.Heading,
		"route_progress": req.RouteProgress,
		"timestamp":      req.Timestamp.AsTime(),
	}

	err := s.websocketHub.BroadcastJSON(notification)
	if err != nil {
		log.Printf("❌ Error broadcasting position update: %v", err)
		return &pb.DronePositionResponse{
			Success:      false,
			ErrorMessage: "Failed to broadcast notification",
		}, nil
	}

	return &pb.DronePositionResponse{Success: true}, nil
}

func (s *FlightNotificationServer) NotifyFlightCompleted(ctx context.Context, req *pb.FlightCompletedRequest) (*pb.FlightCompletedResponse, error) {
	log.Printf("🏁 Received flight completed notification for application %d", req.ApplicationId)

	notification := map[string]interface{}{
		"type":              "flight_completed",
		"application_id":    req.ApplicationId,
		"drone_id":          req.DroneId,
		"final_position":    convertPositionFromProto(req.FinalPosition),
		"completion_time":   req.CompletionTime.AsTime(),
		"completion_status": req.CompletionStatus,
	}

	err := s.websocketHub.BroadcastJSON(notification)
	if err != nil {
		log.Printf("❌ Error broadcasting flight completed: %v", err)
		return &pb.FlightCompletedResponse{
			Success:      false,
			ErrorMessage: "Failed to broadcast notification",
		}, nil
	}

	log.Printf("✅ Flight completed notification broadcasted successfully")
	return &pb.FlightCompletedResponse{Success: true}, nil
}

// 🚨 НОВЫЙ МЕТОД: Обработка уведомлений о близости к запретным зонам
func (s *FlightNotificationServer) NotifyRestrictedZoneProximity(ctx context.Context, req *pb.RestrictedZoneAlertRequest) (*pb.RestrictedZoneAlertResponse, error) {
	log.Printf("🚨 Received restricted zone alert for drone %d: %s level, %.1fm from zone '%s'",
		req.DroneId, req.AlertLevel, req.Distance, req.ZoneName)

	// Создаем уведомление для фронтенда
	notification := map[string]interface{}{
		"type":           "restricted_zone_alert",
		"application_id": req.ApplicationId,
		"drone_id":       req.DroneId,
		"zone_name":      req.ZoneName,
		"zone_latitude":  req.ZoneLatitude,
		"zone_longitude": req.ZoneLongitude,
		"zone_radius":    req.ZoneRadius,
		"alert_level":    req.AlertLevel,
		"distance":       req.Distance,
		"drone_position": convertPositionFromProto(req.DronePosition),
		"timestamp":      req.Timestamp.AsTime(),
	}

	// Отправляем через WebSocket
	err := s.websocketHub.BroadcastJSON(notification)
	if err != nil {
		log.Printf("❌ Error broadcasting restricted zone alert: %v", err)
		return &pb.RestrictedZoneAlertResponse{
			Success:      false,
			ErrorMessage: "Failed to broadcast notification",
		}, nil
	}

	log.Printf("✅ Restricted zone alert broadcasted successfully")
	return &pb.RestrictedZoneAlertResponse{Success: true}, nil
}

// Вспомогательные функции для конвертации
func convertRouteFromProto(protoRoute []*pb.RoutePoint) []map[string]interface{} {
	route := make([]map[string]interface{}, len(protoRoute))
	for i, point := range protoRoute {
		route[i] = map[string]interface{}{
			"id":             point.Id,
			"latitude":       point.Latitude,
			"longitude":      point.Longitude,
			"altitude":       point.Altitude,
			"point_order":    point.PointOrder,
			"application_id": point.ApplicationId,
		}
	}
	return route
}

func convertPositionFromProto(protoPos *pb.DronePosition) map[string]interface{} {
	return map[string]interface{}{
		"application_id": protoPos.ApplicationId,
		"drone_id":       protoPos.DroneId,
		"latitude":       protoPos.Latitude,
		"longitude":      protoPos.Longitude,
		"altitude":       protoPos.Altitude,
		"speed":          protoPos.Speed,
		"heading":        protoPos.Heading,
		"route_progress": protoPos.RouteProgress,
		"timestamp":      protoPos.Timestamp.AsTime(),
	}
}

// Функция для запуска gRPC сервера
func StartGRPCServer(wsHub WebSocketHub, port string) error {
	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		return err
	}

	grpcServer := grpc.NewServer()
	flightServer := NewFlightNotificationServer(wsHub)

	pb.RegisterFlightNotificationServiceServer(grpcServer, flightServer)

	log.Printf("🚀 gRPC server starting on port %s", port)
	return grpcServer.Serve(lis)
}
