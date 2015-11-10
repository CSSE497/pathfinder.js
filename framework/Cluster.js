/**
 * Pathfinder cluster constructor. Do not call this constructor it is for the Pathfinder object to use.
 * @param {number} id - The id of the cluster
 * @param {number} parentId - The parent id of the cluster
 * @param {array} commodities - Array of the commodities in the cluster
 * @param {array} transports - Array of the transports in the cluster
 * @param {Pathfinder} pathfinder - Pathfinder object that creates this commodity
 * @constructor
 */
function PFCluster(id, parentId, commodities, transports, pathfinder) {
    this.id = id;
    this.parentId = parentId;
    this.commodities = commodities;
    this.transports = transports;
    this.pathfinder = pathfinder;
}

/**
 * Subscribe for updates to the cluster.
 * @param {PFCluster~subscribeOnSubscribeCallback} onSubscribeCallback - The callback used when the subscribe request is successful
 * @param {PFCluster~subscribeUpdateCallback} updateCallback - The callback used when updates to the cluster are received
 */
PFCluster.prototype.subscribe = function(onSubscribeCallback, updateCallback) {
    this.pathfinder.modelSubscribeHelper("Cluster", this, onSubscribeCallback, updateCallback).bind(this.pathfinder);
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
    this.pathfinder.modelUnsubscribeHelper("Cluster", this.id).bind(this.pathfinder);
};

/**
 * Subscribe for route updates to the cluster.
 * @param {PFCluster~routeOnSubscribeCallback} onSubscribeCallback - The callback used when the route subscribe request is successful
 * @param {PFCluster~routeUpdateCallback} updateCallback - The callback used when the cluster's routes are updated
 */
PFCluster.prototype.routeSubscribe = function(onSubscribeCallback, updateCallback) {
    this.pathfinder.routeSubscribeHelper("Cluster", this, onSubscribeCallback, updateCallback).bind(this.pathfinder);
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
    this.pathfinder.routeUnsubscribeHelper("Cluster", this.id).bind(this.pathfinder);
};