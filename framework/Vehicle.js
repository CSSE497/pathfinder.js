function PFVehicle(id, longitude, latitude, status, capacity, webSocket) {
    this.id = id;
    this.longitude = longitude;
    this.latitude = latitude;
    this.status = status;
    this.capacity = capacity;
    this.webSocket = webSocket;
}