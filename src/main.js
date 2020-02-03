/**
 * This is the website startup point.
 */
import appState from "./appState";
import mapboxgl from "mapbox-gl";
import createHeightMapRenderer from "./lib/createHeightMapRenderer";
import { MAPBOX_TOKEN } from "./config";
import getRegionElevation from './getRegionElevation';

var MapboxGeocoder = require("@mapbox/mapbox-gl-geocoder");
window.addEventListener('error', logError);

// Load vue asyncronously
require.ensure("@/vueApp.js", () => {
  require("@/vueApp.js");
});

// Hold a reference to mapboxgl instance.
let map;
let heightMapRenderer;
let regionBuilder;
// Let the vue know what to call to start the app.
appState.init = init;
appState.redraw = redraw;
appState.updateMap = updateMap;
appState.exportToSVG = exportToSVG;

function init() {
  mapboxgl.accessToken = MAPBOX_TOKEN;

  window.map = map = new mapboxgl.Map({
    trackResize: true,
    container: "map",
    minZoom: 0,
    style: "mapbox://styles/mapbox/light-v10",
    center: [-122.574, 47.727],
    zoom: 7.68,
    hash: true
  });

  map.addControl(
    new mapboxgl.NavigationControl({ showCompass: false }),
    "bottom-right"
  );
  map.addControl(new MapboxGeocoder({ accessToken: mapboxgl.accessToken }));
  map.on('moveend', function() {
    map.once('idle', updateMap)
  });
  map.on("movestart", hideHeights);
  map.on("load", function() {
    appState.angle = map.getBearing();
    // map.showTileBoundaries = true;
  });

  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();
}

function hideHeights() {
  appState.zazzleLink = null;
  let canvas = document.querySelector(".height-map");
  if (canvas) canvas.style.opacity = 0.02;
}

function redraw() {
  if (!heightMapRenderer) return;
  heightMapRenderer.cancel();
  heightMapRenderer.render();
}

function exportToSVG() {
  if (!heightMapRenderer) return;
  return heightMapRenderer.render(true);
}

function updateMap() {
  if (!map) return;

  let heightMapCanvas = document.querySelector(".height-map");
  if (!heightMapCanvas) return;

  if (heightMapRenderer) {
    heightMapRenderer.cancel();
  }
  if (regionBuilder) {
    regionBuilder.cancel();
  }

  if (!appState.shouldDraw) {
    heightMapCanvas.style.display = "none";
    return;
  } else {
    heightMapCanvas.style.display = "";
  }
  
  appState.renderProgress = {
    message: '',
    isCancelled: false,
    completed: false
  };

  // This will fetch all heightmap tiles
  regionBuilder = getRegionElevation(map, appState.renderProgress, showRegionHeights)

  function showRegionHeights(regionInfo) {
    heightMapRenderer = createHeightMapRenderer(appState, regionInfo, heightMapCanvas);
  }
}


function logError(e) {
  if (typeof ga !== 'function') return;

  const exDescription = e ? `${e.message} in ${e.filename}:${e.lineno}` : 'Unknown exception';

  ga('send', 'exception', {
    exDescription,
    exFatal: false
  });
}