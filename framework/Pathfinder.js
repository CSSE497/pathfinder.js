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
        "clusters" : {},
        "commodities" : {},
        "transports" : {},
        "routes" : {
            "Cluster" : {},
            "Commodity" : {},
            "Transport" : {}
        }
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

Pathfinder.prototype.constructModel = function(data, model) {
    switch(model) {
        case "Cluster" :
            return this.constructCluster(data);
        case "Commodity" :
            return this.constructCommodity(data);
        case "Transport" :
            return this.constructTransport(data);
    }
};

Pathfinder.prototype.handleCreated = function(data, model) {
    var request = this.pendingRequests.created[model].pop();

    if(request === undefined) {
        console.error("Create " + model + " request failed: " + data);
    } else {
        var callback = request.callback;
        callback(this.constructModel(data, model));

    }
};

Pathfinder.prototype.handleHelper = function(data, type, model) {
    var id = data.id;
    var request = this.pendingRequests[type][model][id];

    if(request === undefined) {
        console.error(type + " " + model + " request failed: " + data);
    } else {
        var callback = request.callback;
        delete this.pendingRequests[type][model][id];

        callback(this.constructModel(data, model));
    }
};

Pathfinder.prototype.handleDeleted = function(data, model) {
    this.handleHelper(data, "deleted", model);
};

Pathfinder.prototype.handleRead = function(data, model) {
    this.handleHelper(data, "read", model);
};

Pathfinder.prototype.handleUpdated = function(data, model) {
    this.handleHelper(data, "updated", model);
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