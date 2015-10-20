# pathfinder.js - A JavaScript SDK for web clients.

The Pathfinder JS Client Library allows developers to easily integrate Pathfinder routing service in their web applications.
  
Pathfinder provides routing as a service, removing the need for developers to implement their own routing logistics. This SDK allows for iOS applications to act as commodities that need transportation or vehicles that provide transportation. Additionally, there is support for viewing routes for sets of commodities and vehicles.  
  
## [Publicly Hosted Documentation](http://csse497.github.io/pathfinder.js/)
  
## Building the Library and Documentation
1.  Install Node dependencies with  
```
$ npm install
```
2.  Run gulp  
```
$ gulp
```  
  
Gulp will watch source files and re-minify if one is modified  
  
## Using Pathfinder.js
  
Before you can use pathfinder, you will need to include it in your website:  
```HTML
<script type="text/javascript" src="js/vendor/pathfinder.min.js"></script>
```
  
To start using pathfinder, create a pathfinder object using your app id and user credentials. Both the app id and user credentials can be found on the web portal.  
```JavaScript
var myAppId = 'xyz';
var userCreds = fetchUserCreds();
var pathfinderRef = new Pathfinder(myAppId, userCreds);
```
Once you have a pathfinder object, you can interact with your data in one of two ways:  
1.  As an observer  
2.  As a commodity transport requester  
  
###  As an observer  
If your application wants to display data regarding all (or some subset of) commodities, vehicles and their routes for a cluster, you will want to do the following:  

1.  Obtain a cluster reference from the pathfinder object
```JavaScript
pathfinderRef.defaultCluster(function(c) {
  cluster = c;
});
```  

2.  Set callback functions to be notified whenever new commodities or vehicles appear, when vehicles move, when commodities are picked up, dropped off or cancelled and when routes are generated.
```JavaScript
cluster.vehicleDidComeOnline(function(vehicle) {
  // Handle new vehicle
});
```  
See the api documentation for a complete list of available callbacks  
  
###  As a commodity transport requester  
  
If your application requests commodities, you will want to do the following:  
  
  
1.  Determine the physical parameters that your commodity takes up. These parameters should match the constraints that are placed on the vehicles in the same cluster. Any parameters that are not set will be assumed to be zero.
```JavaScript
var parameters = {
  "people": 2
};
```  
  
2.  Initiate the request and obtain a commodity reference from the top-level pathfinder object.
```JavaScript
pathfinder.requestCommodityTransit(cluster, startCoordinates, endCoordinates, parameters, function(c) {
  commodity = c;
});
```  
  
3.  Set callbacks on the commodity to be notified when it is assigned to a route or its pickup/dropoff/cancel status changes.
```JavaScript
commodity.wasRouted(function(route) {
  // e.g. Render route on map
});
```
See the api documentation for a complete list of available callbacks
