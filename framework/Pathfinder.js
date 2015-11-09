function Pathfinder(url, applicationIdentifier, userCredentials) {
    this.url = url;
    this.applicationIdentifier = applicationIdentifier;

    // TODO figure out what to do with this later
    this.userCredentials = userCredentials;
    this.webSocket = new WebSocket(this.url);
    this.webSocket.onmessage = this.onmessage.bind(this);

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

Pathfinder.prototype.close = function() {
  this.webSocket.close();
};

Pathfinder.prototype.onmessage = function(msg) {

    var data = JSON.parse(msg.data);

    if(data.hasOwnProperty("error")) {
        console.error(data);
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
        console.log("Unknown messges", data);
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
        data.longitude,
        data.latitude,
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
    var id = data[type].id;
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

    console.log(JSON.stringify(obj));

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

    this.requestHelper("read", "ApplicationCluster", this.applicationIdentifier, obj, callback);
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

Pathfinder.prototype.getTransport = function(id, callback) {
    this.readRequestHelper("Transport", id, callback);
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

Pathfinder.prototype.deleteTransport = function(id, callback) {
    this.deleteRequestHelper("Transport", id, callback);
};

Pathfinder.prototype.routeRequestHelper = function(model, id, callback) {
    var obj = {
        "route" : {
            "model" : model,
            "id" : id
        }
    };
    this.requestHelper("routed", model, id, obj, callback);
};

Pathfinder.prototype.routeCluster = function(id, callback) {
    this.routeRequestHelper("Cluster", id, callback);
};

Pathfinder.prototype.routeCommodity = function(id, callback) {
    this.routeRequestHelper("Commodity", id, callback);
};

Pathfinder.prototype.routeTransport = function(id, callback) {
    this.routeRequestHelper("Transport", id, callback);
};

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
    if(this.pathfinder.subscriptions[model][this.id] === undefined) {
        this.pathfinder.subscriptions[model][this.id] = {
            "obj" : obj,
            "callback" : updateCallback
        };
        this.modelSubscribeRequestHelper(model, obj.id, onSubscribeCallback);
    } else {
        this.pathfinder.subscriptions[model][this.id].callback = updateCallback;
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
    if(this.pathfinder.subscriptions.Route[model][this.id] === undefined) {
        this.pathfinder.subscriptions.Route[model][this.id] = {
            "obj" : obj,
            "callback" : updateCallback
        };
        this.routeSubscribeRequestHelper(model, obj.id, onSubscribeCallback);
    } else {
        this.pathfinder.subscriptions.Route[model][this.id].callback = updateCallback;
    }
};

Pathfinder.prototype.routeUnsubscribeHelper = function(model, id) {
    delete this.pathfinder.subscriptions.Route[model][id];
    // need to tell the server to stop sending updates when this gets implemented
};