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
  mapTypeControl: false,
  zoomControlOptions: {
    style: google.maps.ZoomControlStyle.SMALL
  }
};
var map = new google.maps.Map( $("#map")[0], mapOptions);
var infoWindow = new google.maps.InfoWindow();

// set up last-minute UI
$(document).ready(function(){
  // line up bottom of the map with bottom of the window
  //$("#map").height( screen.height - $("#map").offset().top );
  
  // ensure clear button on search bar works
  $("#topbar .ui-icon-delete").click(function(e){
    $("#addsearch").val("");
  });

  // open splash screen
  $.mobile.changePage('#splash_screen', 'pop', true, true);
});

// set up polling place info
var visiblePrecincts = [ ];
var selectMarker = null;
var pollMarkers = { };

// set up directions info
var directionsFrom = null;
var geocoder = new google.maps.Geocoder();
var directionsDisplay = new google.maps.DirectionsRenderer({ suppressMarkers: true });
directionsDisplay.setMap(map);
directionsDisplay.setPanel( $("#directions_readout")[0] );
var directionsService = new google.maps.DirectionsService();
var displayEntrance = null;
var mydestination = null;
var startmarker = null;
var myTravelMode = null;

// tap to close window AND/OR taps to find polling place
google.maps.event.addListener(map, "click", function(e){
  infoWindow.close();
});
/*
google.maps.event.addListener(map, "dblclick", function(e){
  var lat = e.latLng.lat();
  var lng = e.latLng.lng();
  findPrecinctAndPoll( new google.maps.LatLng( lat, lng ) );
});
*/

// load and map all polling places
/*
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
      position: new google.maps.LatLng( lat, lng )
    });
    pollMarkers[ poll.attributes.POLLINGID ] = { marker: pollMarker, poll: poll };
    
    // display district and info when I click this polling place
    attachMarker(poll, pollMarker);
  }
}
*/

function attachMarker(poll, pollMarker){
  google.maps.event.addListener(pollMarker, "click", function(e){
    // write and open popup; include all voting precincts
    var content = "<div class='nowrap'>" + poll.attributes.NAME.toLowerCase() + "</div>";
    
    infoWindow.setContent( content );
    infoWindow.open(map, pollMarker);

/*
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
*/
    
  });
}

/*
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
*/

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
        fillColor: "#3aaacf",
        fillOpacity: 0.4,
        map: map
      });

      visiblePrecincts.push( precinct );
    }
    
    // update info window
    infoWindow.setContent( content );
  }
}

function findPrecinctAndPoll( latlng ){
  // hide last search
  if(selectMarker){
    selectMarker.setMap(null);
    displayEntrance = null;
  }

  // search for precinct matching this latlng
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
  if(selectMarker){
    selectMarker.setMap(null);
    displayEntrance = null;
  }

  var pollingID = lookupData.features[0].attributes.POLLINGID;  
  if(typeof pollMarkers[ pollingID ] == "undefined"){
    var s = document.createElement("script");
    s.type = "text/javascript";
    s.src = "http://maps.cityofboston.gov/ArcGIS/rest/services/PublicProperty/PollingPlaces/FeatureServer/0/query?f=json&where=POLLINGID%3D" + pollingID + "&returnGeometry=true&outFields=*&outSR=4326&callback=showPoll";
    $(document.body).append(s);
  }
  else{
    showPoll( { features: [ pollMarkers[ pollingID ].poll ] } );
  }
}

function showPoll(polldata){ 
  var poll = polldata.features[0];
  var pollingID = poll.attributes.POLLINGID;

  if(typeof pollMarkers[ pollingID ] == "undefined"){
    // place a marker if previously unknown
    var lat = poll.geometry.y;
    var lng = poll.geometry.x;
    var pollMarker = new google.maps.Marker({
      position: new google.maps.LatLng( lat, lng )
    });
    
    // display district and info when I click this polling place
    attachMarker(poll, pollMarker);
    
    // remember this marker
    pollMarkers[ pollingID ] = {
      marker: pollMarker,
      poll: poll
    };
  }

  var content = "<div class='nowrap'>" + poll.attributes.NAME.toLowerCase() + "</div>";
  if(poll.attributes.Voter_Entrance){
    content += poll.attributes.Voter_Entrance.toLowerCase();
  }
  infoWindow.setContent( content );
  infoWindow.open( map, pollMarkers[ pollingID ].marker );

  selectMarker = pollMarkers[ pollingID ].marker;
  selectMarker.setMap(map);
  
  $("#moreinfo").css({ visibility: "visible" });
  if(poll.attributes.Voter_Entrance){
    $("#entrance").text( poll.attributes.Voter_Entrance.toLowerCase() ).css({
      display: "block"
    });
  }
  else{
    $("#entrance").css({
      display: "none"
    });
  }
  
  if(directionsFrom){
    // show directions from stored point to the poll
    showDirections(directionsFrom, pollMarkers[ pollingID ].marker.getPosition() );
  }
}

function showDirections(startll, endll){
  mydestination = endll;
  var travel = google.maps.DirectionsTravelMode.WALKING;
  if(myTravelMode){
    if(myTravelMode == "transit"){
      travel = google.maps.DirectionsTravelMode.TRANSIT;
    }
    else if(myTravelMode == "drive"){
      travel = google.maps.DirectionsTravelMode.DRIVING;
    }
  }
  var request = {
    origin: startll,
    destination: endll,
    travelMode: travel
  };
  if(startmarker){
    startmarker.setMap(null);
  }
  directionsService.route(request, function(result, status){
    if(status == google.maps.DirectionsStatus.OK){
      directionsDisplay.setDirections(result);
      startmarker = new google.maps.Marker({
        map: map,
        clickable: false,
        icon: 'http://mt.googleapis.com/vt/icon/name=icons/spotlight/spotlight-waypoint-a.png&text=%20&psize=16&font=fonts/Roboto-Regular.ttf&color=ff333333&ax=44&ay=48&scale=1',
        position: result.routes[0].legs[0].start_location
      });
    }
  });
}

function searchAddress(){
  // hide splash screen
  $('#splash_screen').css({ display: "none" });

  // if not specified, tell Google that this address is inside the city
  var searched = $("#addsearch").val();
  if(searched.toLowerCase().indexOf("boston") == -1){
    searched += ", Boston, MA";
  }
  //console.log(searched);
  
  // use Google geocoder
  geocoder.geocode( { 'address': searched }, function(results, status){
    if(status == google.maps.GeocoderStatus.OK && results.length){
      directionsFrom = results[0].geometry.location;
      findPrecinctAndPoll( results[0].geometry.location );
    }
  });
}

function directionsFromMe(){
  // recalculate directions from current location
  navigator.geolocation.getCurrentPosition(function(position){
    directionsFrom = new google.maps.LatLng( position.coords.latitude, position.coords.longitude );
    showDirections(directionsFrom, mydestination);
  });
}

function travelMode(){
  // determine user's travel mode
  var modes = $(".transitmode");
  for(var m=0;m<modes.length;m++){
    if(modes[m].checked && modes[m].value != myTravelMode){
      myTravelMode = modes[m].value;
      showDirections( directionsFrom, mydestination );
      return;
    }
  }
}

function checkForEnter(e){
  if(e.keyCode == 13){
    // pressed enter
    searchAddress();
  }
}

if(myTravelMode){
  var modes = $(".transitmode");
  for(var m=0;m<modes.length;m++){
    if(modes[m].value == myTravelMode){
      modes[m].checked = true;
    }
    else{
      modes[m].checked = false;
    }
  }
}

// if this browser cannot geolocate, hide button
if(!navigator.geolocation || !navigator.geolocation.getCurrentPosition){
  $("#fromhere").css({ display: "none" }); 
}

function directionsWindow(){
  $("#moreinfo_screen").css({ display: "block" });
  $.mobile.changePage('#moreinfo_screen', 'pop', true, true);

  // make everything scrollable so Android < 3 can work
  $("html, body, #map, .ui-body, .ui-page").css({
    overflow: "scrollable-y"
  });
}

function hideDirectionsWindow(){
  $('#moreinfo_screen').css({ display: 'none' })
  // make everything un-scrollable so Android < 3 can work
  $("html, body, #map, .ui-body, .ui-page").css({
    overflow: "hidden"
  });
}