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
