/**
 * Represents a cluster in the Cluster/Vehicle/Commodity (CVC) model.
 *
 * The functions in this class provide various notifications about activity within the cluster
 *
 * This object should never be directly instantiated. Instead, use the
 * factory functions in the pathfinder object
 *
 * @param {number} id
 * @param {array} vehicles
 * @param {array} commodities
 * @param {object} socket
 * @class
 */
function Cluster(id, vehicles, commodities, socket) {


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
    this.clusterWasRouted = function(callback) {};
}
/**
 * Represents a commodity in the Cluster/Vehicle/Commodity (CVC) model.
 *
 * The functions in this class provide notifications about this commodity
 *
 * This class should never directly be instantiated. Instead, it will be created automatically
 * and passed into the callback of functions such as commodityWasRequested()
 *
 * @param {number} id
 * @param {object} start
 * @param {object} destination
 * @param {object} route
 * @class
 */
function Commodity(id, start, destination, route) {
    /**
     * @callback Commodity~wasPickedUpAt
     * @param {object} location The location where the commodity was picked up
     * @param {object} commodity The commodity that was picked up
     * @param {object} byVehicle The vehicle that is now transporting the commodity
     */

    /**
     * A commodity was picked up at its starting location
     * @param {Commodity~wasPickedUpAt} callback called when commodity is picked up
     */
    this.wasPicketUpAt = function(callback) {};

    /**
     * @callback Commodity~wasDroppedOffAt
     * @param {object} location The location where the commodity was dropped off
     * @param {object} commodity The commodity that was dropped off
     */

    /**
     * A commodity was dropped off at its destination
     * @param {Commodity~wasDroppedOffAt} callback called when commodity is dropped off
     */
    this.wasDroppedOffAt = function(callback) {};

    /**
     * @callback Commodity~wasCancelled
     * @param {object} commodity The commodity that will no longer be transported
     */

    /**
     * A commodity transportation request was cancelled
     * @param {Commodity~wasCancelled} callback called when commodity is cancelled
     */
    this.wasCancelled = function(callback) {};

    /**
     * @callback Commodity~wasRouted
     * @param {object} commodity The commodity that will be transported
     * @param {object} byVehicle The vehicle that will transport the commodity
     * @param {object} onRoute The route which contains the other commodities that will be picked up by the vehicle
     */

    /**
     * A route was generated for a vehicle that includes this commodity
     * @param {Commodity~wasRouted} callback called when commodity is routed
     */
    this.wasRouted = function(callback) {};

    /**
     * Remove this commodity from consideration when routing.
     */
    this.cancel = function() {};
}
/**
 * Represents a pathfinder application. This object can be used
 * to query cluster data or request commodity transit
 * @param {string} applicationIdentifier  Unique application identifier available on the web dashboard
 * @param {string} userCredentials  Unique key from google id toolkit TODO figure out exactly what this is
 * @constructor
 */
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
     * @param {function} success Called when cluster is successfully queried. Callback parameter is cluster object
     * @param {function} error  Called if default cluster query fails. Callback parameter is string error message
     */
    this.defaultCluster = function(success, error) {
        // Send request to get default cluster
    };

    /**
     * Retrieves specific cluster from the application
     * @param {number} id Id of the cluster to retreive
     * @param {function} success Called when cluster is successfully queried. Callback parameter is cluster object
     * @param {function} error  Called if default cluster query fails. Callback parameter is string error message
     */
    this.clusterById = function(id, success, error) {
        clusterByIdRequestBody.read.id = id;

        baseSocket.send(JSON.stringify(clusterByIdRequestBody));
    };

    /**
     * Requests transportation for a physical entity from one geographical location to another. This will immediately route a vehicle to pick up the commodity if one is available that can hold the commodities parameters within the vehicles capacity.
     * @param {object} cluster The cluster to request commodity transit within
     * @param {object} start The starting location of the commodity as {"longitude":x, "latitude":y}
     * @param {object} destination The destination for the commodity as {"longitude":x, "latitude":y}
     * @param {object} parameters The quantities of your application's routing calculations. The set of parameters needs to be defined and prioritized via the Pathfinder web interface in advance
     * @param {function} callback This function will be called exactly once with the created commodity object.
     */
    this.requestCommodityTransit = function(cluster, start, destination, parameters, callback) {

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
