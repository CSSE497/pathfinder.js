/**
 * Pathfinder commodity constructor. Do not call this constructor it is for the Pathfinder object to use.
 * @param {number} id - Id of the commodity
 * @param {number} startLat - The starting latitude of the commodity
 * @param {number} startLong - The starting longitude of the commodity
 * @param {number} endLat - The ending latitude of the commodity
 * @param {number} endLong - The ending longitude of the commodity
 * @param {string} status - The status of the commodity
 * @param {number} capacity - The capacity of the commodity
 * @param {Pathfinder} pathfinder - Pathfinder object that creates this commodity
 * @constructor
 */
function PFCommodity(id, startLat, startLong, endLat, endLong, status, capacity, pathfinder) {
    this.id = id;
    this.startLat = startLat;
    this.startLong = startLong;
    this.endLat = endLat;
    this.endLong = endLong;
    this.status = status;
    this.capacity = capacity;
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
