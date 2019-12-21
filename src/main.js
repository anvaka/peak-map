/**
 * This is the website startup point.
 */
import appState from './appState';
import bus from './bus';
import mapboxgl from 'mapbox-gl';
import createHeightMapRenderer from './lib/createHeightMapRenderer';
import { MAPBOX_TOKEN } from './config';

var MapboxGeocoder = require('@mapbox/mapbox-gl-geocoder');

// Load vue asyncronously
require.ensure('@/vueApp.js', () => {
  require('@/vueApp.js');
});

// Hold a reference to mapboxgl instance.
let map;
// This will hold a reference to a function which cancels current download
let cancelDownload;
let heightMapRenderer;

// Let the vue know what to call to start the app.
appState.init = init;
appState.redraw = updateHeights;

function init() {
  // TODO: Do I need to hide this?
  mapboxgl.accessToken = MAPBOX_TOKEN;

  map = new mapboxgl.Map({
      trackResize: true,
      container: 'map',
      minZoom: 0,
      style: 'mapbox://styles/mapbox/light-v10',
      center: [-122.574,47.727],
      zoom: 7.68,
      hash: true
  });

  map.addControl(new mapboxgl.NavigationControl({showCompass: false}), 'bottom-right');
  map.addControl(new MapboxGeocoder({accessToken: mapboxgl.accessToken}));
  map.on('zoomstart', hideHeights);
  map.on('zoomend', updateHeights);
  map.on('dragstart', hideHeights);
  map.on('dragend', updateHeights);
  map.on('load', function() {
    // map.showTileBoundaries = true;
    // map.addSource('dem', {
    //     'type': 'raster-dem',
    //     'url': 'mapbox://mapbox.terrain-rgb',
    //     tileSize: 256*2
    // });
    // map.addLayer({
    //   id: 'hillshading',
    //   type: 'hillshade',
    //   source: 'dem',
    // }, 'water-shadow');
  
    updateHeights();
  });

  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();

  bus.on('download-all-roads', updateHeights);
  bus.on('cancel-download-all-roads', () => {
    if (cancelDownload) cancelDownload();
  });
}

function hideHeights() {
  appState.zazzleLink = null;
  let canvas = document.querySelector('.height-map');
  if (canvas) canvas.style.opacity = 0.02;
}

function updateHeights() {
  if (!map) return;
  let heightMapCanvas = document.querySelector('.height-map');
  if (!heightMapCanvas) return;

  if (!appState.shouldDraw) {
    heightMapCanvas.style.display = 'none';
    return;
  } else {
    heightMapCanvas.style.display = '';
  }

  if (heightMapRenderer){
    heightMapRenderer.cancel();
  }

  map.resize();

  heightMapRenderer = createHeightMapRenderer(appState, map, heightMapCanvas);
  heightMapRenderer.render();
}
