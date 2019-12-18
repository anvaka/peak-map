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
    //   style: {
    //     "version": 8,
    //     "name": "Hillshade-only",
    //     "center": [-112.81596278901452, 37.251160384573595],
    //     "zoom": 11.560975632435424,
    //     "bearing": 0,
    //     "pitch": 0,
    //     "sources": {
    //         "mapbox://mapbox.terrain-rgb": {
    //             "url": "mapbox://mapbox.terrain-rgb",
    //             "type": "raster-dem",
    //             "tileSize": 256
    //         }
    //     },
    //     "layers": [
    //         {
    //             "id": "mapbox-terrain-rgb",
    //             "type": "hillshade",
    //             "source": "mapbox://mapbox.terrain-rgb",
    //             "layout": {},
    //             "paint": {}
    //         }
    //     ]
    // },
      
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
  map.on('load', updateHeights);

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
