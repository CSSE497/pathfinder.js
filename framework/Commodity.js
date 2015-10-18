function Commodity(id, start, destination, route) {
    this.wasPicketUpAt =
    this.wasDroppedOffAt =
    this.wasCancelled =
    this.wasRouted =
    this.cancel = function() {};

    // Accessor functions
    function getStart() {
        return start;
    }

    function getDestination() {
        return destination;
    }
}