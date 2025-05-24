import grpc
import time
from drone_pb2 import CoordinatesBatchRequest, Coordinate
from drone_pb2_grpc import DroneServiceStub

def generate_coordinates():
    # Простейшая симуляция координат
    return [
        Coordinate(latitude=51.16, longitude=71.43, altitude=120.0, point_order=1),
        Coordinate(latitude=51.17, longitude=71.44, altitude=122.5, point_order=2),
        Coordinate(latitude=51.18, longitude=71.45, altitude=125.0, point_order=3),
    ]

def run():
    with grpc.insecure_channel("localhost:50051") as channel:
        stub = DroneServiceStub(channel)
        drone_id = 1
        coordinates = generate_coordinates()
        
        request = CoordinatesBatchRequest(drone_id=drone_id, coordinates=coordinates)
        response = stub.SendCoordinates(request)
        print(f"Server response: {response.status}")

if __name__ == "__main__":
    run()
