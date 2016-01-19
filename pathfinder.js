/**
 * Represents a pathfinder application. This object can be used
 * to query cluster data or request commodity transit.
 *
 * @param {string} appId - The application identifier for your Pathfinder application
 * @constructor
 */
function Pathfinder(appId) {
    this.url = "wss://api.thepathfinder.xyz/socket";
    this.appId = appId;

    this.websocket = new WebSocket(this.url);
    this.websocket.onmessage = this.onmessage.bind(this);

    // stores requests made before the socket is opened
    this.messageBacklog = [];

    var pathfinder = this;

    // sends messages in messageBacklog once socket opens
    this.websocket.onopen = function(){
        if(pathfinder.messageBacklog === undefined){
            // either onopen was called twice or something messed with messageBacklog
            throw new Error(
                "Pathfinder.messageBacklog is undefined, was Pathfinder.websocket.onopen called twice?"
            );
        }
        for(var i = 0; i < pathfinder.messageBacklog.length; ++i){
            pathfinder.websocket.send(pathfinder.messageBacklog[i]);
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
  this.websocket.close();
};

Pathfinder.prototype.onmessage = function(msg) {

    var data = JSON.parse(msg.data);

    if(data.hasOwnProperty("error")) {
        console.error("Server error occured: " + JSON.stringify(data));
        return;
    }

    var message = data.message;
    console.log(JSON.stringify(data));

    if (data.message == "Routed") {
        this.handleRouted(data.value);
    } else if (data.message == "Model") {
        this.handleRead(data.value, data.model);
    } else if (data.message == "Updated") {
        this.handleUpdated(data.value);
    } else if (data.message == "Created") {
        this.handleCreated(data.value);
    } else if (data.message == "Deleted") {
        this.handleDeleted(data.value);
    } else if (data.message == "RouteSubscribed") {
        this.handleRouteSubscribed(data.value);
    } else if (data.message == "Subscribed") {
        this.handleSubscribed(data.value);
    } else if (data.message = "ApplicationCluster") {
        this.handleReadDefaultClusterId(data.value);
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

    var transports = data.vehicles.map(
        this.constructTransport,
        this
    );

    var subclusters = data.subClusters.map(
        this.constructCluster,
        this
    );

    return new PFCluster(
        data.id,
        commodities,
        transports,
        subclusters,
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
        data.metadata,
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

Pathfinder.prototype.handleRead = function(data, model) {
    this.handleHelper(data, "read", model);
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
        callback(data.id);
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
                this.websocket.send(message);
                break;
            case 2: // closing
                throw new Error("Failed to send message: \""+message+"\" because socket is closing");
            case 3: // closed
                throw new Error("Failed to send message: \""+message+"\" because socket is closed");
        }
    }
};

Pathfinder.prototype.readRequestHelper = function(model, id, callback) {
    var obj = {
        message: "Read",
        model: model,
        id: id
    };

    this.requestHelper("read", model, id, obj, callback);
};

/**
 * Gets the default cluster for the specific application.
 * @param {Pathfinder~getClusterCallback} callback - A callback that handles the response
 */
Pathfinder.prototype.getDefaultCluster = function(callback) {
    this.readRequestHelper("Cluster", this.appId, callback);
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
        message: "Create",
        model: model,
        value: value
    };

    this.requestHelper("created", model, null, obj, callback);
};

/**
 * Creates a cluster.
 * @param {Pathfinder~createClusterCallback} callback - The callback that handles the response
 */
Pathfinder.prototype.createCluster = function(path, callback) {
    this.createRequestHelper("Cluster", { path: path }, callback);
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
 * @param {object} metadata - The metadata associated with the commodity. Used by routing algorithm
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
        "metadata" : metadata,
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
 * @param {object} metadata - The metadata about the vehicle. Used by routing algorithm.
 * @param {string} status - The status of the transport
 * @param {number} clusterId - The cluster the transport will be created under
 * @param {Pathfinder~createTransportCallback} callback - The callback that handles the response
 */
Pathfinder.prototype.createTransport = function(latitude, longitude, capacity, status, clusterId, callback) {
    var val = {
        "latitude" : latitude,
        "longitude" : longitude,
        "metadata" : metadata,
        "status" : status,
        "clusterId" : clusterId
    };

    this.createRequestHelper("Vehicle", val, callback);
};

/**
 * This callback is called after the createTransport function receives a response.
 * @callback Pathfinder~createTransportCallback
 * @param {PFTransport} transport - The newly created transport
 */

Pathfinder.prototype.updateRequestHelper = function(model, id, value, callback) {
    var obj = {
        message: "Update",
        model: model,
        id: id,
        value: value
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
        message: "Delete",
        model: model,
        id: id
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
        message: "Route",
        model: model,
        id: id
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
        message: "Subscribe",
        model: model,
        id: id
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
        message: "RouteSubscribe",
        model: model,
        id: id
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

/**
 * Pathfinder cluster constructor. Do not call this constructor it is for the Pathfinder object to use.
 * @param {number} id - The id of the cluster
 * @param {array} commodities - Array of the commodities in the cluster
 * @param {array} transports - Array of the transports in the cluster
 * @param {Pathfinder} pathfinder - Pathfinder object that creates this commodity
 * @constructor
 */
function PFCluster(id, commodities, transports, subclusters, pathfinder) {
    this.id = id;
    this.commodities = commodities;
    this.transports = transports;
    this.subclusters = subclusters;
    this.pathfinder = pathfinder;
}

/**
 * Subscribe for updates to the cluster.
 * @param {PFCluster~subscribeOnSubscribeCallback} onSubscribeCallback - The callback used when the subscribe request is successful
 * @param {PFCluster~subscribeUpdateCallback} updateCallback - The callback used when updates to the cluster are received
 */
PFCluster.prototype.subscribe = function(onSubscribeCallback, updateCallback) {
    this.pathfinder.modelSubscribeHelper("Cluster", this, onSubscribeCallback, updateCallback);
};

/**
 * This callback is called after the subscribe function receives a response.
 * @callback PFCluster~subscribeOnSubscribeCallback
 * @param {number} id - Id of the cluster subscribed to
 */

/**
 * This callback is called when the subscribe function receives an receives update response.
 * @callback PFCluster~subscribeUpdateCallback
 * @param {PFCluster} cluster - The cluster subscribed to
 * @param {PFCluster} updatedCluster - The updated cluster received
 */

/**
 * Unsubscribes the cluster to updates.
 */
PFCluster.prototype.unsubscribe = function() {
    this.pathfinder.modelUnsubscribeHelper("Cluster", this.id);
};

/**
 * Subscribe for route updates to the cluster.
 * @param {PFCluster~routeOnSubscribeCallback} onSubscribeCallback - The callback used when the route subscribe request is successful
 * @param {PFCluster~routeUpdateCallback} updateCallback - The callback used when the cluster's routes are updated
 */
PFCluster.prototype.routeSubscribe = function(onSubscribeCallback, updateCallback) {
    this.pathfinder.routeSubscribeHelper("Cluster", this, onSubscribeCallback, updateCallback);
};

/**
 * This callback is called after the route subscribe function receives a response.
 * @callback PFCluster~routeOnSubscribeCallback
 * @param {number} id - Id of the cluster's routes subscribed to
 */

/**
 * This callback is called when the route subscribe function receives an receives update response.
 * @callback PFCluster~routeUpdateCallback
 * @param {PFCluster} cluster - The cluster subscribed to
 * @param {object} routes - The updated route information
 */

/**
 * Unsubscribes the cluster to route updates.
 */
PFCluster.prototype.routeUnsubscribe = function() {
    this.pathfinder.routeUnsubscribeHelper("Cluster", this.id);
};

/**
 * Pathfinder commodity constructor. Do not call this constructor it is for the Pathfinder object to use.
 * @param {number} id - Id of the commodity
 * @param {number} startLat - The starting latitude of the commodity
 * @param {number} startLong - The starting longitude of the commodity
 * @param {number} endLat - The ending latitude of the commodity
 * @param {number} endLong - The ending longitude of the commodity
 * @param {string} status - The status of the commodity
 * @param {object} metadata - The metadata of the commodity
 * @param {Pathfinder} pathfinder - Pathfinder object that creates this commodity
 * @constructor
 */
function PFCommodity(id, startLat, startLong, endLat, endLong, status, metadata, pathfinder) {
    this.id = id;
    this.startLat = startLat;
    this.startLong = startLong;
    this.endLat = endLat;
    this.endLong = endLong;
    this.status = status;
    this.metadata = metadata;
    this.pathfinder = pathfinder;
}

/**
 * Subscribe for updates to the commodity.
 * @param {PFCommodity~subscribeOnSubscribeCallback} onSubscribeCallback - The callback used when the subscribe request is successful
 * @param {PFCommodity~subscribeUpdateCallback} updateCallback - The callback used when updates to the commodity are received
 */
PFCommodity.prototype.subscribe = function(onSubscribeCallback, updateCallback) {
    this.pathfinder.modelSubscribeHelper("Commodity", this, onSubscribeCallback, updateCallback).bind(this.pathfinder);
};

/**
 * This callback is called after the subscribe function receives a response.
 * @callback PFCommodity~subscribeOnSubscribeCallback
 * @param {number} id - Id of the commodity subscribed to
 */

/**
 * This callback is called when the subscribe function receives an receives update response.
 * @callback PFCommodity~subscribeUpdateCallback
 * @param {PFCommodity} commodity - The commodity subscribed to
 * @param {PFCommodity} updatedCommodity - The updated commodity received
 */

/**
 * Unsubscribes the commodity to updates.
 */
PFCommodity.prototype.unsubscribe = function() {
    this.pathfinder.modelUnsubscribeHelper("Commodity", this.id);
};

/**
 * Subscribe for route updates to the commodity.
 * @param {PFCommodity~routeOnSubscribeCallback} onSubscribeCallback - The callback used when the route subscribe request is successful
 * @param {PFCommodity~routeUpdateCallback} updateCallback - The callback used when the commodity's route is updated
 */
PFCommodity.prototype.routeSubscribe = function(onSubscribeCallback, updateCallback) {
    this.pathfinder.routeSubscribeHelper("Commodity", this, onSubscribeCallback, updateCallback);
};

/**
 * This callback is called after the route subscribe function receives a response.
 * @callback PFCommodity~routeOnSubscribeCallback
 * @param {number} id - Id of the commodity's route subscribed to
 */

/**
 * This callback is called when the route subscribe function receives an receives update response.
 * @callback PFCommodity~routeUpdateCallback
 * @param {PFCommodity} commodity - The commodity subscribed to
 * @param {object} route - The updated route information
 */

/**
 * Unsubscribes the commodity to route updates.
 */
PFCommodity.prototype.routeUnsubscribe = function() {
    this.pathfinder.routeUnsubscribeHelper("Commodity", this.id);
};

/**
 * Pathfinder transport constructor. Do not call this constructor it is for the Pathfinder object to use.
 * @param {number} id - Id of the transport
 * @param {number} longitude - The longitude of the transport
 * @param {number} latitude - The latitude of the transport
 * @param {string} status - The status of the transport
 * @param {object} metadata - The metadata of the transport
 * @param {Pathfinder} pathfinder - Pathfinder object that creates this transport
 * @constructor
 */
function PFTransport(id, longitude, latitude, status, metadata, pathfinder) {
    this.id = id;
    this.longitude = longitude;
    this.latitude = latitude;
    this.status = status;
    this.metadata = metadata;
    this.pathfinder = pathfinder;
}

/**
 * Subscribe for updates to the transport.
 * @param {PFTransport~subscribeOnSubscribeCallback} onSubscribeCallback - The callback used when the subscribe request is successful
 * @param {PFTransport~subscribeUpdateCallback} updateCallback - The callback used when updates to the transport are received
 */
PFTransport.prototype.subscribe = function(onSubscribeCallback, updateCallback) {
    this.pathfinder.modelSubscribeHelper("Transport", this, onSubscribeCallback, updateCallback).bind(this.pathfinder);
};

/**
 * This callback is called after the subscribe function receives a response.
 * @callback PFTransport~subscribeOnSubscribeCallback
 * @param {number} id - Id of the transport subscribed to
 */

/**
 * This callback is called when the subscribe function receives an receives update response.
 * @callback PFTransport~subscribeUpdateCallback
 * @param {PFTransport} transport - The transport subscribed to
 * @param {PFTransport} updatedTransport - The updated transport received
 */

/**
 * Unsubscribes the transport to updates.
 */
PFTransport.prototype.unsubscribe = function() {
    this.pathfinder.modelUnsubscribeHelper("Transport", this.id).bind(this.pathfinder);
};

/**
 * Subscribe for route updates to the transport.
 * @param {PFTransport~routeOnSubscribeCallback} onSubscribeCallback - The callback used when the route subscribe request is successful
 * @param {PFTransport~routeUpdateCallback} updateCallback - The callback used when the transport's route is updated
 */
PFTransport.prototype.routeSubscribe = function(onSubscribeCallback, updateCallback) {
    this.pathfinder.routeSubscribeHelper("Transport", this, onSubscribeCallback, updateCallback).bind(this.pathfinder);
};

/**
 * This callback is called after the route subscribe function receives a response.
 * @callback PFTransport~routeOnSubscribeCallback
 * @param {number} id - Id of the transport's route subscribed to
 */

/**
 * This callback is called when the route subscribe function receives an receives update response.
 * @callback PFTransport~routeUpdateCallback
 * @param {PFTransport} transport - The transport subscribed to
 * @param {object} route - The updated route information
 */

/**
 * Unsubscribes the transport to route updates.
 */
PFTransport.prototype.routeUnsubscribe = function() {
    this.pathfinder.routeUnsubscribeHelper("Transport", this.id).bind(this.pathfinder);
};
