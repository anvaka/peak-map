import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Load the unbundled ES modules without changing the app's CommonJS package.
const svgSource = await readFile(new URL('../src/lib/createSVGContext.js', import.meta.url), 'utf8');
const svgURL = 'data:text/javascript;base64,' + Buffer.from(svgSource).toString('base64');
const source = (await readFile(new URL('../src/lib/createHeightMapRenderer.js', import.meta.url), 'utf8'))
  .replace("'./createSVGContext'", JSON.stringify(svgURL));
const { default: createRenderer } = await import('data:text/javascript;base64,' + Buffer.from(source + '\n//# sourceURL=heightMapRenderer.js').toString('base64'));

for (const [height, density, peak] of [[10, 100, 0], [10, 28, 0], [11, 28, 1]]) {
  for (const svg of [false, true]) {
    test(`valid sampled rows: height=${height}, density=${density}, peak=${peak}, svg=${svg}`, () => {
      globalThis.window = { innerWidth: 4, innerHeight: height };
      const samples = [];
      const region = {
        windowHeight: height,
        getAllHeightData: () => ({ minHeight: 1, maxHeight: 10, rowWithHighestPoint: peak }),
        getHeightAtPoint(x, y) {
          assert.ok(y >= 0 && y < height, `row ${y} is outside ${height} rows`);
          samples.push(y);
          return 2 + x;
        }
      };
      const color = { r: 20, g: 20, b: 20, a: 1 };
      const state = { oceanLevel: 0, smoothSteps: 1, mapOpacity: 100, lineColor: color,
        lineBackground: color, lineWidth: 1, lineDensity: density, heightScale: 1,
        backgroundColor: color };
      const context = Object.fromEntries(['beginPath', 'clearRect', 'fillRect', 'moveTo', 'lineTo',
        'closePath', 'fill', 'stroke'].map(name => [name, (...args) => {
          assert.ok(args.every(Number.isFinite), `${name} received nonfinite coordinates`);
        }]));
      const renderer = createRenderer(state, region, { style: {}, getContext: () => context });
      if (svg) {
        samples.length = 0;
        const output = renderer.render({ svg: true });
        assert.ok(output.includes('<path'));
        assert.ok(!/NaN|Infinity/.test(output));
      }
      assert.ok(samples.length > 0);
      assert.ok(samples.includes(peak), 'highest row remains included');
    });
  }
}
