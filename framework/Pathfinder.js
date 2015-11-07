function Pathfinder(url, applicationIdentifier, userCredentials) {
    this.url = url;
    this.applicationIdentifier = applicationIdentifier;

    // TODO figure out what to do with this later
    this.userCredentials = userCredentials;
    this.webSocket = new WebSocket(this.url);

    this.pendingRequests = {
        "created" : {
            "Cluster" : [],
            "Commodity" : [],
            "Vehicle" : []
        },
        "deleted" : {
            "Cluster" : {},
            "Commodity" : {},
            "Vehicle" : {}
        },
        "read" : {
            "ApplicationCluster" : {},
            "Cluster" : {},
            "Commodity" : {},
            "Vehicle" : {}
        },
        "routed" : {
            "Cluster" : {},
            "Commodity" : {},
            "Vehicle" : {}
        },
        "subscribed" : {
            "Cluster" : {},
            "Commodity" : {},
            "Vehicle" : {}
        },
        "updated" : {
//            "Cluster" : {}, Not currently in documentation
            "Commodity" : {},
            "Vehicle" : {}
        }
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

    if(data.hasOwnProperty("error")) {
        console.error(data);
        return;
    }

    var model = data.model.model;
    var value = data.model.value;

    if(data.hasOwnProperty("routed")) {
        this.handleRouted(value, model);
    } else if(data.hasOwnProperty("updated")) {
        this.handleUpdated(value, model);
    } else if(data.hasOwnProperty("created")) {
        this.handleCreated(value, model);
    } else if(data.hasOwnProperty("model")) {
        this.handleRead(value, model);
    } else if(data.hasOwnProperty("deleted")) {
        this.handleDeleted(value, model);
    } else if(data.hasOwnProperty("Subscribed")) {
        this.handleSubscribed(value, model);
    } else if(data.hasOwnProperty("applicationCluster")) {
        this.handleReadDefaultClusterId(data);
    }

    // I think that's all of them, for now ...

};

Pathfinder.prototype.constructCluster = function(data) {

    var commodities = data.commodities.map(
        this.constructCommodity,
        this
    );

    var vehicles = data.vehicles.map(
        this.constructVehicle,
        this
    );

    return new PFCluster(
        data.id,
        data.parent,
        commodities,
        vehicles,
        this.webSocket
    );
};

Pathfinder.prototype.constructCommodity = function(data) {
    return new PFCommodity(
        data.id,
        data.longitude,
        data.latitude,
        data.status,
        data.capacity,
        this.webSocket
    );
};

Pathfinder.prototype.constructVehicle = function(data) {
    return new PFVehicle(
        data.id,
        data.longitude,
        data.latitude,
        data.status,
        data.capacity,
        this.webSocket
    );
};

Pathfinder.prototype.handleRead = function(data, model) {

    var id = data.id;
    var request = this.pendingRequests.read[model][id];

    if(request === undefined) {
        console.error("Get " + model + " request failed: " + data);
    } else {
        var callback = request.callback;
        delete this.pendingRequests.read[model][id];

        var returnData;
        switch(model) {
            case "Cluster" :
                returnData = this.constructCluster(data);
                break;
            case "Commodity" :
                returnData = this.constructCommodity(data);
                break;
            case "Vehicle" :
                returnData = this.constructVehicle(data);
                break;
        }
        callback(returnData);
    }
};

Pathfinder.prototype.handleReadDefaultClusterId = function(data) {

    var request = this.pendingRequests.read.ApplicationCluster[data.applicationCluster.id];

    if(request === undefined) {
        console.error("Get default cluster request failed: " + data);
    } else {
        var callback = request.callback;
        delete this.pendingRequests.read.ApplicationCluster[data.applicationCluster.id];
        callback(data.applicationCluster.clusterId);
    }
};

Pathfinder.prototype.requestHelper = function(type, model, id, obj, callback) {

    var requestInFlight = false;

    if(id !== null) {
        requestInFlight = this.pendingRequests[type][model][id] !== undefined;
        this.pendingRequests[type][model][id] = {
            "callback" : callback
        };
    } else {
        this.pendingRequests[type][model].push(
            {
                "callback" : callback
            }
        );
    }

    if(!requestInFlight) {
        this.webSocket.send(JSON.stringify(obj));
    }
};

Pathfinder.prototype.getDefaultClusterId = function(callback) {

    var obj = {
        "getApplicationCluster": {
            "id": this.applicationIdentifier
        }
    };

    this.requestHelper("read", "applicationCluster", this.applicationIdentifier, obj, callback);
};

Pathfinder.prototype.readRequestHelper = function(model, id, callback) {

    var obj = {
        "read" : {
            "model" : model,
            "id" : id
        }
    };

    this.requestHelper("read", model, id, obj, callback);
};

Pathfinder.prototype.getCluster = function(id, callback) {
    this.readRequestHelper("Cluster", id, callback);
};

Pathfinder.prototype.getCommodity = function(id, callback) {
    this.readRequestHelper("Commodity", id, callback);
};

Pathfinder.prototype.getVehicle = function(id, callback) {
    this.readRequestHelper("Vehicle", id, callback);
};

Pathfinder.prototype.createRequestHelper = function(model, value, callback) {
    var obj = {
        "create" : {
            "model" : model,
            "value" : value
        }
    };

    this.requestHelper("created", model, null, obj, callback);
};

Pathfinder.prototype.createCluster = function(callback) {
    this.createRequestHelper("Cluster", {}, callback);
};

Pathfinder.prototype.createCommodity = function(startLat, startong, endLat, endLong, param, status, clusterId, callback) {
    var val = {
        "startLatitude" : startLat,
        "startLongitude" : startong,
        "endLatitude" : endLat,
        "endLongitude" : endLong,
        "param" : param,
        "status" : status,
        "clusterId" : clusterId
    };

    this.createRequestHelper("Commodity", val, callback);
};

Pathfinder.prototype.createVehicle = function(latitude, longitude, capacity, status, clusterId, callback) {
    var val = {
        "latitude" : latitude,
        "longitude" : longitude,
        "capacity" : capacity,
        "status" : status,
        "clusterId" : clusterId
    };

    this.createRequestHelper("Vehicle", val, callback);
};

Pathfinder.prototype.updateRequestHelper = function(model, id, value, callback) {
    var obj = {
        "update" : {
            "model" : model,
            "id" : id,
            "value" : value
        }
    };

    this.requestHelper("updated", model, id, obj, callback);
};

Pathfinder.prototype.updateCommodity = function(startLat, startLong, endLat, endLong, status, param, id, callback) {
    var value = {};

    if(startLat !== null) {
        value.startLatitude = startLat;
    }

    if(startLong !== null) {
        value.startLongitude = startLong;
    }

    if(endLat !== null) {
        value.endLatitude = endLat;
    }

    if(endLong !== null) {
        value.endLongitude = endLong;
    }

    if(status !== null) {
        value.status = status;
    }

    if(param !== null) {
        value.param = param;
    }

    this.updateRequestHelper("Commodity", id, value, callback);
};

Pathfinder.prototype.updateVehicle = function(lat, long, status, capacity, id, callback) {
    var value = {};

    if(lat !== null) {
        value.latitude = lat;
    }

    if(long !== null) {
        value.longitude = long;
    }

    if(status !== null) {
        value.status = status;
    }

    if(capacity !== null) {
        value.capacity = capacity;
    }

    this.createRequestHelper("Vehicle", value, callback);
};

Pathfinder.prototype.deleteRequestHelper = function(model, id, callback) {
    var obj = {
        "delete" : {
            "model" : model,
            "id" : id
        }
    };

    this.requestHelper("deleted", model, id, obj, callback);
};

Pathfinder.prototype.deleteCluster = function(id, callback) {
    this.deleteRequestHelper("Cluster", id, callback);
};

Pathfinder.prototype.deleteCommodity = function(id, callback) {
    this.deleteRequestHelper("Commodity", id, callback);
};

Pathfinder.prototype.deleteVehicle = function(id, callback) {
    this.deleteRequestHelper("Vehicle", id, callback);
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
