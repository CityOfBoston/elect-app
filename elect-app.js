// data locations
var precinct = {
  // URL with {{LAT}} and {{LNG}}, callback to showPrecinctAndPoll
  serviceUrl: "http://maps.cityofboston.gov/ArcGIS/rest/services/PublicProperty/Precincts/MapServer/0/query?text=&geometry=%7Bx%3A+{{LNG}}%2C+y%3A+{{LAT}}+%7D&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&returnGeometry=true&outSR=4326&outFields=*&f=json&callback=showPrecinctAndPoll",
  getList: function(precinctServiceResponse){
    return precinctServiceResponse.features;
  },
  getName: function(precinctFeature){
    var name = precinctFeature.attributes.NAME;
    return "Ward " + name.substring(0,2) + ", Precinct " + name.substring(2);
  },
  getID: function(precinctFeature){
    return precinctFeature.attributes.PRECINCTID.substring(2) * 1;
  },
  getWardID: function(precinctFeature){
    return precinctFeature.attributes.PRECINCTID.substring(0,2) * 1;
  },
  getPolygon: function(precinctFeature){
    // polygon coordinates [ [ [lat, lng], [lat, lng], [lat, lng] ] ]
    // holes: [ [ outer latlngs ], [ inner latlngs ] ]
    var rings = [ ];
    for(var r=0; r<precinctFeature.geometry.rings.length;r++){
      var ring = [ ];
      for(var pt=0; pt<precinctFeature.geometry.rings[r].length; pt++){
        ring.push([
          precinctFeature.geometry.rings[r][pt][1],
          precinctFeature.geometry.rings[r][pt][0]
        ]);
      }
      rings.push(ring);
    }
    return rings;
  }
};

// set to null if you can directly use precinct's PRECINCTID === polling place's POLLINGPLACEID
var lookupTable = {
  // URL with {{PRECINCTID}}, {{WARDID}}, callback to showPollMarker
  
  serviceUrl: "http://maps.cityofboston.gov/ArcGIS/rest/services/PublicProperty/PollingPlaces/MapServer/2/query?where=Ward%3D{{WARDID}}%20AND%20Precinct%3D{{PRECINCTID}}&outFields=*&f=json&callback=showPollMarker",
  pollingPlaceId: function(lookupData){
    return lookupData.features[0].attributes.Voting_id;
  }
};

var pollingPlace = {
  // URL with {{POLLINGPLACEID}}, callback to showPoll
  serviceUrl: "http://maps.cityofboston.gov/ArcGIS/rest/services/PublicProperty/PollingPlaces/MapServer/0/query?where=Voting+%3D+{{POLLINGPLACEID}}&returnGeometry=true&outFields=*&f=json&outSR=4326&callback=showPoll",
  getFirst: function( polldata ){
    return polldata.features[0];
  },
  getID: function( poll ){
    return poll.attributes.Voting;
  },
  getName: function( poll ){
    return poll.attributes.Building.toLowerCase();
  },
  getLatLng: function( poll ){
    // [lat, lng]
    return [ poll.geometry.y, poll.geometry.x ];
  },
  getDetails: function( poll ){
    // optional String
    if(typeof poll.attributes.HPEntranceOnly != "undefined" && poll.attributes.HPEntranceOnly){
      return poll.attributes.HPEntranceOnly.toLowerCase();
    }
  }
};

// avoid console errors if missing
if(typeof console == "undefined" || typeof console.log == "undefined"){
  console = { log: function(){ } };
}

// set up Google Maps
google.maps.visualRefresh=true;
var mapOptions = {
  center: new google.maps.LatLng( 42.322953, -71.098622 ),
  zoom: 12,
  mapTypeId: google.maps.MapTypeId.ROADMAP,
  streetViewControl: false,
  mapTypeControl: false,
  zoomControlOptions: {
    style: google.maps.ZoomControlStyle.SMALL
  }
};
var map = new google.maps.Map( $("#map")[0], mapOptions);
var infoWindow = new google.maps.InfoWindow();

// tap to close info window
google.maps.event.addListener(map, "click", function(e){
  infoWindow.close();
});

// set up polling place info
var visiblePrecincts = [ ];
var selectMarker = null;
var pollMarkers = { };
var wardAndPrecinct = null;

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
var hasAsked = false;

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

  // if this browser cannot geolocate, hide button
  if(typeof navigator.geolocation == "undefined" || typeof navigator.geolocation.getCurrentPosition == "undefined"){
    $("#fromhere").css({ display: "none" });
  }
  
  // hide search button on iOS
  var userAgent = (navigator.userAgent + "").toLowerCase();
  if(userAgent.indexOf("iphone") > -1 || userAgent.indexOf("ipad") > -1 || userAgent.indexOf("ios") > -1){
    $(".ui-icon-searchfield").removeClass("ui-icon-searchfield");
    $("#addsearch")[0].type = "search";
    $("#addsearch").on('blur', searchAddress);
  }
});

function attachMarker(poll, pollMarker){
  google.maps.event.addListener(pollMarker, "click", function(e){
    // write and open popup; include all voting precincts
    var content = "<div class='nowrap'>" + pollingPlace.getName( poll ) + "</div>";
    
    infoWindow.setContent( content );
    infoWindow.open(map, pollMarker);
    
  });
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
  var features = precinct.getList( precinctData );
  
  if(features.length){
  
    // update infowindow
    var content = infoWindow.getContent();
  
    for(var f=0;f<features.length;f++){
      // add to info window
      if(f){
        content += ", ";
      }
      content += precinct.getName( features[f] );
      
      var pathList = precinct.getPolygon( features[f] );
      for(var r=0;r<pathList.length;r++){
        for(var c=0;c<pathList[r].length;c++){
          pathList[r][c] = new google.maps.LatLng( pathList[r][c][0] * 1.0, pathList[r][c][1] * 1.0 );
        }
      }
      
      var precinctPoly = new google.maps.Polygon({
        paths: pathList,
        strokeWeight: 1,
        strokeOpacity: 0.5,
        strokeColor: "#00f",
        geodesic: false,
        clickable: false,
        fillColor: "#3aaacf",
        fillOpacity: 0.4,
        map: map
      });

      visiblePrecincts.push( precinctPoly );
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
  var precinctURL = replaceAll( precinct.serviceUrl, "{{LNG}}", latlng.lng() );
  precinctURL = replaceAll( precinctURL, "{{LAT}}", latlng.lat() );
  s.src = precinctURL;
  $(document.body).append(s);
}

function showPrecinctAndPoll( precinctData ){
  mapPrecinctPolygons( precinctData );

  // retrieve precinct ward and precinct, coded WWPP
  wardAndPrecinct = precinct.getName( precinct.getList( precinctData )[0] );

  // look up polling place by precinct ID
  // this lookup table step is needed to connect a polling place to its precinct
  var precinctID = precinct.getID( precinct.getList( precinctData )[0] );
  var wardID = precinct.getWardID( precinct.getList( precinctData )[0] );

  // if possible, switch URL to this precinct
  // this means back button will refresh page
  if(typeof history != "undefined" && typeof history.pushState != "undefined"){
    history.pushState(null, null, "?p=" + precinctID);
	window.onpopstate = function(e) {
	  // hit back button -> go back to start
	  var t = new Date();
	  window.location = "index.html?start=" + Math.round(t * 0.001);
	};
  }

  var s = document.createElement("script");
  s.type = "text/javascript";
  if(typeof lookupTable != "undefined" && lookupTable){
    s.src = replaceAll( replaceAll( lookupTable.serviceUrl, "{{PRECINCTID}}", precinctID ), "{{WARDID}}", wardID );
  }
  else{
    s.src = replaceAll( pollingPlace.serviceUrl, "{{POLLINGPLACEID}}", precinctID );
  }
  $(document.body).append(s);
}

function showPollMarker( lookupData ){
  if(selectMarker){
    selectMarker.setMap(null);
    displayEntrance = null;
  }

  var pollingID = lookupTable.pollingPlaceId( lookupData );  
  if(typeof pollMarkers[ pollingID ] == "undefined"){
    var s = document.createElement("script");
    s.type = "text/javascript";
    s.src = replaceAll( pollingPlace.serviceUrl, "{{POLLINGPLACEID}}", pollingID);
    $(document.body).append(s);
  }
  else{
    showPoll( { features: [ pollMarkers[ pollingID ].poll ] } );
  }
}

function showPoll(polldata){ 
  console.log( polldata );
  var poll = pollingPlace.getFirst( polldata );
  var pollingID = pollingPlace.getID( poll );

  if(typeof pollMarkers[ pollingID ] == "undefined"){
    // place a marker if previously unknown
    var latlng = pollingPlace.getLatLng( poll );
    var pollMarker = new google.maps.Marker({
      position: new google.maps.LatLng( latlng[0] * 1.0, latlng[1] * 1.0 )
    });
    
    // display district and info when I click this polling place
    attachMarker(poll, pollMarker);
    
    // remember this marker
    pollMarkers[ pollingID ] = {
      marker: pollMarker,
      poll: poll
    };
  }

  var content = "<div class='nowrap'>" + pollingPlace.getName( poll ) + "</div>";

  // include precinct ward and precinct, coded WWPP
  content += "<div class='nowrap'>You Are: " + wardAndPrecinct + "</div>";

  var details = pollingPlace.getDetails( poll );
  if(details){
    content += details;
    $("#entrance").text( details ).css({
      display: "block"
    });
  }
  else{
    $("#entrance").css({
      display: "none"
    });
  }
  
  //content += "<br/><img width='250' height='250' src='http://maps.googleapis.com/maps/api/streetview?size=250x250&location=" + poll.attributes.FULLADD + "," + poll.attributes.CITY + "," + poll.attributes.STATE + "&fov=90&pitch=10&sensor=false'/><br/>";
  
  infoWindow.setContent( content );
  infoWindow.open( map, pollMarkers[ pollingID ].marker );

  selectMarker = pollMarkers[ pollingID ].marker;
  selectMarker.setMap(map);
  
  $("#moreinfo").css({ visibility: "visible" });
  
  if(directionsFrom){
    // show directions from stored point to the poll
    showDirections(directionsFrom, pollMarkers[ pollingID ].marker.getPosition() );
  }
}

function showDirections(startll, endll){
  mydestination = endll;
  
  if($("#moreinfo_screen").css("visibility") == "hidden"){
    $("#moreinfo_screen").css({ visibility: "visible" });
  }
  
  $("#officials-btn").css({ display: "block" });
  
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
      hasAsked = false;
      directionsDisplay.setDirections(result);
      startmarker = new google.maps.Marker({
        map: map,
        clickable: false,
        icon: 'http://mt.googleapis.com/vt/icon/name=icons/spotlight/spotlight-waypoint-a.png&text=%20&psize=16&font=fonts/Roboto-Regular.ttf&color=ff333333&ax=44&ay=48&scale=1',
        position: result.routes[0].legs[0].start_location
      });
      // if you click the start directions box, offer to reload the page
      // you can also refresh the page or press the back button
      setTimeout(function(){
        if(!hasAsked){
          $("#adp-placemark").click(function(e){
            var restart = confirm('Find polling place for another address?')
            if(restart){
              var d = new Date();
              window.location = "index.html?t=" + Math.round( d * 0.001 );
            }
          });
          hasAsked = true;
        }
      }, 500);
    }
  });
}

$("#restartsearch").click(function(e){
  var restart = confirm('Find polling place for another address?')
  if(restart){
    var d = new Date();
    window.location = "index.html?t=" + Math.round( d * 0.001 );
  }
});

function searchAddress(){
  // check that some text was submitted
  var searched = $("#addsearch").val();
  if(!searched.length){
    return;
  }
  
  // hide splash screen
  $('#splash_screen').css({ display: "none" });

  // if not specified, tell Google that this address is inside the city
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
  setTimeout(function(){
    var modes = $(".transitmode");
    for(var m=0;m<modes.length;m++){
      if(modes[m].checked && modes[m].value != myTravelMode){
        myTravelMode = modes[m].value;
        showDirections( directionsFrom, mydestination );
        return;
      }
    }
  }, 200);
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

function directionsWindow(){
  $("#moreinfo_screen").css({ display: "block" });
  if(typeof window.onpopstate != "undefined"){
    window.onpopstate = function(e){ };
  }
  $.mobile.changePage('#moreinfo_screen', 'pop', true, true);

  // make everything scrollable in a way that Android < 3 can handle
  $("html, body, #map, .ui-body, .ui-page").css({
    overflow: "visible"
  });
}

function hideDirectionsWindow(){
  $('#moreinfo_screen').css({ display: 'none' })
  // make everything un-scrollable so Android < 3 can work
  $("html, body, #map, .ui-body, .ui-page").css({
    overflow: "hidden"
  });
}

function showOfficialsWindow(){
  $('#show_my_officials').css({
    display: 'block',
    position: 'absolute',
    'background-color': '#fff',
    color: '#000',
    'z-index': 10,
    'font-family': 'arial',
    'text-shadow': 'none',
    visibility: 'visible'
  })
  // make everything scrollable in a way that Android < 3 can handle
  $("html, body, #map, .ui-body, .ui-page").css({
    overflow: "visible"
  });
  
  // load all officials
  var lng = mydestination.lng();
  var lat = mydestination.lat();

  var s = document.createElement('script');
  s.type="text/javascript";
  s.src = "http://maps.cityofboston.gov/ArcGIS/rest/services/PublicProperty/Precincts/MapServer/1/query?geometry=" + lng + "%2C" + lat + "&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&returnCountOnly=false&returnIdsOnly=false&returnGeometry=false&outFields=*&f=pjson&callback=loadCityCouncil";
  $(document.body).append(s);

  var s = document.createElement('script');
  s.type="text/javascript";
  s.src = "http://maps.cityofboston.gov/ArcGIS/rest/services/PublicProperty/Precincts/MapServer/2/query?geometry=" + lng + "%2C" + lat + "&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&returnCountOnly=false&returnIdsOnly=false&returnGeometry=false&outFields=*&f=pjson&callback=loadStateRepresentative";
  $(document.body).append(s);

  var s = document.createElement('script');
  s.type="text/javascript";
  s.src = "http://maps.cityofboston.gov/ArcGIS/rest/services/PublicProperty/Precincts/MapServer/3/query?geometry=" + lng + "%2C" + lat + "&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&returnCountOnly=false&returnIdsOnly=false&returnGeometry=false&outFields=*&f=pjson&callback=loadStateSenate";
  $(document.body).append(s);

  var s = document.createElement('script');
  s.type="text/javascript";
  s.src = "http://maps.cityofboston.gov/ArcGIS/rest/services/PublicProperty/Precincts/MapServer/4/query?geometry=" + lng + "%2C" + lat + "&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&returnCountOnly=false&returnIdsOnly=false&returnGeometry=false&outFields=*&f=pjson&callback=loadUSCongress";
  $(document.body).append(s);
}
function loadCityCouncil(electdata){
  $("#citycouncil").text( electdata.features[0].attributes.REPNAME + " -- District: " + electdata.features[0].attributes.NAME );
}
function loadStateRepresentative(electdata){
  $("#staterepresentative").text( electdata.features[0].attributes.REPNAME + " -- District: " + electdata.features[0].attributes.NAME );
}
function loadStateSenate(electdata){
  $("#statesenate").text( electdata.features[0].attributes.REPNAME + " -- District: " + electdata.features[0].attributes.NAME );
}
function loadUSCongress(electdata){
  $("#uscongress").text( electdata.features[0].attributes.REPNAME + " -- District: " + electdata.features[0].attributes.NAME );
}

function hideOfficialsWindow(){
  $('#show_my_officials').css({ display: 'none' })
  // make everything un-scrollable so Android < 3 can work
  $("html, body, #map, .ui-body, .ui-page").css({
    overflow: "hidden"
  });
}

function replaceAll(src, oldr, newr){
  while(src.indexOf(oldr) > -1){
    src = src.replace(oldr, newr);
  }
  return src;
}