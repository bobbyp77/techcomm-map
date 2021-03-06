var DATA_SERVICE_URL = 'https://script.google.com/macros/s/AKfycbx75GBiRRl9qUyNMCH-BtDbOc4-g0WZSgCnqhvi6YvhCxYpJ1kJ/exec?jsonp=?';
var TECHCOMM_MAP_URL = 'https://sarahmaddox.github.io/techcomm-map/';
// DEFAULT-CENTER is the default center of the map, used when first loading
// the map if there's no location specified in the URL.
// DEFAULT_ZOOM is the default zoom level for the map.
// AUTO_ZOOM is the level used when we automatically zoom into a place when
// the user selects a marker or searches for a place.
// userZoom holds the zoom value the user has chosen.
var DEFAULT_CENTER = {lat: 35.55, lng: 16.50};
var DEFAULT_ZOOM = 2;
var AUTO_ZOOM = 14;
var userZoom = DEFAULT_ZOOM;
var map;
var checkboxes = {};
var infoWindow;
// The markerClicked flag indicates whether an info window is open because the
// user clicked a marker. True means the user clicked a marker. False
// means the user simply hovered over the marker, or the user has closed the
// info window.
var markerClicked = false;
var previousName;

// This function is called after the page has loaded, to set up the map.
function initializeMap() {
  map = new google.maps.Map(document.getElementById("map-canvas"), {
    // Examine the URL parameters for a specified location and zoom.
    // If not present or if invalid, use defaults.
    center: validateLatLng($.urlParam('lat'), $.urlParam('lng')), 
    zoom: validateZoom($.urlParam('zoom')),
    mapTypeControlOptions: {
      position: google.maps.ControlPosition.TOP_RIGHT
    }
  });

  // Define an info window to show event data.
  infoWindow = new google.maps.InfoWindow({
    pixelOffset: new google.maps.Size(0, -10),
    disableAutoPan: true
  })
  setEventHandlers();
  // The techCommItemStyle() function computes how each item should be styled.
  // Register it here.
  map.data.setStyle(techCommItemStyle);

  // Add the search box and data type selectors to the UI.
  var input = /** @type {HTMLInputElement} */(
    document.getElementById('place-search'));

  var types = document.getElementById('type-selector');
  var branding = document.getElementById('branding');
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(branding);
  map.controls[google.maps.ControlPosition.LEFT_TOP].push(types);
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

  var autocomplete = new google.maps.places.Autocomplete(input);

  // When the user searches for and selects a place, zoom in and add a marker.
  var searchMarker = new google.maps.Marker({
    map: map,
    visible: false,
  });

  autocomplete.addListener('place_changed', function() {
    searchMarker.setVisible(false);
    var place = autocomplete.getPlace();
    if (!place.geometry) {
      return;
    }

    // If the place has a geometry, then show it on the map.
    if (place.geometry.viewport) {
      map.fitBounds(place.geometry.viewport);
    } else {
      map.setCenter(place.geometry.location);
      map.setZoom(AUTO_ZOOM);
    }
    searchMarker.setIcon(/** @type {google.maps.Icon} */({
      url: place.icon,
      size: new google.maps.Size(71, 71),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(17, 34),
      scaledSize: new google.maps.Size(35, 35)
    }));
    searchMarker.setPosition(place.geometry.location);
    searchMarker.setVisible(true);
  });

  // Get the data from the tech comm spreadsheet, using jQuery's ajax helper.
  $.ajax({
    url: DATA_SERVICE_URL,
    dataType: 'jsonp',
    success: function(data) {
      // Get the spreadsheet rows one by one.
      // First row contains headings, so start the index at 1 not 0.
      for (var i = 1; i < data.length; i++) {
        map.data.add({
          properties: {
            type: data[i][0],
            name: data[i][1],
            description: data[i][2],
            website: data[i][3],
            startdate: data[i][4],
            enddate: data[i][5],
            address: data[i][6]
          },
          geometry: {
            lat: data[i][7], 
            lng: data[i][8]
          }
        });
      }
    }
  });
}

// Returns the style that should be used to display the given feature.
function techCommItemStyle(feature) {
  var type = feature.getProperty('type');

  var style = {
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      fillOpacity: 1,
      strokeWeight: 3,
      scale: 10        
    },
    // Show the markers for this type if
    // the user has selected the corresponding checkbox.
    visible: (checkboxes[type] != false)
  };

  // Set the marker colour based on type of tech comm item.
  switch (type) {
    case 'Conference 2017':
      style.icon.fillColor = '#808080';
      style.icon.strokeColor = '#404040';
      break;
    case 'Conference 2018':
      style.icon.fillColor = '#c077f1';
      style.icon.strokeColor = '#a347e1';
      break;
    case 'Society':
      style.icon.fillColor = '#f6bb2e';
      style.icon.strokeColor = '#ee7b0c';
      break;
    case 'Group':
      style.icon.fillColor = '#ee4bf3';
      style.icon.strokeColor = '#ff00ff';
      break;
    case 'Business':
      style.icon.fillColor = '#1ab61a';
      style.icon.strokeColor = '#008000';
      break;
    case 'Course':
      style.icon.fillColor = '#017cff';
      style.icon.strokeColor = '#0000ff';
      break;
    default:
      style.icon.fillColor = '#01e2ff';
      style.icon.strokeColor = '#01c4ff';
  }
  return style;
}

function setEventHandlers() {
  // Show an info window when the user clicks an item.
  map.data.addListener('click', handleFeatureClick);

  // Show an info window when the mouse hovers over an item.
  map.data.addListener('mouseover', function(event) {
    createInfoWindow(event.feature);
    infoWindow.open(map);
  });

  // Close the info window when the mouse leaves an item.
  map.data.addListener('mouseout', function() {
    if (!markerClicked) {
      infoWindow.close();
    }
  });

  // Reset the click flag when the user closes the info window.
  infoWindow.addListener('closeclick', function() {
    markerClicked = false;
  });
}

// Create a popup window containing the tech comm info.
function createInfoWindow(feature) {
  infoWindow.setPosition(feature.getGeometry().get());
  infoWindow.setContent('No information found');

  var content = $('<div id="infowindow" class="infowindow">');
  
  content.append($('<h2>').text(feature.getProperty('name')));

  var typeAndWebsite = $('<p>');
  typeAndWebsite.append($('<em>').text(feature.getProperty('type')));
  // Add the website now, including a class that we'll use to wrap the div
  // in an HTML link later.
  if (feature.getProperty('website')) {
    typeAndWebsite.append($('<span>').text(' ('));
    typeAndWebsite.append($('<span class="link-site">')
        .text(feature.getProperty('website')));
    typeAndWebsite.append($('<span>').text(') '));
  }
  content.append(typeAndWebsite);

  content.append($('<p>').text(feature.getProperty('description')));
  
  if (feature.getProperty('startdate')) {
    var date = feature.getProperty('startdate');
    if (feature.getProperty('enddate')) {
      date += ' – ' + feature.getProperty('enddate');
    }
    content.append($('<p>').text(date));
  }

  content.append($('<p>').text(feature.getProperty('address')));

  // Offer the option to share a URL containing the location of the event.
  // Just add the div now, in preparation for adding the link later.
  content.append($('<p class="link-map">').text('Link to location on map'));

  // Add the content to the info window, and thus to the DOM.
  infoWindow.setContent(content.html());
  // Now that the DOM is ready, we can wrap an HTML link around the divs
  // that we want linked.
  // For the map link, get the latitude and longitude (geometry) object from
  // the event data then add a default zoom.
  var position = feature.getGeometry().get().toJSON();
  $.extend(position, {zoom: AUTO_ZOOM});
  // Put it all together into an HTML link.
  $('.link-map').wrap('<a href="' + TECHCOMM_MAP_URL +
      '?' + $.param(position) + '"></a>');
  if (feature.getProperty('website')) {
    $('.link-site').wrap('<a href="' + feature.getProperty('website') + '"></a>');
  }
}

// On click of marker, show the popup window and zoom in.
function handleFeatureClick(event) {
  // Check whether the marker has been clicked already,
  // because we want to zoom out on second click of same marker.
  var currentName = event.feature.getProperty('name');
  if (currentName == previousName) {
    // This is the second click, so zoom back to user's previous zoom level.
    map.setZoom(userZoom);
    // Reset flags ready for next time round.
    previousName = '';
    markerClicked = false;
  } else {
    previousName = event.feature.getProperty('name'); 
    // This is the first click, so show the popup window and zoom in.
    createInfoWindow(event.feature);

    // Zoom in before opening the info window.
    // If the user has already zoomed in beyond our automatic zoom,
    // leave their zoom setting untouched.
    if (map.getZoom() > AUTO_ZOOM) {
      userZoom = map.getZoom();
    } else {
      map.setZoom(AUTO_ZOOM);
      map.setCenter(event.feature.getGeometry().get());
      userZoom = DEFAULT_ZOOM;
    }

    // Open the info window and reset flag ready for next time round.
    infoWindow.open(map);
    markerClicked = true;
  }
}

// Respond to change in type selectors.
function handleCheckBoxClick(checkBox, type) {
  checkboxes[type] = checkBox.checked;
  // Tell the Data Layer to recompute the style, since checkboxes have changed.
  map.data.setStyle(techCommItemStyle);
}

// Get values from a URL parameter specified by name.
$.urlParam = function(name) {
    var results = new RegExp('[\?&]' + name +
        '=([^&#]*)').exec(window.location.href);
    if (results == null) {
       return null;
    }
    else {
       return decodeURI(results[1]) || 0;
    }
}

// Validate the zoom value.
function validateZoom(zoom) {
  if ((zoom == null) || isNaN(zoom) || (+zoom < 0)) {
    return DEFAULT_ZOOM;
  }
  else {
    return +zoom;
  }
}

// Validate the latitude and longitude values.
function validateLatLng(lat, lng) {
  if ((lat == null) || isNaN(lat) || (+lat < -90) || (+lat > 90)) {
    return DEFAULT_CENTER;
  }

  if ((lng == null) || isNaN(lng) || (+lng < -180) || (+lng > 180)) {
    return DEFAULT_CENTER;
  }

  var center = {lat: +lat, lng: +lng};
  return center;
}
