// avoid console errors if missing

if(typeof console == "undefined" || typeof console.log == "undefined"){
  console = { log: function(){ } };
}

// set up Google Maps

google.maps.visualRefresh=true;
var mapOptions = {
  center: new google.maps.LatLng( 42.359686, -71.05854 ),
  zoom: 14,
  mapTypeId: google.maps.MapTypeId.ROADMAP,
  streetViewControl: false,
  zoomControlOptions: {
    style: google.maps.ZoomControlStyle.SMALL
  }
};
var map = new google.maps.Map( $("#map")[0], mapOptions);
var geocoder = new google.maps.Geocoder();
var infoWindow = new google.maps.InfoWindow();
var directionsDisplay = new google.maps.DirectionsRenderer();
directionsDisplay.setMap(map);
var directionsService = new google.maps.DirectionsService();

// set up last-minute UI
$(document).ready(function(){
  // line up bottom of the map with bottom of the window
  $("#map").height( $("#map").height() - $("#map").offset().top );

  // set up search
  $("#addsearch").keypress(function(e){
    if(e.keyCode == 13){
      // pressed enter
      searchAddress();
    }
  });
});

// set up polling place info
var visiblePrecincts = [ ];
var pollMarkers = { };

// set up directions info
var directionsFrom = null;

// tap to close window AND/OR taps to find polling place
google.maps.event.addListener(map, "click", function(e){
  infoWindow.close();
});
google.maps.event.addListener(map, "dblclick", function(e){
  var lat = e.latLng.lat();
  var lng = e.latLng.lng();
  findPrecinctAndPoll( new google.maps.LatLng( lat, lng ) );
});

// load and map all polling places
var s = document.createElement("script");
s.type = "text/javascript";
s.src = "http://maps.cityofboston.gov/ArcGIS/rest/services/PublicProperty/PollingPlaces/FeatureServer/0/query?f=json&where=1%3D1&returnGeometry=true&outFields=*&outSR=4326&callback=loadPollingPlaces";
$(document.body).append(s);

function loadPollingPlaces(polldata){
  var polls = polldata.features;
  for(var p=0; p<polls.length; p++){
    var poll = polls[p];
    
    // map this polling place
    var lat = poll.geometry.y;
    var lng = poll.geometry.x;
    var pollMarker = new google.maps.Marker({
      position: new google.maps.LatLng( lat, lng ),
      map: map
    });
    pollMarkers[ poll.attributes.POLLINGID ] = { marker: pollMarker, poll: poll };
    
    // display district and info when I click this polling place
    attachMarker(poll, pollMarker);
  }
}

function attachMarker(poll, pollMarker){
  google.maps.event.addListener(pollMarker, "click", function(e){
    // write and open popup; include all voting precincts
    var content = "<div class='nowrap'>" + poll.attributes.NAME.toLowerCase() + "</div>";
    
    infoWindow.setContent( content );
    infoWindow.open(map, pollMarker);

    // clear old precincts
    if(visiblePrecincts.length){
      for(var p=0;p<visiblePrecincts.length;p++){
        visiblePrecincts[p].setMap(null);
      }
      visiblePrecincts = [ ];
    }
    
    // look up precinct by polling ID
    // this lookup table step is needed to connect a polling place to its precinct
    var pollingID = poll.attributes.POLLINGID;

    var s = document.createElement("script");
    s.type = "text/javascript";
    s.src = "http://maps.cityofboston.gov/ArcGIS/rest/services/PublicProperty/PollingPlaces/FeatureServer/2/query?where=POLLINGID%3D" + pollingID + "&outFields=*&f=json&callback=findPrecinct";
    $(document.body).append(s);
  });
}

function findPrecinct(lookupData){

  var precinctIDs = [ ];
  for(var p=0;p<lookupData.features.length;p++){
    precinctIDs.push( lookupData.features[p].attributes.PRECINCTID );
  }
  precinctIDs = precinctIDs.join("%27+OR+PRECINCTID%3D%27");
  
  // look up precinct geometry
  var s = document.createElement("script");
  s.type = "text/javascript";
  s.src = "http://maps.cityofboston.gov/ArcGIS/rest/services/PublicProperty/Precincts/MapServer/0/query?where=PRECINCTID%3D%27" + precinctIDs + "%27&outSR=4326&outFields=*&f=json&returnGeometry=true&callback=mapPrecinctPolygons";
  $(document.body).append(s);
}

function mapPrecinctPolygons(precinctData){

  // clear old precincts
  if(visiblePrecincts.length){
    for(var p=0;p<visiblePrecincts.length;p++){
      visiblePrecincts[p].setMap(null);
    }
    visiblePrecincts = [ ];
  }
  
  // load new precincts, if they were found
  if(precinctData.features.length){
  
    // update infowindow
    var content = infoWindow.getContent();
  
    for(var f=0;f<precinctData.features.length;f++){
      var precinct = precinctData.features[f].geometry;
      var rings = [ ];
      // add to info window
      if(f){
        content += ", ";
      }
      content += precinctData.features[f].attributes.NAME;
      
      for(var r=0; r<precinct.rings.length;r++){
        var ring = [ ];
        for(var pt=0; pt<precinct.rings[r].length; pt++){
          ring.push( new google.maps.LatLng( precinct.rings[r][pt][1], precinct.rings[r][pt][0] ) );
        }
        rings.push(ring);
      }
      var precinct = new google.maps.Polygon({
        paths: rings,
        strokeWeight: 1,
        strokeOpacity: 0.5,
        strokeColor: "#00f",
        geodesic: false,
        clickable: false,
        fillColor: "#4a4aff",
        fillOpacity: 0.6,
        map: map
      });

      visiblePrecincts.push( precinct );
    }
    
    // update info window
    infoWindow.setContent( content );
  }
}

function findPrecinctAndPoll( latlng ){
  var s = document.createElement("script");
  s.type = "text/javascript";
  s.src = "http://maps.cityofboston.gov/ArcGIS/rest/services/PublicProperty/Precincts/MapServer/0/query?text=&geometry=%7Bx%3A+" + latlng.lng() + "%2C+y%3A+" + latlng.lat() + "+%7D&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&returnGeometry=true&outSR=4326&outFields=*&f=json&callback=showPrecinctAndPoll";
  $(document.body).append(s);
}

function showPrecinctAndPoll( precinctData ){
  mapPrecinctPolygons( precinctData );

  // look up polling place by precinct ID
  // this lookup table step is needed to connect a polling place to its precinct
  var precinctID = precinctData.features[0].attributes.PRECINCTID;

  var s = document.createElement("script");
  s.type = "text/javascript";
  s.src = "http://maps.cityofboston.gov/ArcGIS/rest/services/PublicProperty/PollingPlaces/FeatureServer/2/query?where=PRECINCTID%3D" + precinctID + "&outFields=*&f=json&callback=showPollMarker";
  $(document.body).append(s);
}

function showPollMarker( lookupData ){
  var pollingID = lookupData.features[0].attributes.POLLINGID;
  var poll = pollMarkers[ pollingID ].poll;

  var content = "<div class='nowrap'>" + poll.attributes.NAME.toLowerCase() + "</div>";
  infoWindow.setContent( content );
  infoWindow.open( map, pollMarkers[ pollingID ].marker );
  
  if(directionsFrom){
    // show directions from stored point to the poll
    showDirections(directionsFrom, pollMarkers[ pollingID ].marker.getPosition() );
  }
}

function showDirections(startll, endll){
  var request = {
    origin: startll,
    destination: endll,
    travelMode: google.maps.DirectionsTravelMode.WALKING
  };
  directionsService.route(request, function(result, status){
    if(status == google.maps.DirectionsStatus.OK){
      directionsDisplay.setDirections(result);
    }
  });
}

function searchAddress(){
  var searched = $("#addsearch").val();
  if(searched.toLowerCase().indexOf("boston") == -1){
    searched += ", Boston, MA";
  }
  console.log(searched);
  geocoder.geocode( { 'address': searched }, function(results, status){
    if(status == google.maps.GeocoderStatus.OK && results.length){
      directionsFrom = results[0].geometry.location;
      findPrecinctAndPoll( results[0].geometry.location );
    }
  });
}