import { MAPBOX_TOKEN } from "./config";

export function loadImage(url) {
  return new Promise((accept, error) => {
    const img = new Image();
    img.onload = () => {
      accept(img);
    };
    img.onerror = error;
    img.crossOrigin = "anonymous";
    img.src = url;
  });
}

export function getRegion(ne, sw, zoom, progress) {
  if (!progress) progress = {};

  const renderHD = true;

  const tileSize = renderHD ? 512 : 256;
  const hdSuffix = renderHD ? '@2x' : '';

  // these are precise coordinates of the visible area (they are not integers):
  let startTileLat = lat2tile(ne.lat, zoom);
  let startTileLng = long2tile(sw.lng, zoom);
  let endTileLng = long2tile(ne.lng, zoom);
  let endTileLat = lat2tile(sw.lat, zoom);

  // Map can cover tiles partially. We need to know offsets, so that we align
  // rendered height map with partially covered height tiles.
  let startXOffset = Math.round((startTileLng - Math.floor(startTileLng)) * tileSize);
  let startYOffset = Math.round((startTileLat - Math.floor(startTileLat)) * tileSize);
  let endXOffset = Math.round((Math.ceil(endTileLng) - endTileLng) * tileSize);
  let endYOffset = Math.round((Math.ceil(endTileLat) - endTileLat) * tileSize);


  // Now that we know offsets, let's convert them to integer tile query:
  startTileLat = Math.floor(startTileLat);
  startTileLng = Math.floor(startTileLng);
  endTileLat = Math.floor(endTileLat);
  endTileLng = Math.floor(endTileLng);

  if (startTileLng > endTileLng) {
    let t = startTileLng;
    startTileLng = endTileLng;
    endTileLng = t;
  }
  if (startTileLat > endTileLat) {
    let t = startTileLat;
    startTileLat = endTileLat;
    endTileLat = t;
  }

  const canvas = document.createElement("canvas");
  const width = endTileLng - startTileLng + 1;
  const height = endTileLat - startTileLat + 1;
  if (width > 50 || height > 50) throw new Error('Too many tiles request. How did you do it?');
  canvas.width = width * tileSize;
  canvas.height = height * tileSize;
  let work = [];

  const apiURL = `https://api.mapbox.com/v4/mapbox.terrain-rgb/zoom/tLong/tLat${hdSuffix}.pngraw?access_token=${MAPBOX_TOKEN}`;
  for (let x = 0; x < width; x++) {
    let _tLong = startTileLng + x;

    let startLng = tile2long(_tLong, zoom);
    if (startLng < -180) {
      startLng = 360 + startLng;
      _tLong = Math.floor(long2tile(startLng, zoom));
    } else if (startLng >= 180) {
      startLng = startLng - 360;
      _tLong = Math.floor(long2tile(startLng, zoom));
    }

    for (let y = 0; y < height; y++) {
      let _tLat = startTileLat + y;

      const url = apiURL
        .replace("zoom", zoom)
        .replace("tLat", _tLat)
        .replace("tLong", _tLong);

        work.push({
          url: url,
          x: x * tileSize,
          y: y * tileSize
        })
    }
  }

  progress.total = work.length;

  const ctx = canvas.getContext('2d');
  advanceProgress();

  return Promise.all(work.map(request => {
    return loadImage(request.url)
      .then(image => {
        ctx.drawImage(image, request.x, request.y);
        advanceProgress();
      }).catch(e => {
        ctx.beginPath();
        ctx.fillStyle = '#0186a0'; // zero height
        ctx.fillRect(request.x, request.y, tileSize, tileSize);
        advanceProgress();
      });
  })).then(() => {
    return {
      canvas,
      left: startXOffset,
      top: startYOffset, 
      right: canvas.width - endXOffset,
      bottom: canvas.height - endYOffset
    };
  });

  function advanceProgress() {
    if (progress.completed === undefined) {
      progress.completed = -1;
    }
    progress.completed = Math.min(progress.total, progress.completed + 1);
    progress.message = `Downloading tiles: ${progress.completed} of ${progress.total}...`
  }
}

export function long2tile(l, zoom) {
  let result = ((l + 180) / 360) * Math.pow(2, zoom);
  return result;
}

export function lat2tile(l, zoom) {
  return (
    ((1 -
      Math.log(
        Math.tan((l * Math.PI) / 180) + 1 / Math.cos((l * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
    Math.pow(2, zoom)
  );
}

export function tile2long(x, zoom) {
  return (x / Math.pow(2, zoom)) * 360 - 180;
}