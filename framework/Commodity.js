/**
 * Represents a commodity in the Cluster/Vehicle/Commodity (CVC) model.
 *
 * The functions in this class provide notifications about this commodity
 *
 * This class should never directly be instantiated. Instead, it will be created automatically
 * and passed into the callback of functions such as commodityWasRequested()
 *
 * @param {Number} id
 * @param {Number} longitude
 * @param {Number} latitude
 * @param {String} status
 * @param {Number} capacity
 * @param {Object} webSocket
 * @class
 */
function PFCommodity(id, longitude, latitude, status, capacity, webSocket) {
    /**
     * @callback Commodity~wasPickedUpAt
     * @param {object} location The location where the commodity was picked up
     * @param {object} commodity The commodity that was picked up
     * @param {object} byVehicle The vehicle that is now transporting the commodity
     */

    /**
     * A commodity was picked up at its starting location
     * @param {Commodity~wasPickedUpAt} callback called when commodity is picked up
     */
    this.wasPicketUpAt = function(callback) {};

    /**
     * @callback Commodity~wasDroppedOffAt
     * @param {object} location The location where the commodity was dropped off
     * @param {object} commodity The commodity that was dropped off
     */

    /**
     * A commodity was dropped off at its destination
     * @param {Commodity~wasDroppedOffAt} callback called when commodity is dropped off
     */
    this.wasDroppedOffAt = function(callback) {};

    /**
     * @callback Commodity~wasCancelled
     * @param {object} commodity The commodity that will no longer be transported
     */

    /**
     * A commodity transportation request was cancelled
     * @param {Commodity~wasCancelled} callback called when commodity is cancelled
     */
    this.wasCancelled = function(callback) {};

    /**
     * @callback Commodity~wasRouted
     * @param {object} commodity The commodity that will be transported
     * @param {object} byVehicle The vehicle that will transport the commodity
     * @param {object} onRoute The route which contains the other commodities that will be picked up by the vehicle
     */

    /**
     * A route was generated for a vehicle that includes this commodity
     * @param {Commodity~wasRouted} callback called when commodity is routed
     */
    this.wasRouted = function(callback) {};

    /**
     * Remove this commodity from consideration when routing.
     */
    this.cancel = function() {};

    this.getStart = function() {
        return start;
    };

    this.getDestination = function() {
        return destination;
    };
}