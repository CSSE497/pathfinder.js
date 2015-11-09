function PFTransport(id, longitude, latitude, status, capacity, pathfinder) {
    this.id = id;
    this.longitude = longitude;
    this.latitude = latitude;
    this.status = status;
    this.capacity = capacity;
    this.pathfinder = pathfinder;
}

PFTransport.prototype.subscribe = function(onsubscribeCallback, updateCallback) {
    this.pathfinder.modelSubscribeHelper("Transport", this, onsubscribeCallback, updateCallback);
};

PFTransport.prototype.unsubscribe = function() {
    this.pathfinder.modelUnsubscribeHelper("Transport", this.id);
};

PFTransport.prototype.routeSubscribe = function(onSubscribeCallback, updateCallback) {
    this.pathfinder.routeSubscribeHelper("Transport", this, onSubscribeCallback, updateCallback);
};

PFTransport.prototype.routeUnsubscribe = function() {
    this.pathfinder.routeUnsubscribeHelper("Transport", this.id);
};