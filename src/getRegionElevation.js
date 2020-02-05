import { MAPBOX_TOKEN } from "./config";
import indexPolygon from "./lib/indexPolygon";

const apiURL = `https://api.mapbox.com/v4/mapbox.terrain-rgb/zoom/tLong/tLat@2x.pngraw?access_token=${MAPBOX_TOKEN}`;
let imageCache = new Map();

export default function getRegionElevation(map, appState, doneCallback) {
  const progress = appState.renderProgress || {};

  const {tileSize, tileZoom} = map.transform;
  const zoomPower = Math.pow(2, tileZoom);

  const coveringTiles = map.transform.coveringTiles({
    minzoom: tileZoom,
    maxzoom: tileZoom,
    tileSize
  });

  const tileBounds = getTilesBounds(coveringTiles);
  const widthInTiles = tileBounds.maxX - tileBounds.minX;
  const heightInTiles = tileBounds.maxY - tileBounds.minY;
  if (widthInTiles > 50 || heightInTiles > 50) throw new Error('Too many tiles requested. How did you do it?');
  let windowHeight = window.innerHeight;

  if (!map.transform.angle && !map.transform.bearing) {
    // give a little bit of buffer at the bottom if possible
    let se = map.getBounds().getSouthEast();
    se.lat = tile2lat(tileBounds.maxY + 1, zoomPower);
    windowHeight = Math.floor(map.project(se).y);
  }

  const canvas = document.createElement("canvas");
  canvas.width = (widthInTiles + 1) * tileSize;
  canvas.height = (heightInTiles + 1) * tileSize;

  const ctx = canvas.getContext('2d');

  const minX = tileBounds.minX;
  const minY = tileBounds.minY;

  progress.total = coveringTiles.length;

  advanceProgress();

  let heightsHandle;
  let isCancelled = false;
  const tilesToLoad = coveringTiles.map(toLoadedTile);

  Promise.all(tilesToLoad)
    .then(computeVisibleHeights)
    .then(createAPI)
    .then(api => {
      if (!isCancelled) {
        doneCallback(api)
      }
    });

  return {
    cancel() {
      isCancelled = true;
      cancelAnimationFrame(heightsHandle);
    }
  }

  function createAPI(visibleHeights) {
    let width = visibleHeights.windowWidth;
    let allHeights = visibleHeights.allHeights;

    return {
      getHeightAtPoint,
      windowHeight,
      getAllHeightData() {
        return visibleHeights;
      }
    };

    function getHeightAtPoint(x, y) {
      return allHeights[x + y * width];
    }
  }

  function computeVisibleHeights() {
    progress.message = 'Computing elevation lines...';

    const canvasWidth = canvas.width;
    const data = ctx.getImageData(0, 0, canvasWidth, canvas.height).data;
    const windowWidth = window.innerWidth;
    let allHeights = new Float32Array(windowWidth * windowHeight);
    let done;

    let timeQuota = 16;
    let minHeight = Infinity;
    let maxHeight = -Infinity;
    let rowWithHighestPoint = -1;
    let lastY = 0;

    let insideMask = indexPolygon(appState.bounds);
    heightsHandle = requestAnimationFrame(collectHeights); // todo let it be cancelled;

    return new Promise((resolve) => { done = resolve });

    function collectHeights() {
      let startTime = window.performance.now();
      let rowsProcessed = 0;

      for (let y = lastY; y < windowHeight; ++y) {
        for (let x = 0; x < windowWidth; ++x) {
          const index = y * windowWidth + x;
          const height = getHeight(x, y, insideMask);
          allHeights[index] = height;
          if (height < minHeight) minHeight = height;
          if (height > maxHeight) {
            maxHeight = height;
            rowWithHighestPoint = y;
          }
        }
        rowsProcessed += 1;
        let elapsed = window.performance.now() - startTime;
        if (elapsed > timeQuota && rowsProcessed > 3) {
          if (!isCancelled) heightsHandle = requestAnimationFrame(collectHeights);
          progress.message = 'Computing elevation lines... ' + Math.round(100 * y/windowHeight) + '%';
          return;
        }
        lastY = y;
      }

      done({
        minHeight, maxHeight, 
        rowWithHighestPoint, 
        allHeights,
        windowWidth,
        windowHeight
      });
    }

    function getHeight(x, y, insideMask) {
      let lngLat = map.transform.pointLocation({x, y})
      if (!insideMask([lngLat.lng, lngLat.lat])) return -20;

      let xTile = lng2tile(lngLat.lng, zoomPower);
      let xOffset = (xTile - minX) * tileSize;
      let yTile = lat2tile(lngLat.lat, zoomPower);
      let yOffset = (yTile - minY) * tileSize;
      let yC = Math.round(yOffset);
      let xC = Math.round(xOffset);

      let index = (yC * canvasWidth + xC) * 4;
      let R = data[index + 0];
      let G = data[index + 1];
      let B = data[index + 2];

      return decodeHeight(R, G, B)
    }

    function decodeHeight(R, G, B) {
      let height = -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1)
      if (height < -100) {
        // Fiji islands data has huge caves, which pushes the entire thing up.
        // I'm reducing it.
        height = height / 5000;
      }
      return height;
    }
  }

  function toLoadedTile(tile) {
    const request = getRequestForTile(tile);

    return loadImage(request.url)
      .then(drawTileImage)
      .catch(drawBlankTile)
      .finally(advanceProgress);

    function drawTileImage(image) {
      ctx.drawImage(image, request.x, request.y);
    }

    function drawBlankTile() {
      ctx.beginPath();
      ctx.fillStyle = '#0186a0'; // zero height
      ctx.fillRect(request.x, request.y, tileSize, tileSize);
    }
  }

  function getRequestForTile(tile) {
    const p = tile.canonical;
    const url = apiURL
      .replace('zoom', p.z)
      .replace('tLat', p.y)
      .replace('tLong', p.x);

    return {
      url,
      x: tileSize * (p.x - tileBounds.minX), 
      y: tileSize * (p.y - tileBounds.minY)
    }
  }

  function advanceProgress() {
    if (progress.completed === undefined) {
      progress.completed = -1;
    }
    progress.completed = Math.min(progress.total, progress.completed + 1);
    progress.message = `Downloading tiles: ${progress.completed} of ${progress.total}...`
  }
  
}

function lng2tile(l, zoomPower) {
  let result = ((l + 180) / 360) * zoomPower;
  return result;
}

function lat2tile(l, zoomPower) {
  let angle = l * Math.PI / 180;
  return (
    ((1 - Math.log( Math.tan(angle) + 1 / Math.cos(angle)) /
        Math.PI) /
      2) * zoomPower 
  );
}

function tile2lat(y, zoomPower) {
  let n = Math.PI - 2 * Math.PI * y / zoomPower;
  return 180 / Math.PI * Math.atan(0.5*(Math.exp(n)-Math.exp(-n)));
}

function loadImage(url) {
  let cachedImage = imageCache.get(url);
  if (!cachedImage) {
    cachedImage = new Promise((resolve, error) => {
      const img = new Image();
      img.onload = () => {
        resolve(img);
      };
      img.onerror = error;
      img.crossOrigin = "anonymous";
      img.src = url;
    });
    imageCache.set(url, cachedImage);
  }

  return cachedImage;
}

function getTilesBounds(tiles) {
  return tiles.reduce((bounds, tile) => {
    let p = tile.canonical;
    if (bounds.minX > p.x) bounds.minX = p.x;
    if (bounds.minY > p.y) bounds.minY = p.y;
    if (bounds.maxX < p.x) bounds.maxX = p.x;
    if (bounds.maxY < p.y) bounds.maxY = p.y;

    return bounds;
  }, {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity
  })
}
