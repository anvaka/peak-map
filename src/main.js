/**
 * This is the website startup point.
 */
import appState from "./appState";
import mapboxgl from "mapbox-gl";
import createHeightMapRenderer from "./lib/createHeightMapRenderer";
import { MAPBOX_TOKEN } from "./config";

var MapboxGeocoder = require("@mapbox/mapbox-gl-geocoder");

// Load vue asyncronously
require.ensure("@/vueApp.js", () => {
  require("@/vueApp.js");
});

// Hold a reference to mapboxgl instance.
let map;

let heightMapRenderer;

// Let the vue know what to call to start the app.
appState.init = init;
appState.redraw = updateHeights;

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
  map.on("zoomstart", hideHeights);
  map.on("zoomend", updateHeights);
  map.on("dragstart", hideHeights);
  map.on("dragend", updateHeights);
  map.on("load", function() {
    // I was considering using native layers, to fetch the coordinates,
    // but my understanding of mapbox is not deep enough to do it yet.

    // map.showTileBoundaries = true;
    // map.addSource("dem", {
    //   type: "raster-dem",
    //   url: "mapbox://mapbox.terrain-rgb",
    //   tileSize: 512
    // });
    // map.addLayer(
    //   {
    //     id: "hillshading",
    //     type: "hillshade",
    //     source: "dem"
    //   },
    //   "land"
    // );
    // map.addLayer(
    //   {
    //     visibility: "none",
    //     id: "hillshading",
    //     type: "hillshade",
    //     source: "dem"
    //   },
    //   "water-shadow"
    // );

    updateHeights();
  });

  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();
}

function hideHeights() {
  appState.zazzleLink = null;
  let canvas = document.querySelector(".height-map");
  if (canvas) canvas.style.opacity = 0.02;
}

function updateHeights() {
  if (!map) return;
  map.resize();

  let heightMapCanvas = document.querySelector(".height-map");
  if (!heightMapCanvas) return;

  if (!appState.shouldDraw) {
    heightMapCanvas.style.display = "none";
    return;
  } else {
    heightMapCanvas.style.display = "";
  }

  if (heightMapRenderer) {
    heightMapRenderer.cancel();
  }


  heightMapRenderer = createHeightMapRenderer(appState, map, heightMapCanvas);
  heightMapRenderer.render();
}
