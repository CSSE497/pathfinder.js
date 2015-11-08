function PFCluster(id, parentId, commodities, vehicles, pathfinder) {
    this._this = this;
    this.id = id;
    this.parentId = parentId;
    this.commodities = commodities;
    this.vehicles = vehicles;
    this.pathfinder = pathfinder;
}

PFCluster.prototype.subscribe = function(onsubscribeCallback, updateCallback) {
    this.pathfinder.modelSubscribeHelper("Cluster", this, onsubscribeCallback, updateCallback);
};

PFCluster.prototype.unsubscribe = function() {
    this.pathfinder.modelUnsubscribeHelper("Cluster", this.id);
};

 PFCluster.prototype.routeSubscribe = function(onSubscribeCallback, updateCallback) {
 this.pathfinder.routeSubscribeHelper("Cluster", this, onSubscribeCallback, updateCallback);
 };

 PFCluster.prototype.routeUnsubscribe = function() {
 this.pathfinder.routeUnsubscribeHelper("Cluster", this.id);
 };