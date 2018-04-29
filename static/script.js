/**
 * @fileoverview Runs the Cloud Frequency application. The code is executed in the
 * user's browser. It communicates with the App Engine backend, renders output
 * to the screen, and handles user interactions.
 */


cloudfrequency = {};  // Our namespace.


/**
 * Starts the Cloud Frequency application. The main entry point for the app.
 * @param {string} eeMapId The Earth Engine map ID.
 * @param {string} eeToken The Earth Engine map token.
 * @param {string} serializedPolygonIds A serialized array of the IDs of the
 *     polygons to show on the map. For example: "['poland', 'moldova']".
 */
cloudfrequency.boot = function(eeMapId, eeToken, serializedPolygonIds) {
  // Load external libraries.
  google.load('visualization', '1.0');
  google.load('jquery', '1');
  google.load('maps', '3', {other_params:'libraries=places'});



  // Create the Trendy Lights app.
  google.setOnLoadCallback(function() {
    var mapType = cloudfrequency.App.getEeMapType(eeMapId, eeToken);
    var app = new cloudfrequency.App(mapType, JSON.parse(serializedPolygonIds));
  });
};


///////////////////////////////////////////////////////////////////////////////
//                               The application.                            //
///////////////////////////////////////////////////////////////////////////////



/**
 * The main Cloud Frequency application.
 * This constructor renders the UI and sets up event handling.
 * @param {google.maps.ImageMapType} mapType The map type to render on the map.
 * @param {Array<string>} polygonIds The IDs of the polygons to show on the map.
 *     For example ['poland', 'moldova'].
 * @constructor
 */
cloudfrequency.App = function(mapType, polygonIds) {
  // Create and display the map.
  this.map = this.createMap(mapType);
  cloudfrequency.map = this.map;

  // Register a click handler to show a panel when the user clicks on a place.
  google.maps.event.addListener(cloudfrequency.map, 'click', this.handleClick);

  var markers = [];

    // Create the search box and link it to the UI element.
  var input = /** @type {HTMLInputElement} */(
      document.getElementById('pac-input'));
  cloudfrequency.map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

  var searchBox = new google.maps.places.SearchBox(
    /** @type {HTMLInputElement} */(input));

  // Listen for the event fired when the user selects an item from the
  // pick list. Retrieve the matching places for that item.
  google.maps.event.addListener(searchBox, 'places_changed', function() {
    var places = searchBox.getPlaces();

    if (places.length == 0) {
      return;
    }
    for (var i = 0, marker; marker = markers[i]; i++) {
      marker.setMap(null);
    }

    // For each place, get the icon, place name, and location.
    markers = [];
    var bounds = new google.maps.LatLngBounds();
    for (var i = 0, place; place = places[i]; i++) {
      var image = {
        url: place.icon,
        size: new google.maps.Size(71, 71),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(17, 34),
        scaledSize: new google.maps.Size(25, 25)
      };

      // Create a marker for each place.
      var marker = new google.maps.Marker({
        map: cloudfrequency.map,
        icon: image,
        title: place.name,
        position: place.geometry.location
      });

      markers.push(marker);

      bounds.extend(place.geometry.location);
    }

    cloudfrequency.map.fitBounds(bounds);
  });

  // Bias the SearchBox results towards places that are within the bounds of the
  // current map's viewport.
  google.maps.event.addListener(cloudfrequency.map, 'bounds_changed', function() {
    var bounds = cloudfrequency.map.getBounds();
    searchBox.setBounds(bounds);
  });

  function deselect(e) {
  $('.pop').slideFadeToggle(function() {
    e.removeClass('selected');
  });
}

$(function() {
  $('#info').on('click', function() {
    if($(this).hasClass('selected')) {
      deselect($(this));
    } else {
      $(this).addClass('selected');
      $('.pop').slideFadeToggle();
    }
    return false;
  });

  $('.close').on('click', function() {
    deselect($('#info'));
    return false;
  });
});

$.fn.slideFadeToggle = function(easing, callback) {
  return this.animate({ opacity: 'toggle', height: 'toggle' }, 'fast', easing, callback);
};


  // Register a click handler to hide the panel when the user clicks close.
  $('.panel .close').click(this.hidePanel.bind(this));

  // Register a click handler to expand the panel when the user taps on toggle.
  $('.panel .toggler').click((function() {
    $('.panel').toggleClass('expanded');
  }).bind(this));
};

cloudfrequency.App.prototype.handleClick = function(event) {
  var lat = event.latLng.lat();
  var lon = event.latLng.lng();
  var url = '/details?lat=' + lat + '&lon=' + lon;
  console.log(url);
  $.get(url).done((function(data) {
    console.log(data.state_1km_mean)


    var infowindow = new google.maps.InfoWindow({
      content: String(Number(data.state_1km_mean).toFixed(0))+"%"
    });

    var myLatlng = new google.maps.LatLng(lat,lon);

    infowindow.setPosition(myLatlng);
    infowindow.open(cloudfrequency.map);

  }).bind(this));

  // $.get(url, function( data ) {
  //   alert( "Load was performed." );
  // });

  // $.get(url).done((function(data) {
  //   if (data['error']) {
  //     $('.panel .error').show().html(data['error']);
  //   } else {
  //     $('.panel .wiki-url').show().attr('href', data['wikiUrl']);
  //     this.showChart(data['timeSeries']);
  //   }
  // }).bind(this));
};


/**
 * Creates a Google Map with a black background the given map type rendered.
 * The map is anchored to the DOM element with the CSS class 'map'.
 * @param {google.maps.ImageMapType} mapType The map type to include on the map.
 * @return {google.maps.Map} A map instance with the map type rendered.
 */
cloudfrequency.App.prototype.createMap = function(mapType) {
  var mapOptions = {
    backgroundColor: '#000000',
    center: cloudfrequency.App.DEFAULT_CENTER,
    //disableDefaultUI: true,
    streetViewControl: false,
    mapTypeControl: false,
    maxZoom: 10,
    zoom: cloudfrequency.App.DEFAULT_ZOOM
  };
  var mapEl = $('.map').get(0);
  var map = new google.maps.Map(mapEl, mapOptions);
  //map.setOptions({styles: cloudfrequency.App.BLACK_BASE_MAP_STYLES});
  map.overlayMapTypes.push(mapType);



  return map;
};


/**
 * Adds the polygons with the passed-in IDs to the map.
 * @param {Array<string>} polygonIds The IDs of the polygons to show on the map.
 *     For example ['poland', 'moldova'].
 */
cloudfrequency.App.prototype.addPolygons = function(polygonIds) {
  polygonIds.forEach((function(polygonId) {
    this.map.data.loadGeoJson('static/polygons/' + polygonId + '.json');
  }).bind(this));
  this.map.data.setStyle(function(feature) {
    return {
      fillColor: 'white',
      strokeColor: 'white',
      strokeWeight: 3
    };
  });
};


/**
 * Handles a on click a polygon. Highlights the polygon and shows details about
 * it in a panel.
 * @param {Object} event The event object, which contains details about the
 *     polygon clicked.
 */
cloudfrequency.App.prototype.handlePolygonClick = function(event) {
  this.clear();
  var feature = event.feature;

  // Instantly higlight the polygon and show the title of the polygon.
  this.map.data.overrideStyle(feature, {strokeWeight: 8});
  var title = feature.getProperty('title');
  $('.panel').show();
  $('.panel .title').show().text(title);

  // Asynchronously load and show details about the polygon.
  var id = feature.getProperty('id');
  $.get('/details?polygon_id=' + id).done((function(data) {
    if (data['error']) {
      $('.panel .error').show().html(data['error']);
    } else {
      $('.panel .wiki-url').show().attr('href', data['wikiUrl']);
      this.showChart(data['timeSeries']);
    }
  }).bind(this));
};


/** Clears the details panel and selected polygon. */
cloudfrequency.App.prototype.clear = function() {
  $('.panel .title').empty().hide();
  $('.panel .wiki-url').hide().attr('href', '');
  $('.panel .chart').empty().hide();
  $('.panel .error').empty().hide();
  $('.panel').hide();
  this.map.data.revertStyle();
};


/** Hides the details panel. */
cloudfrequency.App.prototype.hidePanel = function() {
  $('.panel').hide();
  this.clear();
};


/**
 * Shows a chart with the given timeseries.
 * @param {Array<Array<number>>} timeseries The timeseries data
 *     to plot in the chart.
 */
cloudfrequency.App.prototype.showChart = function(timeseries) {
  timeseries.forEach(function(point) {
    point[0] = new Date(parseInt(point[0], 10));
  });
  var data = new google.visualization.DataTable();
  data.addColumn('date');
  data.addColumn('number');
  data.addRows(timeseries);
  var wrapper = new google.visualization.ChartWrapper({
    chartType: 'LineChart',
    dataTable: data,
    options: {
      title: 'Brightness over time',
      curveType: 'function',
      legend: {position: 'none'},
      titleTextStyle: {fontName: 'Roboto'}
    }
  });
  $('.panel .chart').show();
  var chartEl = $('.chart').get(0);
  wrapper.setContainerId(chartEl);
  wrapper.draw();
};


///////////////////////////////////////////////////////////////////////////////
//                        Static helpers and constants.                      //
///////////////////////////////////////////////////////////////////////////////


/**
 * Generates a Google Maps map type (or layer) for the passed-in EE map id. See:
 * https://developers.google.com/maps/documentation/javascript/maptypes#ImageMapTypes
 * @param {string} eeMapId The Earth Engine map ID.
 * @param {string} eeToken The Earth Engine map token.
 * @return {google.maps.ImageMapType} A Google Maps ImageMapType object for the
 *     EE map with the given ID and token.
 */
cloudfrequency.App.getEeMapType = function(eeMapId, eeToken) {
  var eeMapOptions = {
    getTileUrl: function(tile, zoom) {
      var url = cloudfrequency.App.EE_URL + '/map/';
      url += [eeMapId, zoom, tile.x, tile.y].join('/');
      url += '?token=' + eeToken;
      return url;
    },
    tileSize: new google.maps.Size(256, 256),
    opacity: 0.7
  };
  return new google.maps.ImageMapType(eeMapOptions);
};


/** @type {string} The Earth Engine API URL. */
cloudfrequency.App.EE_URL = 'https://earthengine.googleapis.com';


/** @type {number} The default zoom level for the map. */
cloudfrequency.App.DEFAULT_ZOOM = 4;


/** @type {Object} The default center of the map. */
cloudfrequency.App.DEFAULT_CENTER = {lng: 5, lat: 50};


/**
 * @type {Array} An array of Google Map styles. See:
 *     https://developers.google.com/maps/documentation/javascript/styling
 */
cloudfrequency.App.BLACK_BASE_MAP_STYLES = [
  {stylers: [{lightness: -100}]},
  {
    featureType: 'road',
    elementType: 'labels',
    stylers: [{visibility: 'off'}]
  }
];
