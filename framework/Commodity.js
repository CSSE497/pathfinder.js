function PFCommodity(id, longitude, latitude, status, capacity, pathfinder) {
    this._this = this;
    this.id = id;
    this.longitude = longitude;
    this.latitude = latitude;
    this.status = status;
    this.capacity = capacity;
    this.pathfinder = pathfinder;
}

PFCommodity.prototype.subscribe = function(onSubscribeCallback, updateCallback) {
    this.pathfinder.modelSubscribeHelper("Commodity", this, onSubscribeCallback, updateCallback);
};

PFCommodity.prototype.unsubscribe = function() {
    this.pathfinder.modelUnsubscribeHelper("Commodity", this.id);
};

PFCommodity.prototype.routeSubscribe = function(onSubscribeCallback, updateCallback) {
    this.pathfinder.routeSubscribeHelper("Commodity", this, onSubscribeCallback, updateCallback);
};

PFCommodity.prototype.routeUnsubscribe = function() {
    this.pathfinder.routeUnsubscribeHelper("Commodity", this.id);
};