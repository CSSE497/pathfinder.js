function Cluster(id, vehicles, commodities, socket) {
    // Delegate functions
    this.vehicleDidComeOnline =
    this.vehicleDidGoOffline =
    this.commodityWasRequested =
    this.commodityWasPickedUp =
    this.commodityWasDroppedOff =
    this.commodityWasCancelled =
    this.clusterWasRouted = function() {};


    // Accessor functions
    function getVehicles() {
        return vehicles;
    }

    function getCommodities() {
        return commodities;
    }
}