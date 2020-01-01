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

function getTilesBounds(tiles) {
  return tiles.reduce((bounds, tile) => {
    let p = tile.canonical;
    if (bounds.minX > p.x) bounds.minX = p.x;
    if (bounds.minY > p.y) bounds.minY = p.y;
    if (bounds.maxX < p.x) bounds.maxX = p.x;
    if (bounds.maxY < p.y) bounds.maxY = p.y;

    return bounds;
  }, {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY
  })
}

export function getRegionElevation(map, progress) {
  if (!progress) progress = {};

  const renderHD = true;

  const tileSize = renderHD ? 512 : 256;
  const hdSuffix = renderHD ? '@2x' : '';

  const tileZoom = map.transform.tileZoom;
  const coveringTiles = map.transform.coveringTiles({
    minzoom: tileZoom,
    maxzoom: tileZoom,
    tileSize
  });

  let tileBounds = getTilesBounds(coveringTiles);

  const canvas = document.createElement("canvas");
  const width = tileBounds.maxX - tileBounds.minX;
  const height = tileBounds.maxY - tileBounds.minY;
  if (width > 50 || height > 50) throw new Error('Too many tiles request. How did you do it?');

  let canvasWidth = canvas.width = width * tileSize + tileSize;
  let canvasHeight = canvas.height = height * tileSize + tileSize;

  const apiURL = `https://api.mapbox.com/v4/mapbox.terrain-rgb/zoom/tLong/tLat${hdSuffix}.pngraw?access_token=${MAPBOX_TOKEN}`;

  const work = coveringTiles.map(tile => {
    const p = tile.canonical;
    const url = apiURL
      .replace("zoom", p.z)
      .replace("tLat", p.y)
      .replace("tLong", p.x);

    let tileInfo = {
      url,
      x: tileSize * (p.x - tileBounds.minX), 
      y: tileSize * (p.y - tileBounds.minY)
    }
    return tileInfo;
  });

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
      zoomPower: Math.pow(2, tileZoom),
      tileSize,
      width: canvasWidth,
      height: canvasHeight,
      minX: tileBounds.minX,
      minY: tileBounds.minY
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

export function lng2tile(l, zoomPower) {
  let result = ((l + 180) / 360) * zoomPower;
  return result;
}

export function lat2tile(l, zoomPower) {
  let angle = l * Math.PI / 180;
  return (
    ((1 - Math.log( Math.tan(angle) + 1 / Math.cos(angle)) /
        Math.PI) /
      2) * zoomPower 
  );
}

export function tile2long(x, zoomPower) {
  return (x / zoomPower) * 360 - 180;
}