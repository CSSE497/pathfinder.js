function PFCluster(id, parentId, commodities, vehicles, pathfinder) {
    this.id = id;
    this.parentId = parentId;
    this.commodities = commodities;
    this.vehicles = vehicles;
    this.pathfinder = pathfinder;
}

/*

PFCluster.prototype.subscribe = function(model, onsubscribeCallback, updateCallback) {
    this.pathfinder.clusterSubscribeHelper(model, this, onsubscribeCallback, updateCallback);
};

PFCluster.prototype.unsubscribe = function(model) {
    this.pathfinder.clusterUnsubscribeHelper(model, this.id);
};

 PFCluster.prototype.routeSubscribe = function(onSubscribeCallback, updateCallback) {
 this.pathfinder.routeSubscribeHelper("Cluster", this, onSubscribeCallback, updateCallback);
 };

 PFCommodity.prototype.routeUnsubscribe = function() {
 this.pathfinder.routeUnsubscribeHelper("Cluster", this.id);
 };


*/

/**
 * Represents a cluster in the Cluster/Vehicle/Commodity (CVC) model.
 *
 * The functions in this class provide various notifications about activity within the cluster
 *
 * This object should never be directly instantiated. Instead, use the
 * factory functions in the pathfinder object
 *
 * @param {Number} clusterId
 * @param {Number} parentCluster
 * @param {Array} commodities
 * @param {Array} vehicles
 * @param {Object} pathfinder
 * @class
 */
function PFCluster(clusterId, parentCluster, commodities, vehicles, pathfinder) {
    var routeSubscriptionMsg = {
        "routeSubscribe": {
            "model": "Cluster",
            "id": id
        }
    };

    setTimeout(function(){
        socket.send(JSON.stringify(routeSubscriptionMsg));
    }, 1250);

    socket.onmessage = function(msg) {
        msg = JSON.parse(msg.data);

        if (msg.hasOwnProperty('error')) {
            console.log(msg);
            return;
        }

        if (msg.hasOwnProperty('routed')) {
            routeUpdateCallback(msg);
        }
    };

    var routeUpdateCallback = function() {};

    /**
     * @callback Cluster~vehicleDidComeOnlineCallback
     * @param {object} vehicle The newly-online vehicle
     */

    /**
     * A vehicle that was previously offline or did not exist is now online and ready to be routed in the cluster
     * @param {Cluster~vehicleDidComeOnlineCallback} callback Called when a vehicle comes online in the cluster
     */
    this.vehicleDidComeOnline = function(callback) {};

    /**
     * @callback Cluster~vehicleDidGoOfflineCallback
     * @param {object} vehicle The newly-offline vehicle
     */

    /**
     * A vehicle that was previously online is now offline. If the vehicle was assigned a route, all commodities on that route will be reassigned.
     * @param {Cluster~vehicleDidGoOfflineCallback} callback Called when a vehicle goes offline in the cluster
     */
    this.vehicleDidGoOffline = function (callback) {};

    /**
     * @callback Cluster~commodityWasRequested
     * @param {object} commodity the commodity that is waiting to be picked up
     */

    /**
     * A new commodity requested transportation within the cluster
     * @param {Cluster~commodityWasRequested} callback Called when a commodity is requested within the cluster
     */
    this.commodityWasRequested = function(callback) {};

    /**
     * @callback Cluster~commodityWasPickedUp
     * @param {object} commodity The commodity that is now in transit to its destination
     */

    /**
     * A commodity was picked up by a vehicle
     * @param {Cluster~commodityWasPickedUp} callback Called when a commodity is picked up by a vehicle
     */
    this.commodityWasPickedUp = function (callback) {};

    /**
     * @callback Cluster~commodityWasDroppedOff
     * @param {object} commodity The commodity that was just dropped off at its destination
     */

    /**
     * A commodity was dropped off at its destination
     * @param {Cluster~commodityWasDroppedOff} callback Called when a commodity is dropped off within the cluster
     */
    this.commodityWasDroppedOff = function (callback) {};

    /**
     * @callback Cluster~commodityWasCancelled
     * @param {object} commodity The commodity that cancelled its transportation request
     */

    /**
     * A commodity cancelled its request for transportation. It will not be transported to its destination.
     * @param {Cluster~commodityWasCancelled} callback called when commodity is cancelled in the cluster
     */
    this.commodityWasCancelled = function (callback) {};

    /**
     * @callback Cluster~clusterWasRouted
     * @param {array} routes All the routes for the cluster
     */

    /**
     * The routing for the cluster was updated. Since every vehicle in a cluster has the potential to transport any vehicle in the same cluster, routes are calculated on a cluster level. When this method is called, all previously provided routes should be considered obsolete.
     * @param {Cluster~clusterWasRouted} callback Called when cluster is routed
     */
    this.clusterWasRouted = function(callback) {
        routeUpdateCallback = callback;
    };

    this.getId = function() {
        return id;
    };

    this.getVehicles = function() {
        return vehicles;
    };

    this.getCommodities = function() {
        return commodities;
    };
}