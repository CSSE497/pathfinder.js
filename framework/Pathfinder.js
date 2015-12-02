/**
 * Represents a pathfinder application. This object can be used
 * to query cluster data or request commodity transit.
 *
 * @param {string} url - WebSocket url to the Pathfinder service
 * @param {string} applicationIdentifier - The application identifier for your Pathfinder application
 * @param {string} userCredentials - Unique key from google id toolkit TODO figure out exactly what this is
 * @constructor
 */
function Pathfinder(url, applicationIdentifier, userCredentials) {
    this.url = url;
    this.applicationIdentifier = applicationIdentifier;

    // TODO figure out what to do with this later
    this.userCredentials = userCredentials;
    this.webSocket = new WebSocket(this.url);
    this.webSocket.onmessage = this.onmessage.bind(this);

    // stores requests made before the socket is opened
    this.messageBacklog = [];

    var pathfinder = this;

    // sends messages in messageBacklog once socket opens
    this.websocket.onopen = function(){
        if(pathfinder.messageBacklog === undefined){
            // either onopen was called twice or something messed with messageBacklog
            throw new Error(
                "Pathfinder.messageBacklog is undefined, was Pathfinder.webSocket.onopen called twice?"
            );
        }
        for(var i = 0; i < pathfinder.messageBacklog.length; ++i){
            pathfinder.webSocket.send(pathfinder.messageBacklog[i]);
        }
        delete pathfinder.messageBacklog;
    };

    this.pendingRequests = {
        "created" : {
            "Cluster" : [],
            "Commodity" : [],
            "Transport" : []
        },
        "deleted" : {
            "Cluster" : {},
            "Commodity" : {},
            "Transport" : {}
        },
        "read" : {
            "ApplicationCluster" : {},
            "Cluster" : {},
            "Commodity" : {},
            "Transport" : {}
        },
        "routed" : {
            "Cluster" : {},
            "Commodity" : {},
            "Transport" : {}
        },
        "routeSubscribed" : {
            "Cluster" : {},
            "Commodity" : {},
            "Transport" : {}
        },
        "subscribed" : {
            "Cluster" : {},
            "Commodity" : {},
            "Transport" : {}
        },
        "updated" : {
//            "Cluster" : {}, Not currently in documentation
            "Commodity" : {},
            "Transport" : {}
        }
    };

    this.subscriptions = {
        "Cluster" : {},
        "Commodity" : {},
        "Transport" : {},
        "Route" : {
            "Cluster" : {},
            "Commodity" : {},
            "Transport" : {}
        }
    };
}


/**
 * Closes the Pathfinder service's WebSocket
 */
Pathfinder.prototype.close = function() {
  this.webSocket.close();
};

Pathfinder.prototype.onmessage = function(msg) {

    var data = JSON.parse(msg.data);

    if(data.hasOwnProperty("error")) {
        console.error("Server error occured: " + JSON.stringify(data));
        return;
    }

    if(data.hasOwnProperty("routed")) {
        this.handleRouted(data.routed);
    } else if(data.hasOwnProperty("updated")) {
        this.handleUpdated(data.updated);
    } else if(data.hasOwnProperty("created")) {
        this.handleCreated(data.created);
    } else if(data.hasOwnProperty("model")) {
        this.handleRead(data.model);
    } else if(data.hasOwnProperty("deleted")) {
        this.handleDeleted(data.deleted);
    } else if(data.hasOwnProperty("routeSubscribed")) {
        this.handleRouteSubscribed(data.routeSubscribed)
    } else if(data.hasOwnProperty("subscribed")) {
        this.handleSubscribed(data.subscribed);
    } else if(data.hasOwnProperty("applicationCluster")) {
        this.handleReadDefaultClusterId(data.applicationCluster);
    } else {
        console.error("Unknown message: " + JSON.stringify(data));
    }

    // I think that's all of them, for now ...

};

Pathfinder.prototype.constructCluster = function(data) {

    var commodities = data.commodities.map(
        this.constructCommodity,
        this
    );

    var transports = data.transports.map(
        this.constructTransport,
        this
    );

    return new PFCluster(
        data.id,
        data.parent,
        commodities,
        transports,
        this
    );
};

Pathfinder.prototype.constructCommodity = function(data) {
    return new PFCommodity(
        data.id,
        data.startLatitude,
        data.startLongitude,
        data.endLatitude,
        data.endLongitude,
        data.status,
        data.capacity,
        this
    );
};

Pathfinder.prototype.constructTransport = function(data) {
    return new PFTransport(
        data.id,
        data.longitude,
        data.latitude,
        data.status,
        data.capacity,
        this
    );
};

Pathfinder.prototype.constructModel = function(value, model) {
    switch(model) {
        case "Cluster" :
            return this.constructCluster(value);
        case "Commodity" :
            return this.constructCommodity(value);
        case "Transport" :
            return this.constructTransport(value);
    }
};

Pathfinder.prototype.handleCreated = function(data) {
    var request = this.pendingRequests.created[data.model].pop();

    if(request === undefined) {
        console.error("Create " + data.model + " request failed: " + data);
    } else {
        var callback = request.callback;
        callback(this.constructModel(data.value, data.model));

    }
};

Pathfinder.prototype.handleHelper = function(value, type, model) {
    var id = value.id;
    var request = this.pendingRequests[type][model][id];
    var subscription = this.subscriptions[model][value.id];

    var obj = this.constructModel(value, model);
    if(request !== undefined) {
        var callback = request.callback;
        delete this.pendingRequests[type][model][id];

        callback(obj);
    }

    if(subscription !== undefined) {
        var subCallback = subscription.callback;

        subCallback(subscription.obj, obj);
    }
};

Pathfinder.prototype.handleDeleted = function(data) {
    this.handleHelper(data.value, "deleted", data.model);
};

Pathfinder.prototype.handleRead = function(data) {
    this.handleHelper(data.value, "read", data.model);
};

Pathfinder.prototype.handleRouted = function(data) {
    var id = data.value.id;
    var request = this.pendingRequests.routed[data.model][id];
    var subscription = this.subscriptions.Route[data.model][id];

    if(request !== undefined) {
        var callback = request.callback;
        delete this.pendingRequests.routed[data.model][id];

        callback(data.route);
    }

    if(subscription !== undefined) {
        var subCallback = subscription.callback;

        subCallback(subscription.obj, data.route);
    }
};

Pathfinder.prototype.handleUpdated = function(data) {
    this.handleHelper(data.value, "updated", data.model);
};

Pathfinder.prototype.handleSubscribedHelper = function(type, data) {
    var id = data.id;
    var request = this.pendingRequests[type][data.model][id];

    if(request === undefined) {
        console.error(type + " " + data.model + " request failed: " + data);
    } else {
        var callback = request.callback;
        delete this.pendingRequests[type][data.model][id];

        callback(data.id);
    }
};

Pathfinder.prototype.handleRouteSubscribed = function(data) {
    this.handleSubscribedHelper("routeSubscribed", data);
};

Pathfinder.prototype.handleSubscribed = function(data) {
    this.handleSubscribedHelper("subscribed", data);
};

Pathfinder.prototype.handleReadDefaultClusterId = function(data) {

    var request = this.pendingRequests.read.ApplicationCluster[data.id];

    if(request === undefined) {
        console.error("Get default cluster request failed: " + data);
    } else {
        var callback = request.callback;
        delete this.pendingRequests.read.ApplicationCluster[data.id];
        callback(data.clusterId);
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

    var message = JSON.stringify(obj);
    console.log(message);
    if(!requestInFlight) {
        switch(this.websocket.readyState){
            case 0: // connecting, save message and send it once the socket opens
                this.messageBacklog.push(message);
                break;
            case 1: // opened, send message
                this.webSocket.send(message);
                break;
            case 2: // closing
                throw new Error("Failed to send message: \""+message+"\" because socket is closing");
            case 3: // closed
                throw new Error("Failed to send message: \""+message+"\" because socket is closed");
        }
    }
};

/**
 * Gets the default cluster id for the specific application.
 * @param {Pathfinder~getDefaultClusterIdCallback} callback - A callback that handles the response
 */
Pathfinder.prototype.getDefaultClusterId = function(callback) {

    var obj = {
        "getApplicationCluster": {
            "id": this.applicationIdentifier
        }
    };

    this.requestHelper("read", "ApplicationCluster", this.applicationIdentifier, obj, callback);
};

/**
 * This callback is called after the getDefaultClusterId function receives a response.
 * @callback Pathfinder~getDefaultClusterIdCallback
 * @param {number} clusterId - The default cluster id
 */


Pathfinder.prototype.readRequestHelper = function(model, id, callback) {

    var obj = {
        "read" : {
            "model" : model,
            "id" : id
        }
    };

    this.requestHelper("read", model, id, obj, callback);
};

/**
 * Gets a cluster with the specified id.
 * @param id - The id of the cluster to retrieve
 * @param {Pathfinder~getClusterCallback} callback - The callback that handles the response
 */
Pathfinder.prototype.getCluster = function(id, callback) {
    this.readRequestHelper("Cluster", id, callback);
};

/**
 * This callback is called after the getCluster function receives a response.
 * @callback Pathfinder~getClusterCallback
 * @param {PFCluster} cluster - The cluster received
 */

/**
 * Gets a commodity with the specified id.
 * @param id - The id of the commodity to retrieve
 * @param {Pathfinder~getCommodityCallback} callback - The callback that handles the response
 */
Pathfinder.prototype.getCommodity = function(id, callback) {
    this.readRequestHelper("Commodity", id, callback);
};

/**
 * This callback is called after the getCommodity function receives a response.
 * @callback Pathfinder~getCommodityCallback
 * @param {PFCommodity} commodity - The commodity received
 */

/**
 * Gets a transport with the specified id.
 * @param id - The id of the transport to retrieve
 * @param {Pathfinder~getTransportCallback} callback - The callback that handles the response
 */
Pathfinder.prototype.getTransport = function(id, callback) {
    this.readRequestHelper("Transport", id, callback);
};

/**
 * This callback is called after the getTransport function receives a response.
 * @callback Pathfinder~getTransportCallback
 * @param {PFTransport} transport - The transport received
 */

Pathfinder.prototype.createRequestHelper = function(model, value, callback) {
    var obj = {
        "create" : {
            "model" : model,
            "value" : value
        }
    };

    this.requestHelper("created", model, null, obj, callback);
};

/**
 * Creates a cluster.
 * @param {Pathfinder~createClusterCallback} callback - The callback that handles the response
 */
Pathfinder.prototype.createCluster = function(callback) {
    // TODO figure out if this needs an id or something.
    this.createRequestHelper("Cluster", {}, callback);
};

/**
 * This callback is called after the createCluster function receives a response.
 * @callback Pathfinder~createClusterCallback
 * @param {PFCluster} cluster - The newly created cluster
 */

/**
 * Creates a commodity
 * @param {number} startLat - The starting latitude of the commodity
 * @param {number} startLong - The starting longitude of the commodity
 * @param {number} endLat - The ending latitude of the commodity
 * @param {number} endLong - The ending longitude of the commodity
 * @param {number} param - The capacity taken up by the commodity
 * @param {string} status - The status of the commodity
 * @param {number} clusterId - The cluster the commodity will be created under
 * @param {Pathfinder~createCommodityCallback} callback - The callback that handles the response
 */
Pathfinder.prototype.createCommodity = function(startLat, startLong, endLat, endLong, param, status, clusterId, callback) {
    var val = {
        "startLatitude" : startLat,
        "startLongitude" : startLong,
        "endLatitude" : endLat,
        "endLongitude" : endLong,
        "param" : param,
        "status" : status,
        "clusterId" : clusterId
    };

    this.createRequestHelper("Commodity", val, callback);
};

/**
 * This callback is called after the createCommodity function receives a response.
 * @callback Pathfinder~createCommodityCallback
 * @param {PFCommodity} commodity - The newly created commodity
 */

/**
 * Creates a transport.
 * @param {number} latitude - The current latitude of the transport
 * @param {number} longitude - The current longitude of the transport
 * @param {number} capacity - The capacity of the transport
 * @param {string} status - The status of the transport
 * @param {number} clusterId - The cluster the transport will be created under
 * @param {Pathfinder~createTransportCallback} callback - The callback that handles the response
 */
Pathfinder.prototype.createTransport = function(latitude, longitude, capacity, status, clusterId, callback) {
    var val = {
        "latitude" : latitude,
        "longitude" : longitude,
        "capacity" : capacity,
        "status" : status,
        "clusterId" : clusterId
    };

    this.createRequestHelper("Transport", val, callback);
};

/**
 * This callback is called after the createTransport function receives a response.
 * @callback Pathfinder~createTransportCallback
 * @param {PFTransport} transport - The newly created transport
 */

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

/**
 * Updates a commodity. Use null for any parameter that should not change.
 * @param {number} startLat - The starting latitude of the commodity
 * @param {number} startLong - The starting longitude of the commodity
 * @param {number} endLat - The ending latitude of the commodity
 * @param {number} endLong - The ending longitude of the commodity
 * @param {number} param - The capacity taken up by the commodity
 * @param {string} status - The status of the commodity
 * @param {number} id - The id of the commodity to be updated
 * @param {Pathfinder~updateCommodityCallback} callback - The callback that handles the response
 */
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

/**
 * This callback is called after the updateCommodity function receives a response.
 * @callback Pathfinder~updateCommodityCallback
 * @param {PFCommodity} commodity - The updated commodity
 */

/**
 * Updates a transport. Use null for any parameter that should not be updated.
 * @param {number} lat - The current latitude of the transport
 * @param {number} long - The current longitude of the transport
 * @param {number} capacity - The capacity of the transport
 * @param {string} status - The status of the transport
 * @param {number} id - The id of the transport to be updated
 * @param {Pathfinder~updateTransportCallback} callback - The callback that handles the response
 */
Pathfinder.prototype.updateTransport = function(lat, long, status, capacity, id, callback) {
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

    this.createRequestHelper("Transport", value, callback);
};

/**
 * This callback is called after the updateTransport function receives a response.
 * @callback Pathfinder~updateTransportCallback
 * @param {PFTransport} transport - The updated transport
 */


Pathfinder.prototype.deleteRequestHelper = function(model, id, callback) {
    var obj = {
        "delete" : {
            "model" : model,
            "id" : id
        }
    };

    this.requestHelper("deleted", model, id, obj, callback);
};

/**
 * Deletes a cluster with the specified id.
 * @param {number} id - Id of the cluster to be deleted
 * @param {Pathfinder~deleteClusterCallback} callback - The callback that handles the response
 */
Pathfinder.prototype.deleteCluster = function(id, callback) {
    this.deleteRequestHelper("Cluster", id, callback);
};

/**
 * This callback is called after the deleteCluster function receives a response.
 * @callback Pathfinder~deleteClusterCallback
 * @param {PFCluster} cluster - The deleted cluster
 */

/**
 * Deletes a commodity with the specified id.
 * @param {number} id - Id of the commodity to be deleted
 * @param {Pathfinder~deleteCommodityCallback} callback - The callback that handles the response
 */
Pathfinder.prototype.deleteCommodity = function(id, callback) {
    this.deleteRequestHelper("Commodity", id, callback);
};

/**
 * This callback is called after the deleteCommodity function receives a response.
 * @callback Pathfinder~deleteCommodityCallback
 * @param {PFCommodity} cluster - The deleted commodity
 */

/**
 * Deletes a transport with the specified id.
 * @param {number} id - Id of the transport to be deleted
 * @param {Pathfinder~deleteTransportCallback} callback - The callback that handles the response
 */
Pathfinder.prototype.deleteTransport = function(id, callback) {
    this.deleteRequestHelper("Transport", id, callback);
};

/**
 * This callback is called after the deleteTransport function receives a response.
 * @callback Pathfinder~deleteTransportCallback
 * @param {PFTransport} transport - The deleted transport
 */

Pathfinder.prototype.routeRequestHelper = function(model, id, callback) {
    var obj = {
        "route" : {
            "model" : model,
            "id" : id
        }
    };
    this.requestHelper("routed", model, id, obj, callback);
};

/**
 * Gets the routes for a cluster with the specified id.
 * @param {number} id - Id of the cluster to get the routes for
 * @param {Pathfinder~routeClusterCallback} callback - The callback that handles the response
 */
Pathfinder.prototype.routeCluster = function(id, callback) {
    this.routeRequestHelper("Cluster", id, callback);
};

/**
 * This callback is called after the routeCluster function receives a response.
 * @callback Pathfinder~routeClusterCallback
 * @param {object} routes - The routes received
 */

/**
 * Gets the route for a commodity with the specified id.
 * @param {number} id - Id of the commodity to get the route for
 * @param {Pathfinder~routeCommodityCallback} callback - The callback that handles the response
 */
Pathfinder.prototype.routeCommodity = function(id, callback) {
    this.routeRequestHelper("Commodity", id, callback);
};

/**
 * This callback is called after the routeCommodity function receives a response.
 * @callback Pathfinder~routeCommodityCallback
 * @param {object} route - The route received
 */

/**
 * Gets the route for a transport with the specified id.
 * @param {number} id - Id of the transport to get the route for
 * @param {Pathfinder~routeTransportCallback} callback - The callback that handles the response
 */
Pathfinder.prototype.routeTransport = function(id, callback) {
    this.routeRequestHelper("Transport", id, callback);
};

/**
 * This callback is called after the routeTransport function receives a response.
 * @callback Pathfinder~routeTransportCallback
 * @param {object} route - The route received
 */

Pathfinder.prototype.modelSubscribeRequestHelper = function(model, id, callback) {
    var obj = {
        "subscribe" : {
            "model" : model,
            "id" : id
        }
    };
    this.requestHelper("subscribed", model, id, obj, callback);
};

Pathfinder.prototype.modelSubscribeHelper = function(model, obj, onSubscribeCallback, updateCallback) {
    if(this.subscriptions[model][obj.id] === undefined) {
        this.subscriptions[model][obj.id] = {
            "obj" : obj,
            "callback" : updateCallback
        };
        this.modelSubscribeRequestHelper(model, obj.id, onSubscribeCallback);
    } else {
        this.subscriptions[model][obj.id].callback = updateCallback;
    }
};

Pathfinder.prototype.modelUnsubscribeHelper = function(model, id) {
    delete this.pathfinder.subscriptions[model][id];
    // need to tell the server to stop sending updates when this gets implemented
};

Pathfinder.prototype.routeSubscribeRequestHelper = function(model, id, callback) {
    var obj = {
        "routeSubscribe" : {
            "model" : model,
            "id" : id
        }
    };
    this.requestHelper("routeSubscribed", model, id, obj, callback);
};

Pathfinder.prototype.routeSubscribeHelper = function(model, obj, onSubscribeCallback, updateCallback) {
    if(this.subscriptions.Route[model][obj.id] === undefined) {
        this.subscriptions.Route[model][obj.id] = {
            "obj" : obj,
            "callback" : updateCallback
        };
        this.routeSubscribeRequestHelper(model, obj.id, onSubscribeCallback);
    } else {
        this.pathfinder.subscriptions.Route[model][obj.id].callback = updateCallback;
    }
};

Pathfinder.prototype.routeUnsubscribeHelper = function(model, id) {
    delete this.pathfinder.subscriptions.Route[model][id];
    // need to tell the server to stop sending updates when this gets implemented
};
