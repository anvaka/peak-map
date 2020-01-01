/**
 * This is the core component of the website which renders lines on the overlay
 * layer
 */
import { getRegionElevation, lat2tile, lng2tile } from '../elevation';


/**
 * 
 * @param {*} appState - @see ../appState.js
 * @param {*} map  - mapbox map instance
 * @param {*} canvas  - where the lines should be rendered
 */
export default function createHeightMapRenderer(appState, map, canvas) {
  let renderHandle;
  let progressHandle;
  let isCancelled = false;

  return {
    /**
     * Initiates async rendering
     */
    render,

    /**
     * When new render request is created, we have to cancel the current one:
     */
    cancel
  }

  function render() {
    // let's figure out the area where lines need to be rendered:
    const zoom = Math.floor(map.getZoom(zoom));
    appState.showPrintMessage = false;
    appState.renderProgress = {
      message: '',
      isCancelled: false,
      completed: false
    };

    // This will fetch all heightmap tiles
    getRegionElevation(map, appState.renderProgress).then(drawRegion);

    function drawRegion(regionInfo) {
      if (isCancelled) return;

      // let's set everything up to match our application state:
      appState.renderProgress.message = 'Rendering...'

      const oceanLevel = Number.parseFloat(appState.oceanLevel);

      let smoothSteps = parseFloat(appState.smoothSteps);

      canvas.style.opacity = appState.mapOpacity/100;

      let ctx = canvas.getContext('2d');
      let lineStroke = getColor(appState.lineColor);
      let lineFill = getColor(appState.lineBackground);

      let resHeight = window.innerHeight;
      let resWidth = window.innerWidth;
      let rowCount = Math.round(resHeight * appState.lineDensity/100); 
      let scale = appState.heightScale;

      // since tiles can be partially overlapped, we use our own iterator
      // over partially overlapped tiles (to not deal with offset math here)
      const regionIterator = createRegionIterator(regionInfo);
      let {minH, maxH, maxRow} = regionIterator.getMinMaxHeight();

      // we want the scale be independent from the zoom level, use the distribution
      // of heights as our scaler:
      let heightRange = maxH - minH;

      let lastLine = [];
      let iteratorSettings = regionIterator.getIteratorSettings(rowCount, resHeight, maxRow);
      let lastRow = iteratorSettings.start;

      clearScene();
      renderRows();

      // Public part is over. Below is is just implementation detail

      /**
       * This renders rows, and stops if allowed time quota is exceeded (making rendering
       * async, so that we do not freeze the main thread)
       */
      function renderRows() {
        let now = performance.now();

        for (let y = lastRow; y < iteratorSettings.stop; y += iteratorSettings.step) {
          drawPolyLine(lastLine);
          lastLine = [];

          for (let x = 0; x < window.innerWidth; ++x) {
            let height = regionIterator.getHeight(x, y);
            let fY = y - Math.floor(scale * (height - minH) / heightRange);

            if (height <= oceanLevel) {
              drawPolyLine(lastLine);
              lastLine = [];
            } else {
              lastLine.push(x, fY);
            }
          }

          lastRow = y + iteratorSettings.step;
          let elapsed = performance.now() - now;
          if (elapsed > 2000) {
            renderHandle = requestAnimationFrame(renderRows);
            return;
          }
        }

        drawPolyLine(lastLine);

        appState.renderProgress.message = 'Done!'
        appState.renderProgress = null;
        progressHandle = setTimeout(function() {
          appState.showPrintMessage = true;
        }, 5000)
      }

      /**
       * Draws filled polyline.
       */
      function drawPolyLine(points) {
        if (points.length < 3) return;

        let smoothRange = getSmoothRange(points, smoothSteps);
        points = smoothRange.points;

        // If line's height is greater than 2 pixels, let's fill it:
        if (smoothRange.max - smoothRange.min > 2) {
          ctx.beginPath();
          ctx.fillStyle = lineFill;
          ctx.moveTo(points[0], points[1]);
          for (let i = 2; i < points.length; i += 2) {
            ctx.lineTo(points[i], points[i + 1]);
          }
          ctx.lineTo(points[points.length - 2], smoothRange.max);
          ctx.lineTo(points[0], smoothRange.max);
          ctx.closePath();
          ctx.fill();
        }

        ctx.beginPath();
        ctx.strokeStyle = lineStroke;
        ctx.moveTo(points[0], points[1]);
        for (let i = 2; i < points.length; i += 2) {
          ctx.lineTo(points[i], points[i + 1]);
        }
        ctx.stroke();
      }

      function clearScene() {
        ctx.beginPath();
        ctx.fillStyle = getColor(appState.backgroundColor);
        ctx.fillRect(0, 0, resWidth, resHeight);
      }
    }
  }

  function cancel() {
    cancelAnimationFrame(renderHandle)
    clearTimeout(progressHandle);
    isCancelled = true;
    appState.renderProgress = null;
    appState.showPrintMessage = false;
  }

  /**
   * Simple smoothing function with moving averages, augmented with
   * min/max calculation (don't want to spend more CPU cycles fo min/max)
   */
  function getSmoothRange(points, windowSize) {
    let result = [];
    let max = Number.NEGATIVE_INFINITY;
    let min = Number.POSITIVE_INFINITY;
    let length = points.length / 2;
    for (let i = 0; i < length; i += 1) {
      const leftOffset = i - windowSize;
      const from = leftOffset >= 0 ? leftOffset : 0
      const to = i + windowSize + 1;

      let count = 0
      let sum = 0
      for (let j = from; j < to && j < length; j += 1) {
        sum += points[2 * j + 1]
        count += 1
      }

      let smoothHeight = sum / count;
      result[2 * i] = points[2 * i];
      result[2 * i + 1] = smoothHeight;

      if (max < smoothHeight) max = smoothHeight;
      if (min > smoothHeight) min = smoothHeight;
    }

    return {
      points: result,
      min,
      max
    };
  }

  /**
   * Iterate over height map.
   */
  function createRegionIterator(regionInfo) {
    const elevationCanvas = regionInfo.canvas;
    const {width, height, tileSize, zoomPower, minX, minY} = regionInfo;
    let elevationContext = elevationCanvas.getContext('2d');
    let data = elevationContext.getImageData(0, 0, width, height).data;

    return {
      getMinMaxHeight,
      getIteratorSettings,
      getHeight
    }

    function getHeight(x, y) {
        let lngLat = map.transform.pointLocation({x, y})

      let xTile = lng2tile(lngLat.lng, zoomPower);
      let xOffset = (xTile - minX) * tileSize;
      let yTile = lat2tile(lngLat.lat, zoomPower);
      let yOffset = (yTile - minY) * tileSize;
      let yC = Math.round(yOffset);
      let xC = Math.round(xOffset);

      let index = (yC * width + xC) * 4;
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

    function getMinMaxHeight() {
      let minH = Number.POSITIVE_INFINITY;
      let maxH = Number.NEGATIVE_INFINITY;
      let maxRow = -1;
      for (let x = 0; x < window.innerWidth; ++x) {
        for (let y = 0; y < window.innerHeight; ++y) {
          let height = getHeight(x, y);
          if (height < minH) minH = height;
          if (height > maxH) {
            maxH = height;
            maxRow = y;
          }
        }
      }

      return {minH, maxH, maxRow};
    }

    function getIteratorSettings(rowCount, resHeight, includeRowIndex) {
      let stepSize = Math.round(resHeight / rowCount);

      return {
        start: includeRowIndex - Math.floor(includeRowIndex/stepSize) * stepSize,
        step: stepSize,
        stop: resHeight
      }
    }
  }

  function getColor(color) {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`
  }
}