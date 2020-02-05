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
let isListening = false;
// Let the vue know what to call to start the app.
appState.init = init;
appState.redraw = redraw;
appState.updateMap = updateMap;
appState.exportToSVG = exportToSVG;
appState.setBounds = setBounds;
appState.listenToEvents = listenToEvents;

function init() {
  updateSizes();

  mapboxgl.accessToken = MAPBOX_TOKEN;

  window.map = map = new mapboxgl.Map({
    trackResize: false,
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
  listenToEvents(true);

  map.on("load", function() {
    appState.angle = map.getBearing();
  });

  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();
}

function listenToEvents(newIsListening) {
  if (newIsListening) {
    if (!isListening) {
      map.on('moveend', updateMapWhenIdle);
      map.on('movestart', hideHeights);
    }
    isListening = true;
  } else {
    map.off('moveend', updateMapWhenIdle);
    map.off('movestart', hideHeights);
  }
}

function updateMapWhenIdle() {
  map.once('idle', updateMap)
}

function hideHeights() {
  appState.zazzleLink = null;
  let canvas = getHeightMapCanvas();
  if (canvas) canvas.style.opacity = 0.02;
}

function redraw() {
  if (!heightMapRenderer) return;

  ensureSizeIsUpdated();
  heightMapRenderer.cancel();
  heightMapRenderer.render();
}

function exportToSVG(settings) {
  if (!heightMapRenderer) return;
  return heightMapRenderer.render(Object.assign({
    svg: true,
  }, settings));
}

function updateMap() {
  if (!map) return;

  let heightMapCanvas = getHeightMapCanvas();
  if (!heightMapCanvas) return;

  ensureSizeIsUpdated();

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
  regionBuilder = getRegionElevation(map, appState,  showRegionHeights)

  function showRegionHeights(regionInfo) {
    heightMapRenderer = createHeightMapRenderer(appState, regionInfo, heightMapCanvas);
  }
}

function setBounds(bounds) {
  appState.bounds = bounds;
  if (bounds) {
    appState.selectedBoundShortName = bounds.display_name;
    appState.mapName = (bounds.display_name || '').split(',')[0]
    const bbox = bounds.boundingbox;

    map.fitBounds([[bbox[2], bbox[1]], [bbox[3], bbox[0]]], {
      animate: false,
      padding: {
        top: 42,
        bottom: 0,
        left: 0,
        right: 0
      }
    })
  } else {
    appState.selectedBoundShortName = null;
    appState.mapName = '';
  }
  updateMap();
}

function ensureSizeIsUpdated() {
  if (!appState.sizeDirty) return;
  appState.sizeDirty = false;
  updateSizes();
}

function updateSizes() {
  let dimensions = getCanvasDimensions();
  let mapContainer = getMapContainer();
  if (mapContainer) {
    mapContainer.style.left = px(dimensions.left);
    mapContainer.style.top = px(dimensions.top);
    mapContainer.style.width = px(dimensions.width);
    mapContainer.style.height = px(dimensions.height);
  }
  if (map) {
    map.resize();
  }

  const heightMapCanvas = getHeightMapCanvas();
  if (heightMapCanvas) {
    heightMapCanvas.width = dimensions.width;
    heightMapCanvas.height = dimensions.height;
    heightMapCanvas.style.left = px(dimensions.left);
    heightMapCanvas.style.top = px(dimensions.top);
    heightMapCanvas.style.width = px(dimensions.width);
    heightMapCanvas.style.height = px(dimensions.height);
  }

  appState.sizeDirty = false;
}

function getHeightMapCanvas() {
  return document.querySelector('.height-map')
}
function getMapContainer() {
  return document.querySelector('#map');
}

function getCanvasDimensions() {
  return {
    left: 0,
    top: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  };
}



function logError(e) {
  if (typeof ga !== 'function') return;

  const exDescription = e ? `${e.message} in ${e.filename}:${e.lineno}` : 'Unknown exception';

  ga('send', 'exception', {
    exDescription,
    exFatal: false
  });
}

function px(x) {
  return x + 'px';
}