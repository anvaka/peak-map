import { MAPBOX_TOKEN } from "./config";
import indexPolygon from "./lib/indexPolygon";

const apiURL = `https://api.mapbox.com/v4/mapbox.terrain-rgb/zoom/tLong/tLat@2x.pngraw?access_token=${MAPBOX_TOKEN}`;
let imageCache = new Map();

export default function getRegionElevation(map, progress, doneCallback) {
  if (!progress) progress = {};

  const renderHD = true;

  const tileSize = renderHD ? 512 : 256;
  const tileZoom = map.transform.tileZoom;
  const zoomPower = Math.pow(2, tileZoom);

  const coveringTiles = map.transform.coveringTiles({
    minzoom: tileZoom,
    maxzoom: tileZoom,
    tileSize
  });

  const tileBounds = getTilesBounds(coveringTiles);

  const canvas = document.createElement("canvas");
  const width = tileBounds.maxX - tileBounds.minX;
  const height = tileBounds.maxY - tileBounds.minY;
  if (width > 50 || height > 50) throw new Error('Too many tiles requested. How did you do it?');

  canvas.width = width * tileSize + tileSize;
  canvas.height = height * tileSize + tileSize;
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
    let data = visibleHeights.allHeights;

    return {
      getHeightAtPoint,
      getAllHeightData() {
        return visibleHeights;
      }
    };

    function getHeightAtPoint(x, y) {
      return data[x + y * width];
    }
  }

  function computeVisibleHeights() {
    const canvasWidth = canvas.width;
    const data = ctx.getImageData(0, 0, canvasWidth, canvas.height).data;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    let allHeights = new Float32Array(windowWidth * windowHeight);
    let done;

    let timeQuota = 16;
    let minHeight = Infinity;
    let maxHeight = -Infinity;
    let rowWithHighestPoint = -1;
    let lastY = 0;

    // // https://nominatim.openstreetmap.org/search.php?q=Canada&polygon_geojson=1&format=json
    // let geoResponse = require('./lib/fakeResponse.json')[0];
    let insideMask = indexPolygon(/* geoResponse */);
    heightsHandle = requestAnimationFrame(collectHeights); // todo let it be cancelled;

    return new Promise((resolve) => { done = resolve });

    function collectHeights() {
      let startTime = window.performance.now();

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
        let elapsed = window.performance.now() - startTime;
        if (elapsed > timeQuota) {
          if (!isCancelled) heightsHandle = requestAnimationFrame(collectHeights);
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
      if (!insideMask([lngLat.lng, lngLat.lat])) return -100;

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
