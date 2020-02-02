<template>
  <div class='app-container'>
    <div id='map' ref='map'></div>
    <canvas class='absolute height-map' ref='heightMap'></canvas>
    <div id='progress' :style="{opacity: !settingsOpen && renderProgress ? 1 : 0}">
      {{renderProgress && renderProgress.message}}
    </div>
    <div id="app" class='absolute'> 
      <div class='row control-panel'>
        <a v-if='shouldDraw' href="#" class='draw settings' @click.prevent='settingsOpen = !settingsOpen' title='Change appearance, export to SVG'>
          Customize...
        </a>
        <a href="#" class='draw peaks' :title='mainActionTitle' @click.prevent='onMainActionClick'>{{mainActionText}}</a>
      </div>
      <div class='settings-form' v-if='settingsOpen'>
        <div v-if='shouldDraw'>
          <div class='row'>
            <div class='col'>Colors</div>
            <div class='col colors c-2'>
              <div class='color-container'>
                <color-picker v-model='lineColor' @change='updateLinesColor'></color-picker>
                <div class='color-label'>line stroke</div>
              </div>
              <div class='color-container'>
                <color-picker v-model='lineBackground' @change='updateLinesColor'></color-picker>
                <div class='color-label'>line fill</div>
              </div>
              <div class='color-container'>
                <color-picker v-model='backgroundColor' @change='updateBackground'></color-picker>
                <div class='color-label'>background</div>
              </div>
            </div>
          </div>
          <div class='row'>
            <div class='col'>Line density</div>
            <div class='col c-2'>
              <input type="range" min="1" max="100" step="1" v-model="lineDensity"> 
              <input type='number' :step='1' v-model='lineDensity'  autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" min='1' max='100'>
            </div>
          </div>
          <div class='row'>
            <div class='col'>Height scale</div>
            <div class='col c-2'>
              <input type='range' min='10' max='800' step='1' v-model='heightScale'> 
              <input type='number' :step='1' v-model='heightScale'  autocomplete='off' autocorrect='off' autocapitalize="off" spellcheck="false" min='10' max='800'>
            </div>
          </div>
          <div class='row'>
            <div class='col'>Ocean level</div>
            <div class='col c-2'>
              <input type='range' min='-20' max='500' step='1' v-model='oceanLevel'> 
              <input type='number' :step='1' v-model='oceanLevel' autocomplete='off' autocorrect='off' autocapitalize='off' spellcheck='false' max='500' min='-20'>
            </div>
          </div>
          <div class='row'>
            <div class='col'>Smooth steps</div>
            <div class='col c-2'>
              <input type='range' min='1' max='12' step='1' v-model='smoothSteps'> 
              <input type='number' :step='1' v-model='smoothSteps'  autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" min='1' max='12'>
            </div>
          </div>
          <div class='row'>
            <div class='col'>Line width</div>
            <div class='col c-2'>
              <input type='range' min='0.1' max='5' step='0.1' v-model='lineWidth'> 
              <input type='number' :step='0.1' v-model='lineWidth'  autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" min='0.1' max='5'>
            </div>
          </div>
          <div class='row'>
            <div class='col'>Overlay opacity</div>
            <div class='col c-2'>
              <input type="range" min="1" max="100" step="1" v-model="mapOpacity"> 
              <input type='number' :step='1' v-model='mapOpacity'  autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" min='1' max='100'>
            </div>
          </div>
          <div class='row'>
            <div class='col'>Map Angle</div>
            <div class='col c-2'>
              <input type="range" min="-180" max="180" step="1" v-model="angle"> 
              <input type='number' :step='1' v-model='angle'  autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" min='-180' max='180'>
            </div>
          </div>


          <h3>Export</h3>

          <div class='row'>
            <a href="#" class='col export' title='Print on a mug' @click.prevent='previewOrOpen'>Onto a mug</a>
            <span class='col c-2'>
              Print what you see onto a mug. Get a unique gift of your favorite place.
            </span>
          </div>

          <div class='preview-actions'>
            <div v-if='zazzleLink' class='padded popup-help'>
              If your browser has blocked the new window, please <a :href='zazzleLink' target='_blank'>click here</a>
              to open it.
            </div>
            <div v-if='generatingPreview' class='loading-container'>
              <loading></loading> Generating preview url...
            </div>
          </div>
          <div class='error padded' v-if='error'>
            <h5>Error occurred:</h5>
            <pre>{{error}}</pre>
          </div>

          <div class='row'>
            <a href='#'  @click.prevent='doExportToPNG' class='col export'>As an image (.png)</a> 
            <span class='col c-2'>
              Save the current screen as a raster image.
            </span>
          </div>
          <div class='row'>
            <a href='#'  @click.prevent='doExportToSVG' class='col export'>As a vector (.svg)</a> 
            <span class='col c-2'>
              Save the current screen as a vector image.
            </span>
          </div>
          <h3>About</h3>
          <div>
            <p>This website was created by <a href='https://twitter.com/anvaka' target='_blank'>@anvaka</a>.
            It shows elevation with ridgelines for anywhere on Earth. 
            </p>
            <p>
            You can find the entire <a href='https://github.com/anvaka/peak-map'>source code here</a>. 
            If you love this website you can also <a href='https://www.paypal.com/paypalme2/anvakos/3'>buy me a coffee</a>, but you don't have to. I hope you enjoy the website!
            </p>
          </div>
        </div>

        <div v-if='!shouldDraw'>
          Draw peaks to see more options
        </div>
        <div class='close-link' :class="{'map-visible': shouldDraw}">
          <a href="#" @click.prevent='settingsOpen = false'>close</a>
        </div>
      </div>

    </div>

    <div class='about-line'>
      <a href='#' @click.prevent='aboutVisible = true'>about website</a>
    </div>

    <about v-if='aboutVisible' @close='aboutVisible = false'></about>
  </div>
</template>

<script>
import appState from './appState';
import ColorPicker from './components/ColorPicker';
import Loading from './components/Loading';
import About from './components/About';
import generateZazzleLink from './lib/getZazzleLink';

let scheduledResizeHandle;

export default {
  name: 'App',
  data() {
    return appState;
  },
  components: {
    Loading,
    About,
    ColorPicker
  },
  mounted() {
    updateSizes(this.$refs);
    this.init();
    this.onResize = () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      scheduleResize();
    }
    window.addEventListener('resize', this.onResize, true);
  },

  beforeDestroy() {
    window.removeEventListener('resize', this.onResize, true);
  },

  computed: {
    mainActionText() {
      if (this.shouldDraw) {
        return 'Draw original map';
      }
      return 'Click here to draw peaks'
    },
    mainActionTitle() {
      if (this.shouldDraw) {
        return 'Show original map';
      }
      return 'Draw the elevation chart';

    }
  },

  watch: {
    angle(newValue) {
      let angle = Number.parseFloat(newValue);
      map.setBearing(angle);
    },
    lineDensity() {
      this.redraw();
    },
    oceanLevel() {
      this.redraw();
    },
    heightScale() {
      this.redraw();
    },
    smoothSteps() {
      this.redraw();
    },
    lineWidth() {
      this.redraw();
    },
    mapOpacity(newValue) {
      let heightMap = this.$refs.heightMap;
      if (heightMap) {
        heightMap.style.opacity = parseFloat(newValue) / 100;
      }
    },
    shouldDraw(newValue) {
      if (!newValue) {
        this.zazzleLink = null;
        this.error = null;
      }
      this.updateMap();
    },

    width() {
      updateSizes(this.$refs);
    },

    height() {
      updateSizes(this.$refs);
    }
  },
  methods: {
    onMainActionClick() {
      this.shouldDraw = !this.shouldDraw;
    },

    updateBackground(x) {
      this.redraw();
    },

    updateLinesColor(x) {
      this.redraw();
    },

    doExportToSVG() {
      let string = appState.exportToSVG();
      if (!string) return;
      let blob = new Blob([string], {type: "text/xml"});
      let url = window.URL.createObjectURL(blob);
      let a = document.createElement("a");
      a.href = url;
      a.download = 'ridge-lines.svg'
      a.click();
      window.URL.revokeObjectURL(url);
    },

    doExportToPNG() {
      let printableCanvas = this.getBlendedCanvas();
      printableCanvas.toBlob(function(blob) {
        let url = window.URL.createObjectURL(blob);
        let a = document.createElement("a");
        a.href = url;
        a.download = 'ridge-lines.png';
        a.click();
        window.URL.revokeObjectURL(url);
      }, 'image/png')
    },

    previewOrOpen() {
      if (this.zazzleLink) {
        window.open(this.zazzleLink, '_blank');
        recordOpenClick(this.zazzleLink);
        return;
      }
      appState.generatingPreview = true;
      let blended = this.getBlendedCanvas();

      generateZazzleLink(blended).then(link => {
        appState.zazzleLink = link;
        window.open(link, '_blank');
        recordOpenClick(link);
        appState.generatingPreview = false;
      }).catch(e => {
        appState.error = e;
        appState.generatingPreview = false;
      });
    },

    getBlendedCanvas() {
      let heightMapCanvas = this.$refs.heightMap;
      let width = map.painter.width;
      let height = map.painter.height;
      let blended = document.createElement('canvas');
      let blendedCtx = blended.getContext('2d');
      blended.width = width;
      blended.height = height;
      const globalAlpha = Number.parseFloat(appState.mapOpacity)/100;
      if (globalAlpha < 1 || !this.shouldDraw) {
        map._render();
        blendedCtx.drawImage(map.getCanvas(), 0, 0)
      }

      if (globalAlpha > 0 && this.shouldDraw) {
        blendedCtx.globalAlpha = globalAlpha;
        blendedCtx.drawImage(heightMapCanvas, 0, 0, heightMapCanvas.width, heightMapCanvas.height, 0, 0, width, height);
      }

      return blended;
    }
  }
}

function scheduleResize() {
  if (scheduledResizeHandle) {
    clearTimeout(scheduledResizeHandle);
    scheduledResizeHandle = 0;
  }
  scheduledResizeHandle = setTimeout(() => window.map.resize(), 100);
}

function updateSizes(refs) {
  let dimensions = getCanvasDimensions();
  if (refs.map) {
    refs.map.style.left = px(dimensions.left);
    refs.map.style.top = px(dimensions.top);
    refs.map.style.width = px(dimensions.width);
    refs.map.style.height = px(dimensions.height);
  }
  setGuideLineSize(refs.heightMap, dimensions);
  appState.updateMap();
}

function setGuideLineSize(el, dimensions) {
  if (!el) return;
  el.width = dimensions.width;
  el.height = dimensions.height;
  el.style.left = px(dimensions.left);
  el.style.top = px(dimensions.top);
  el.style.width = px(dimensions.trueWidth);
  el.style.height = px(dimensions.trueHeight);
}

function px(x) {
  return x + 'px';
}

function getCanvasDimensions() {
  return {
    width: appState.width,
    height: appState.height,
    left: 0,
    top: 0,
    trueWidth: window.innerWidth,
    trueHeight: window.innerHeight
  };
}

function recordOpenClick(link) {
  if (typeof ga === 'undefined') return;

  ga('send', 'event', {
      eventCategory: 'Outbound Link',
      eventAction: 'click',
      eventLabel: link
    });
}
</script>

<style lang='stylus'>
border-color = #d8d8d8;
primary-action-color = #ff4081;
small-screen = 700px;
app-width = 442px;

.app-container {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

#app {
  width: app-width;
  background: white;
  z-index: 4;
  box-shadow: 0 0 20px rgba(0,0,0,.3);
}
h3 {
  font-weight: normal;
  margin: 12px 0;
}
.hide-print-message {
  position: absolute;
  right: 8px;
}

.height-map {
  position: absolute;
  z-index: 3;
  pointer-events: none;
  transition: opacity 100ms ease-in-out;
}
.close-link {
  margin-top: 8px;
  font-size: 10px;
  display: flex;
  justify-content: space-between;
}

.close-link.map-visible {
  display: flex;
  justify-content: space-between;
}

.col {
  align-items: center;
  display: flex;
  flex: 1;
  select {
    margin-left: 14px;
  }

  input[type="range"] {
    flex: 1;
  }
}
.col.c-2 {
  flex: 2
  margin-left: 4px;
}
.col.export {
  margin-right: 4px;
  align-items: stretch;
}

.row {
  margin-top: 4px;
  display: flex;
  flex-direction: row;
  min-height: 32px;
}

.colors {
    display: flex;
    flex-direction: row;

  .color-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 64px;
  }
  .color-label {
    font-size: 12px;
  }
}

.control-panel {
  height: 42px;
  margin: 0;
  justify-items: stretch;
  border-bottom: 1px solid border-color;
  a {
    display: flex;
    align-items: center;
  }
  a.settings {
    border-right: 1px solid border-color;
    padding: 0 16px;
    &:hover {
      color: primary-action-color;
    }
  }
  .draw {
    flex: 1;
    justify-content: center;
  }
}

.settings-form {
  padding: 8px 16px 8px 16px;
  overflow-y: auto;
  max-height: calc(100vh - 52px);
  h3 {
    margin: 8px 0 0 0;
    text-align: right;
  }
}

.mapboxgl-ctrl-top-right .mapboxgl-ctrl {
  margin: 0;
}
.mapboxgl-ctrl-geocoder input[type='text'] {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
}

.preview-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  font-size: 14px;
  align-items: center;
  display: flex;
  background-color: #e2e2e2

  .popup-help {
    text-align: center;
  }
}

.padded {
  padding: 12px;
}

.block {
  margin-top: 12px;
  padding-top: 10px;
  display: flex;
  flex-direction: column;
}
a {
  color: primary-action-color;
  text-decoration: none;
}
.error pre {
  overflow-x: auto;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: left;
  font-size: 14px;
  margin: 4px 0;
  svg {
    margin-right: 12px;
    margin-left: 12px;
  }
}
.about-line {
  position: fixed

  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  a {
    background: rgba(255, 255, 255, 0.58)
    padding: 0 4px;
  }
}
.title {
  font-size: 18px;
}
.row {
  display: flex;
  flex-direction: row;
}
.center {
  justify-content: center;
}
.col {
  flex: 1;
}

#progress {
  transition: opacity .2s ease-in-out;
  animation: blink 1.5s ease-in-out infinite alternate;
  position: absolute;
  top: 43px;
  left: 0;
  width: app-width;
  font-size: 12px;
  color: #333;
  opacity: 0;
  text-align: center;
  background: rgba(255, 255, 255,.22);
  box-shadow: -1px 1px 4px rgba(134, 132, 132, 0.8)
  user-select: none;
}
.peaks {
  border-right: 1px solid border-color;
}

@media (max-width: small-screen) {
  #app {
    width: 100%;
  }
  #progress {
    width: 100%;
  }

  .settings-form {
    max-height: min(calc(100vh - 52px), 180px);
  }
  .mapboxgl-ctrl-geocoder {
    display: none;
  }

  .title {
    font-size: 16px;
  }
}
</style>
