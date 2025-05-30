// Code generated by protoc-gen-go. DO NOT EDIT.
// versions:
// 	protoc-gen-go v1.36.6
// 	protoc        v6.31.0
// source: proto/drone.proto

package pb

import (
	protoreflect "google.golang.org/protobuf/reflect/protoreflect"
	protoimpl "google.golang.org/protobuf/runtime/protoimpl"
	reflect "reflect"
	sync "sync"
	unsafe "unsafe"
)

const (
	// Verify that this generated code is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(20 - protoimpl.MinVersion)
	// Verify that runtime/protoimpl is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(protoimpl.MaxVersion - 20)
)

type Application struct {
	state               protoimpl.MessageState `protogen:"open.v1"`
	ApplicationId       int32                  `protobuf:"varint,1,opt,name=application_id,json=applicationId,proto3" json:"application_id,omitempty"`
	StartDate           string                 `protobuf:"bytes,2,opt,name=start_date,json=startDate,proto3" json:"start_date,omitempty"`
	EndDate             string                 `protobuf:"bytes,3,opt,name=end_date,json=endDate,proto3" json:"end_date,omitempty"`
	Status              string                 `protobuf:"bytes,4,opt,name=status,proto3" json:"status,omitempty"`
	RejectionReason     string                 `protobuf:"bytes,5,opt,name=rejection_reason,json=rejectionReason,proto3" json:"rejection_reason,omitempty"`
	RestrictedZoneCheck int32                  `protobuf:"varint,6,opt,name=restricted_zone_check,json=restrictedZoneCheck,proto3" json:"restricted_zone_check,omitempty"`
	CreatedAt           string                 `protobuf:"bytes,7,opt,name=created_at,json=createdAt,proto3" json:"created_at,omitempty"`
	LastUpdate          string                 `protobuf:"bytes,8,opt,name=last_update,json=lastUpdate,proto3" json:"last_update,omitempty"`
	PilotId             int32                  `protobuf:"varint,9,opt,name=pilot_id,json=pilotId,proto3" json:"pilot_id,omitempty"`
	DroneId             int32                  `protobuf:"varint,10,opt,name=drone_id,json=droneId,proto3" json:"drone_id,omitempty"`
	unknownFields       protoimpl.UnknownFields
	sizeCache           protoimpl.SizeCache
}

func (x *Application) Reset() {
	*x = Application{}
	mi := &file_proto_drone_proto_msgTypes[0]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *Application) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*Application) ProtoMessage() {}

func (x *Application) ProtoReflect() protoreflect.Message {
	mi := &file_proto_drone_proto_msgTypes[0]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use Application.ProtoReflect.Descriptor instead.
func (*Application) Descriptor() ([]byte, []int) {
	return file_proto_drone_proto_rawDescGZIP(), []int{0}
}

func (x *Application) GetApplicationId() int32 {
	if x != nil {
		return x.ApplicationId
	}
	return 0
}

func (x *Application) GetStartDate() string {
	if x != nil {
		return x.StartDate
	}
	return ""
}

func (x *Application) GetEndDate() string {
	if x != nil {
		return x.EndDate
	}
	return ""
}

func (x *Application) GetStatus() string {
	if x != nil {
		return x.Status
	}
	return ""
}

func (x *Application) GetRejectionReason() string {
	if x != nil {
		return x.RejectionReason
	}
	return ""
}

func (x *Application) GetRestrictedZoneCheck() int32 {
	if x != nil {
		return x.RestrictedZoneCheck
	}
	return 0
}

func (x *Application) GetCreatedAt() string {
	if x != nil {
		return x.CreatedAt
	}
	return ""
}

func (x *Application) GetLastUpdate() string {
	if x != nil {
		return x.LastUpdate
	}
	return ""
}

func (x *Application) GetPilotId() int32 {
	if x != nil {
		return x.PilotId
	}
	return 0
}

func (x *Application) GetDroneId() int32 {
	if x != nil {
		return x.DroneId
	}
	return 0
}

type GetApplicationRequest struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	ApplicationId int32                  `protobuf:"varint,1,opt,name=application_id,json=applicationId,proto3" json:"application_id,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *GetApplicationRequest) Reset() {
	*x = GetApplicationRequest{}
	mi := &file_proto_drone_proto_msgTypes[1]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *GetApplicationRequest) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*GetApplicationRequest) ProtoMessage() {}

func (x *GetApplicationRequest) ProtoReflect() protoreflect.Message {
	mi := &file_proto_drone_proto_msgTypes[1]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use GetApplicationRequest.ProtoReflect.Descriptor instead.
func (*GetApplicationRequest) Descriptor() ([]byte, []int) {
	return file_proto_drone_proto_rawDescGZIP(), []int{1}
}

func (x *GetApplicationRequest) GetApplicationId() int32 {
	if x != nil {
		return x.ApplicationId
	}
	return 0
}

type ApplicationResponse struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Application   *Application           `protobuf:"bytes,1,opt,name=application,proto3" json:"application,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *ApplicationResponse) Reset() {
	*x = ApplicationResponse{}
	mi := &file_proto_drone_proto_msgTypes[2]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *ApplicationResponse) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*ApplicationResponse) ProtoMessage() {}

func (x *ApplicationResponse) ProtoReflect() protoreflect.Message {
	mi := &file_proto_drone_proto_msgTypes[2]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use ApplicationResponse.ProtoReflect.Descriptor instead.
func (*ApplicationResponse) Descriptor() ([]byte, []int) {
	return file_proto_drone_proto_rawDescGZIP(), []int{2}
}

func (x *ApplicationResponse) GetApplication() *Application {
	if x != nil {
		return x.Application
	}
	return nil
}

type FlightSimulationRequest struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	ApplicationId int32                  `protobuf:"varint,1,opt,name=application_id,json=applicationId,proto3" json:"application_id,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *FlightSimulationRequest) Reset() {
	*x = FlightSimulationRequest{}
	mi := &file_proto_drone_proto_msgTypes[3]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *FlightSimulationRequest) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*FlightSimulationRequest) ProtoMessage() {}

func (x *FlightSimulationRequest) ProtoReflect() protoreflect.Message {
	mi := &file_proto_drone_proto_msgTypes[3]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use FlightSimulationRequest.ProtoReflect.Descriptor instead.
func (*FlightSimulationRequest) Descriptor() ([]byte, []int) {
	return file_proto_drone_proto_rawDescGZIP(), []int{3}
}

func (x *FlightSimulationRequest) GetApplicationId() int32 {
	if x != nil {
		return x.ApplicationId
	}
	return 0
}

type Coordinates struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Latitude      float64                `protobuf:"fixed64,1,opt,name=latitude,proto3" json:"latitude,omitempty"`
	Longitude     float64                `protobuf:"fixed64,2,opt,name=longitude,proto3" json:"longitude,omitempty"`
	Altitude      float64                `protobuf:"fixed64,3,opt,name=altitude,proto3" json:"altitude,omitempty"`
	Timestamp     string                 `protobuf:"bytes,4,opt,name=timestamp,proto3" json:"timestamp,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *Coordinates) Reset() {
	*x = Coordinates{}
	mi := &file_proto_drone_proto_msgTypes[4]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *Coordinates) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*Coordinates) ProtoMessage() {}

func (x *Coordinates) ProtoReflect() protoreflect.Message {
	mi := &file_proto_drone_proto_msgTypes[4]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use Coordinates.ProtoReflect.Descriptor instead.
func (*Coordinates) Descriptor() ([]byte, []int) {
	return file_proto_drone_proto_rawDescGZIP(), []int{4}
}

func (x *Coordinates) GetLatitude() float64 {
	if x != nil {
		return x.Latitude
	}
	return 0
}

func (x *Coordinates) GetLongitude() float64 {
	if x != nil {
		return x.Longitude
	}
	return 0
}

func (x *Coordinates) GetAltitude() float64 {
	if x != nil {
		return x.Altitude
	}
	return 0
}

func (x *Coordinates) GetTimestamp() string {
	if x != nil {
		return x.Timestamp
	}
	return ""
}

var File_proto_drone_proto protoreflect.FileDescriptor

const file_proto_drone_proto_rawDesc = "" +
	"\n" +
	"\x11proto/drone.proto\x12\x05drone\"\xdb\x02\n" +
	"\vApplication\x12%\n" +
	"\x0eapplication_id\x18\x01 \x01(\x05R\rapplicationId\x12\x1d\n" +
	"\n" +
	"start_date\x18\x02 \x01(\tR\tstartDate\x12\x19\n" +
	"\bend_date\x18\x03 \x01(\tR\aendDate\x12\x16\n" +
	"\x06status\x18\x04 \x01(\tR\x06status\x12)\n" +
	"\x10rejection_reason\x18\x05 \x01(\tR\x0frejectionReason\x122\n" +
	"\x15restricted_zone_check\x18\x06 \x01(\x05R\x13restrictedZoneCheck\x12\x1d\n" +
	"\n" +
	"created_at\x18\a \x01(\tR\tcreatedAt\x12\x1f\n" +
	"\vlast_update\x18\b \x01(\tR\n" +
	"lastUpdate\x12\x19\n" +
	"\bpilot_id\x18\t \x01(\x05R\apilotId\x12\x19\n" +
	"\bdrone_id\x18\n" +
	" \x01(\x05R\adroneId\">\n" +
	"\x15GetApplicationRequest\x12%\n" +
	"\x0eapplication_id\x18\x01 \x01(\x05R\rapplicationId\"K\n" +
	"\x13ApplicationResponse\x124\n" +
	"\vapplication\x18\x01 \x01(\v2\x12.drone.ApplicationR\vapplication\"@\n" +
	"\x17FlightSimulationRequest\x12%\n" +
	"\x0eapplication_id\x18\x01 \x01(\x05R\rapplicationId\"\x81\x01\n" +
	"\vCoordinates\x12\x1a\n" +
	"\blatitude\x18\x01 \x01(\x01R\blatitude\x12\x1c\n" +
	"\tlongitude\x18\x02 \x01(\x01R\tlongitude\x12\x1a\n" +
	"\baltitude\x18\x03 \x01(\x01R\baltitude\x12\x1c\n" +
	"\ttimestamp\x18\x04 \x01(\tR\ttimestamp2\xa2\x01\n" +
	"\fDroneService\x12J\n" +
	"\x0eGetApplication\x12\x1c.drone.GetApplicationRequest\x1a\x1a.drone.ApplicationResponse\x12F\n" +
	"\x0eSimulateFlight\x12\x1e.drone.FlightSimulationRequest\x1a\x12.drone.Coordinates0\x01B\x10Z\x0ebackend/pkg/pbb\x06proto3"

var (
	file_proto_drone_proto_rawDescOnce sync.Once
	file_proto_drone_proto_rawDescData []byte
)

func file_proto_drone_proto_rawDescGZIP() []byte {
	file_proto_drone_proto_rawDescOnce.Do(func() {
		file_proto_drone_proto_rawDescData = protoimpl.X.CompressGZIP(unsafe.Slice(unsafe.StringData(file_proto_drone_proto_rawDesc), len(file_proto_drone_proto_rawDesc)))
	})
	return file_proto_drone_proto_rawDescData
}

var file_proto_drone_proto_msgTypes = make([]protoimpl.MessageInfo, 5)
var file_proto_drone_proto_goTypes = []any{
	(*Application)(nil),             // 0: drone.Application
	(*GetApplicationRequest)(nil),   // 1: drone.GetApplicationRequest
	(*ApplicationResponse)(nil),     // 2: drone.ApplicationResponse
	(*FlightSimulationRequest)(nil), // 3: drone.FlightSimulationRequest
	(*Coordinates)(nil),             // 4: drone.Coordinates
}
var file_proto_drone_proto_depIdxs = []int32{
	0, // 0: drone.ApplicationResponse.application:type_name -> drone.Application
	1, // 1: drone.DroneService.GetApplication:input_type -> drone.GetApplicationRequest
	3, // 2: drone.DroneService.SimulateFlight:input_type -> drone.FlightSimulationRequest
	2, // 3: drone.DroneService.GetApplication:output_type -> drone.ApplicationResponse
	4, // 4: drone.DroneService.SimulateFlight:output_type -> drone.Coordinates
	3, // [3:5] is the sub-list for method output_type
	1, // [1:3] is the sub-list for method input_type
	1, // [1:1] is the sub-list for extension type_name
	1, // [1:1] is the sub-list for extension extendee
	0, // [0:1] is the sub-list for field type_name
}

func init() { file_proto_drone_proto_init() }
func file_proto_drone_proto_init() {
	if File_proto_drone_proto != nil {
		return
	}
	type x struct{}
	out := protoimpl.TypeBuilder{
		File: protoimpl.DescBuilder{
			GoPackagePath: reflect.TypeOf(x{}).PkgPath(),
			RawDescriptor: unsafe.Slice(unsafe.StringData(file_proto_drone_proto_rawDesc), len(file_proto_drone_proto_rawDesc)),
			NumEnums:      0,
			NumMessages:   5,
			NumExtensions: 0,
			NumServices:   1,
		},
		GoTypes:           file_proto_drone_proto_goTypes,
		DependencyIndexes: file_proto_drone_proto_depIdxs,
		MessageInfos:      file_proto_drone_proto_msgTypes,
	}.Build()
	File_proto_drone_proto = out.File
	file_proto_drone_proto_goTypes = nil
	file_proto_drone_proto_depIdxs = nil
}
