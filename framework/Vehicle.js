function PFVehicle(id, position) {
    this.latLng = function() {
        return new LatLng(position.latitude, position.longitude);
    };
}