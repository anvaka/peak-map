import createSVGContext from './createSVGContext';

/**
 * This is the core component of the website which renders lines on the overlay
 * layer
 * @param {*} appState - @see ../appState.js
 * @param {*} map  - mapbox map instance
 * @param {*} canvas  - where the lines should be rendered
 */
export default function createHeightMapRenderer(appState, regionInfo, canvas) {
  let renderHandle;
  let trueWindowHeight;

  render();

  return {
    /**
     * When new render request is created, we have to cancel the current one:
     */
    cancel,
    render
  }

  function render(settings) {
    // let's set everything up to match our application state:
    if (appState.renderProgress) {
      appState.renderProgress.message = 'Rendering...'
    }

    const oceanLevel = Number.parseFloat(appState.oceanLevel);

    let smoothSteps = parseFloat(appState.smoothSteps);

    canvas.style.opacity = appState.mapOpacity / 100;

    let ctx = canvas.getContext('2d');
    let lineStroke = getColor(appState.lineColor);
    let lineFill = getColor(appState.lineBackground);
    let lineWidth = Number.parseFloat(appState.lineWidth);

    let resHeight = regionInfo.windowHeight;
    let resWidth = window.innerWidth;
    let rowCount = Math.round(resHeight * appState.lineDensity / 100); 
    let scale = appState.heightScale;

    // since tiles can be partially overlapped, we use our own iterator
    // over partially overlapped tiles (to not deal with offset math here)
    const {minHeight, maxHeight, rowWithHighestPoint} = regionInfo.getAllHeightData();
    const iteratorSettings = createRegionIterator(rowCount, resHeight, rowWithHighestPoint);

    // we want the scale be independent from the zoom level, use the distribution
    // of heights as our scaler:
    let heightRange = maxHeight - minHeight;

    let lastLine = [];
    let lastRow = iteratorSettings.start;

    // When rendered to SVG - count the filled area, so that we can break paths
    // if they overlap already rendered paths
    let columnHeights;
    trueWindowHeight = window.innerHeight;

    if (settings && settings.svg) {
      // SVG needs hex values, not rgba, also ignore alpha
      lineStroke = getColor(appState.lineColor, /* useHex = */ true);
      columnHeights = new Float32Array(window.innerWidth);
      lastRow = iteratorSettings.stop;
      // This is going to be our look up structure. Point `(x, y)` is visible
      // only if its `y` coordinate is smaller than `columnHeight[x]` value.
      // (we render from bottom to top for svg files)
      for (let x = 0; x < window.innerWidth; ++x) {
        columnHeights[x] = trueWindowHeight; 
      }
      return renderSVGRows(settings);
    } else {
      clearScene();
      return renderRows();
    }

    // Public part is over. Below is is just implementation detail

    function renderSVGRows(settings) {
      let svg = createSVGContext(window.innerWidth, window.innerHeight); // || ctx - they both work here.
      let row = 0;
      let width = window.innerWidth;
      svg.fillStyle = getColor(appState.backgroundColor, /* useHex = */ true);
      svg.fillRect(0, 0, window.innerWidth, window.innerHeight);

      for (let y = lastRow; y > 0; y -= iteratorSettings.step) {
        drawSVGLine(lastLine, svg);
        lastLine = [];
        let isEven = (row % 2) === 0
        row += 1;

        for (let i = 0; i < width; i += 1) {
          let x = isEven ? i : width - 1 - i;
          let height = regionInfo.getHeightAtPoint(x, y);
          let fY = y - Math.floor(scale * (height - minHeight) / heightRange);
          if (height <= oceanLevel) {
            drawSVGLine(lastLine, svg);
            lastLine = [];
          } else {
            lastLine.push(x, fY);
          }
        }

        lastRow = y - iteratorSettings.step;
      }

      drawSVGLine(lastLine, svg);

      appState.renderProgress = null;
      if (settings && settings.labels) {
      }
      if (svg.serialize) {
        svg.appendLabels(settings && settings.labels);
        // ctx (used for debugging) doesn't have this method
        return svg.serialize();
      }
    }

    /**
     * This renders rows, and stops if allowed time quota is exceeded (making rendering
     * async, so that we do not freeze the main thread)
     */
    function renderRows() {
      let now = performance.now();

      for (let y = lastRow; y <= iteratorSettings.stop; y += iteratorSettings.step) {
        drawPolyLine(lastLine, true);
        lastLine = [];

        for (let x = 0; x < window.innerWidth; ++x) {
          let height = regionInfo.getHeightAtPoint(x, y);
          let fY = y - Math.floor(scale * (height - minHeight) / heightRange);

          if (height <= oceanLevel) {
            drawPolyLine(lastLine, true);
            lastLine = [];
          } else {
            lastLine.push(x, fY);
          }
        }

        lastRow = y + iteratorSettings.step;
        let elapsed = performance.now() - now;
        if (elapsed > 200) {
          renderHandle = requestAnimationFrame(renderRows);
          return;
        }
      }

      drawPolyLine(lastLine, true);

      appState.renderProgress = null;
    }

    /**
     * Draws a polyline, that does not intersect already rendered
     * lines. Assumption is that we render from bottom to the top.
     * 
     * 
     */
    function drawSVGLine(points, svg) {
      if (points.length < 3) return;

      let smoothRange = getSmoothRange(points, smoothSteps);
      points = smoothRange.points;

      svg.beginPath();
      svg.strokeStyle = lineStroke;
      svg.lineWidth = lineWidth;
      let wasVisible = false;
      for (let i = 0; i < points.length; i += 2) {
        let x = points[i];
        let y = points[i + 1];

        let lastRenderedColumnHeight = columnHeights[x];
        let isVisible = y <= lastRenderedColumnHeight && y >= 0 && y < trueWindowHeight;
        if (isVisible) {
          // This is important bit. We mark the entire area below as "rendered"
          // so that next `isVisible` check will return false, and we will break the line
          columnHeights[x] = Math.min(y, lastRenderedColumnHeight)
          // the path is visible:
          if (wasVisible) {
            svg.lineTo(x, y);
          } else {
            svg.moveTo(x, y);
          }
        } else {
          // The path is no longer visible
          if (wasVisible) {
            // But it was visible before
            svg.lineTo(x, y < 0 ? 0 : lastRenderedColumnHeight);
          } else {
            svg.moveTo(x, y < 0? 0 : lastRenderedColumnHeight);
          }
        }
        wasVisible = isVisible;
      }
      svg.stroke();
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
      ctx.lineWidth = lineWidth;
      ctx.moveTo(points[0], points[1]);
      for (let i = 2; i < points.length; i += 2) {
        ctx.lineTo(points[i], points[i + 1]);
      }
      ctx.stroke();
    }

    function clearScene() {
      ctx.beginPath();
      ctx.clearRect(0, 0, resWidth, resHeight);
      ctx.fillStyle = getColor(appState.backgroundColor);
      ctx.fillRect(0, 0, resWidth, resHeight);
    }
  }

  function cancel() {
    cancelAnimationFrame(renderHandle)
    appState.renderProgress = null;
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
  function createRegionIterator(rowCount, resHeight, includeRowIndex) {
    let stepSize = Math.round(resHeight / rowCount);
    let start = includeRowIndex - Math.floor(includeRowIndex/stepSize) * stepSize;
    let stop = start + stepSize * Math.floor((resHeight - start) / stepSize)

    return {
      start,
      stop,
      step: stepSize,
    }
  }

  function getColor(color, useHex) {
    if (useHex) {
      return `#${hex(color.r)}${hex(color.g)}${hex(color.b)}`;
    }
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`
  }
}

function hex(x) {
  if (x === 0) return '00';
  let hexValue = x.toString(16)
  return x < 16 ? '0' + hexValue : hexValue;
}