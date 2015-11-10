/**
 * Pathfinder transport constructor. Do not call this constructor it is for the Pathfinder object to use.
 * @param {number} id - Id of the transport
 * @param {number} longitude - The longitude of the transport
 * @param {number} latitude - The latitude of the transport
 * @param {string} status - The status of the transport
 * @param {number} capacity - The capacity of the transport
 * @param {Pathfinder} pathfinder - Pathfinder object that creates this transport
 * @constructor
 */
function PFTransport(id, longitude, latitude, status, capacity, pathfinder) {
    this.id = id;
    this.longitude = longitude;
    this.latitude = latitude;
    this.status = status;
    this.capacity = capacity;
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