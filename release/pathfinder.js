function Cluster(id, vehicles, commodities, socket) {
    // Delegate functions
    this.vehicleDidComeOnline =
    this.vehicleDidGoOffline =
    this.commodityWasRequested =
    this.commodityWasPickedUp =
    this.commodityWasDroppedOff =
    this.commodityWasCancelled =
    this.clusterWasRouted = function() {};


    // Accessor functions
    function getVehicles() {
        return vehicles;
    }

    function getCommodities() {
        return commodities;
    }
}
function Commodity(id, start, destination, route) {
    this.wasPicketUpAt =
    this.wasDroppedOffAt =
    this.wasCancelled =
    this.wasRouted =
    this.cancel = function() {};

    // Accessor functions
    function getStart() {
        return start;
    }

    function getDestination() {
        return destination;
    }
}
function Pathfinder(applicationIdentifier, userCredentials) {
    var webserviceUrl = 'http://localhost:9000/socket';

    var baseSocket = new WebSocket(webserviceUrl);
    var pendingRequests = [];

    var clusterByIdRequestBody = {
        "read": {
            "model": "Cluster",
            "id": -1
        }
    };

    /**
     * Retrieves the top-level cluster for the application
     * @param callback
     */
    this.defaultCluster = function(callback) {
        // Send request to get default cluster
    };

    this.clusterById = function(id, callback) {
        clusterByIdRequestBody.read.id = id;

        baseSocket.send(JSON.stringify(clusterByIdRequestBody));

        pendingRequests.push({
            body: clusterByIdRequestBody,
            callback: callback
        });
    };

    this.requestCommodityTransit = function(start, params, callback) {

    };

    // ---------- Socket Handlers ----------
    baseSocket.onmessage = function(msg) {
        // Find the appropriate pendingRequest and handle appropriately based on success or failure

        if (msg.hasOwnProperty('error')) {

        }

        /**
         * else create cluster/commodity object and call callback(newEntity);
         */
    };
}

function Vehicle(route, capacities, online) {
    // Delegate functions
    this.performedRouteAction =
    this.wasRouted =
    this.didComeOnline =
    this.didGoOffline = function() {};

    // Action functions
    this.nextRouteAction = function() {

    };

    this.completeNextRouteAction = function() {

    };

    this.goOffline = function() {

    };

}