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
