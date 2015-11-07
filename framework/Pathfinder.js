function Pathfinder(url, applicationIdentifier, userCredentials) {
    this.url = url;
    this.applicationIdentifier = applicationIdentifier;

    // TODO figure out what to do with this later
    this.userCredentials = userCredentials;
    this.webSocket = new WebSocket(this.url);

    this.pendingRequests = {
        "getApplicationCluster" : {},
        "getCluster" : {},
        "getVehicle" : {},
        "getCommodity" : {},
    };

    this.subscriptions = {
        "clusters" : {},
        "vehicles" : {},
        "commodities" : {}
    };
}

Pathfinder.prototype.close = function() {
  this.webSocket.close();
};

Pathfinder.prototype.webSocket.onmessage = function(msg) {

    var data = JSON.parse(msg.data);

    if(data.hasOwnProperty('error')) {
        console.error(data);
        return;
    }

    if(data.hasOwnProperty('applicationCluster')) {
        this.handleGetDefaultClusterId(data);
    } else if(data.hasOwnProperty('model')) {
        var model = data.model.model;
        var value = data.model.value;
        switch(model) {
            case "Cluster" :
                this.handleGetCluster(value);
                break;
            case "Vehicle" :
                this.handleGetVehicle(value);
                break;
            case "Commodity" :
                this.handleGetCommodity(value);
                break;
        }
    }

    // TODO add more
}

Pathfinder.prototype.handleGetCluster = function(data) {

    var id = data.id;
    var request = this.pendingRequests.getCluster[id];

    if(request === undefined) {
        console.error("Get cluster request failed: " + data);
    } else {
        var callback = request.callback;
        delete this.pendingRequests.getCluster[id];

        var vehicles = data.vehicles.map(
            function(val) {
                return new PFVehicle(
                    val.id,
                    val.longitude,
                    val.latitude,
                    val.status,
                    val.capacity,
                    this.webSocket
                );
            },
            this
        );

        var commodities = data.commodities.map(
            function(val) {
                return new PFCommodity(
                    val.id,
                    val.longitude,
                    val.latitude,
                    val.status,
                    val.capacity,
                    this.webSocket
                );
            },
            this
        );

        var cluster = new PFCluster(
            data.id,
            data.parent,
            vehicles,
            commodities,
            this.webSocket
        );
        callback(cluster);
    }
};

Pathfinder.prototype.handleGetVehicle = function(data) {

    var id = data.id;
    var request = this.pendingRequests.getVehicle[id];

    if(request === undefined) {
        console.error("Get vehicle request failed: " + data);
    } else {
        var callback = request.callback;
        delete this.pendingRequests.getVehicle[id];

        var vehicle = new PFVehicle(
            data.id,
            data.longitude,
            data.latitude,
            data.status,
            data.capacity,
            this.webSocket
        );
        callback(vehicle);
    }
};

Pathfinder.prototype.handleGetCommodity = function(data) {

    var id = data.id;
    var request = this.pendingRequests.getCommodity[id];

    if(request === undefined) {
        console.error("Get commodity request failed: " + data);
    } else {
        var callback = request.callback;
        delete this.pendingRequests.getCommodity[id];

        var commodity = new PFCommodity(
            data.id,
            data.longitude,
            data.latitude,
            data.status,
            data.capacity,
            this.webSocket
        );
        callback(commodity);
    }
};

Pathfinder.prototype.handleGetDefaultClusterId = function(data) {

    var request = this.pendingRequests.getApplicationCluster[data.applicationCluster.id];

    if(request === undefined) {
        console.error("Get default cluster request failed: " + data);
    } else {
        var callback = request.callback;
        delete this.pendingRequests.getApplicationCluster[data.applicationCluster.id];
        callback(data.applicationCluster.clusterId);
    }
};

Pathfinder.prototype.getDefaultClusterId = function(callback) {
    this.pendingRequests.getApplicationCluster[this.applicationIdentifier] = {
        "callback" : callback
    };

    this.webSocket.send(
        JSON.stringify({
            "getApplicationCluster" : {
                "id" : this.applicationIdentifier
            }
        }
    ));
};

Pathfinder.prototype.getCluster = function(id, callback) {
    this.pendingRequests.getCluster[id] = {
        "callback": callback
    };

    this.webSocket.send(
        JSON.stringify({
            "read" : {
                "model" : "Cluster",
                "id" : id
            }
        })
    );
};

Pathfinder.prototype.getVehicle = function(id, callback) {
    this.pendingRequests.getVehicle[id] = {
        "callback": callback
    };

    this.webSocket.send(
        JSON.stringify({
            "read" : {
                "model" : "Vehicle",
                "id" : id
            }
        })
    );
};

Pathfinder.prototype.getCommodity = function(id, callback) {
    this.pendingRequests.getVehicle[id] = {
        "callback": callback
    };

    this.webSocket.send(
        JSON.stringify({
            "read" : {
                "model" : "Commodity",
                "id" : id
            }
        })
    );
};

/**
 * Represents a pathfinder application. This object can be used
 * to query cluster data or request commodity transit
 * @param {string} applicationIdentifier  Unique application identifier available on the web dashboard
 * @param {string} userCredentials  Unique key from google id toolkit TODO figure out exactly what this is
 * @constructor
 */
function Pathfinder(applicationIdentifier, userCredentials) {
    var webserviceUrl = 'ws://api.thepathfinder.xyz:9000/socket';

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
    this.defaultCluster = function() {
        var deferredId = Q.defer();
        var deferredCluster = Q.defer();

        baseSocket.send(JSON.stringify({
            "getApplicationCluster": {
                "id": applicationIdentifier
            }
        }));

        pendingRequests.push({
            'promise': deferredId,
            'type': 'cluster',
            'id': applicationIdentifier
        });

        deferredId.promise.then(function(res) {
            clusterByIdRequestBody.read.id = res;

            baseSocket.send(JSON.stringify(clusterByIdRequestBody));

            pendingRequests.push({
                'promise': deferredCluster,
                'type': 'cluster',
                'id': res
            });
        }, function(err) {
            console.error('Failed to query default cluster id for this app');
            console.log(err);
        });

        return deferredCluster.promise;
    };

    /**
     * Retrieves specific cluster from the application
     * @param {number} id Id of the cluster to retrieve
     * @param {function} success Called when cluster is successfully queried. Callback parameter is cluster object
     * @param {function} error  Called if default cluster query fails. Callback parameter is string error message
     */
    this.clusterById = function(id, success, error) {
        var deferred = Q.defer();

        clusterByIdRequestBody.read.id = id;

        baseSocket.send(JSON.stringify(clusterByIdRequestBody));

        pendingRequests.push({
            'promise': deferred,
            'type': 'cluster',
            'id': id
        });

        return deferred.promise;
    };

    /**
     * Requests transportation for a physical entity from one geographical location to another. This will immediately route a vehicle to pick up the commodity if one is available that can hold the commodities parameters within the vehicles capacity.
     * @param {number} cluster The id of the cluster to request commodity transit within
     * @param {object} start The starting location of the commodity as {"longitude":x, "latitude":y}
     * @param {object} destination The destination for the commodity as {"longitude":x, "latitude":y}
     * @param {object} parameters The quantities of your application's routing calculations. The set of parameters needs to be defined and prioritized via the Pathfinder web interface in advance
     * @param {function} callback This function will be called exactly once with the created commodity object.
     */
    this.requestCommodityTransit = function(cluster, start, destination, parameters) {
        var deferred = Q.defer();

        var msg = {
            "create": {
                "model": "Commodity",
                "value": {
                    "startLatitude": start.latitude,
                    "startLongitude": start.longitude,
                    "endLatitude": destination.latitude,
                    "endLongitude": destination.longitude,
                    "param": parameters,
                    "clusterId": cluster
                }
            }
        };

        baseSocket.send(JSON.stringify(msg));

        pendingRequests.push({
            'promise': deferred,
            'type': 'commodity',
            'value': msg.create.value
        });

        return deferred.promise;
    };

    // ---------- Socket Handlers ----------
    baseSocket.onmessage = function(msg) {
        // Find the appropriate pendingRequest and handle appropriately based on success or failure
        var i, j, request;

        msg = JSON.parse(msg.data);

        if (msg.hasOwnProperty('error')) {
            console.error(msg);
            return;
        }

        if (msg.hasOwnProperty('created')) {
            // This response is for a commodity transit request
            for (i = 0; i < pendingRequests.length; i++) {
                request = pendingRequests[i];

                if (msg.created.value.startLatitude === request.value.startLatitude &&
                    msg.created.value.startLongitude === request.value.startLongitude &&
                    msg.created.value.endLatitude === request.value.endLatitude &&
                    msg.created.value.endLongitude === request.value.endLongitude &&
                    msg.created.value.param === request.value.param) {
                    //request.promise.resolve(msg.created.value);

                    msg = msg.created.value;

                    request.promise.resolve(new Commodity(msg.id, {
                        "latitude": msg.startLatitude,
                        "longitude": msg.startLongitude
                    }, {
                        "latitude": msg.startLatitude,
                        "longitude": msg.startLongitude
                    }));
                }
            }
        } else if (msg.hasOwnProperty('applicationCluster')) {
            // Get default cluster id request
            for (i = 0; i < pendingRequests.length; i++) {
                request = pendingRequests[i];

                if (request.type === 'cluster' && request.id === msg.applicationCluster.id) {
                    request.promise.resolve(msg.applicationCluster.clusterId);

                    pendingRequests.splice(i, 1);
                }
            }
        } else {
            // Response contains cluster object for clusterById call
            for (i = 0; i < pendingRequests.length; i++) {
                request = pendingRequests[i];

                if (request.id === msg.model.value.id) {
                    //request.promise.resolve(msg.model.value);
                    var vehicles = [];
                    for (j = 0; j < msg.model.value.vehicles.length; j++) {
                        vehicles.push(new PFVehicle(msg.model.value.vehicles[j].id, {
                            "latitude": msg.model.value.vehicles[j].latitude,
                            "longitude": msg.model.value.vehicles[j].longitude
                        }));
                    }

                    var commodities = [];
                    for (j = 0; j < msg.model.value.commodities.length; j++) {
                        commodities.push(new Commodity(msg.model.value.commodities[j].id, {
                            "latitude": msg.model.value.commodities[j].startLatitude,
                            "longitude": msg.model.value.commodities[j].startLongitude
                        }, {
                            "latitude": msg.model.value.commodities[j].endLatitude,
                            "longitude": msg.model.value.commodities[j].endLongitude
                        }));
                    }

                    request.promise.resolve(new PFCluster(msg.model.value.id, vehicles, commodities, new WebSocket(webserviceUrl)));

                    pendingRequests.splice(i, 1);
                }
            }
        }
    };
}
