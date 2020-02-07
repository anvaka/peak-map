<template>
  <div class='app-container'>
    <div id='map' ref='map'></div>
    <canvas class='absolute height-map' ref='heightMap'></canvas>
    <div id='progress' :style="{opacity: renderProgress ? 1 : 0}">
      {{renderProgress && renderProgress.message}}
    </div>
    <div id="app" class='absolute'> 
      <div class='row control-panel'>
        <a v-if='shouldDraw'
           href="#"
           :class='{draw: true, settings: true, open: settingsOpen}'
           @click.prevent='settingsOpen = !settingsOpen'
           title='Change appearance, export to SVG'>
           {{settingsOpen ? 'Close settings' : 'Customize...'}}
        </a>
        <a href="#" class='draw peaks' :title='mainActionTitle' @click.prevent='onMainActionClick'>{{mainActionText}}</a>
      </div>
      <div class='settings-form' v-if='settingsOpen && shouldDraw'>
        <div v-if='shouldDraw'>
          <find-bounds></find-bounds>
          <div class='row'>
            <div class='col'>Height scale</div>
            <div class='col c-2'>
              <input type='range' min='10' max='256' step='1' v-model='heightScale'> 
              <input type='number' :step='1' v-model='heightScale'  autocomplete='off' autocorrect='off' autocapitalize="off" spellcheck="false" min='10' max='256'>
            </div>
          </div>
          <div class='row'>
              <div class='col'>Theme</div>
              <div class='col c-2'>
                <select v-model='selectedTheme'>
                  <option v-for="(theme, index) in themes" :value="theme.value" :key='index'>{{theme.name}}</option>
                </select>
                <a href='#' @click.prevent='showThemeDetails = !showThemeDetails' :class="{'options-container-toggle': true, 'is-open': showThemeDetails}">{{ showThemeDetails ? 'hide options ' : 'show options' }}</a>
              </div>
          </div>

          <div v-if='showThemeDetails'  class='options-container'>
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
          </div>

        <div v-if='!showLess'>
          <h3>Export</h3>

          <div class='row'>
            <a href="#" class='col export' title='Print on a mug' @click.prevent='previewOrOpen'>Onto a mug</a>
            <span class='col c-2'>
              Print what you see onto a mug. Get a unique gift of your favorite place.
            </span>
          </div>

          <div class='preview-actions' v-if='zazzleLink || generatingPreview || error'>
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
            I hope you enjoy the website! And if you truly do you can always <a href='https://www.patreon.com/anvaka'>become my patron</a> or just 
            <a href='https://www.paypal.com/paypalme2/anvakos/3'>buy me a coffee</a>. Your patronage helps me pay for the API and coffee.
            </p>
          </div>
        </div>
</div>
        <div class='close-link' :class="{'map-visible': shouldDraw}">
          <a href="#" @click.prevent='showLess = !showLess'>{{showLess ? 'show more' : 'show less'}}</a>
          <a href="#" @click.prevent='settingsOpen = false'>close</a>
        </div>
      </div>

    </div>

    <div class='about-line'>
      <a href='#' @click.prevent='aboutVisible = true'>about website</a>
    </div>

    <about v-if='aboutVisible' @close='aboutVisible = false'></about>

    <editable-label v-if='shouldDraw && bounds && !renderProgress' v-model='mapName' class='map-name' :printable='true' :style='{color: lineColorHex}'></editable-label>
    <div v-if='shouldDraw && bounds && !renderProgress' class='license printable' :style='{color: lineColorHex}'>data <a href='https://www.openstreetmap.org/about/' target="_blank" :style='{color: lineColorHex}'>© OpenStreetMap</a> <a href='https://www.mapbox.com/about/maps/' target="_blank" :style='{color: lineColorHex}'>© Mapbox</a></div>
  </div>
</template>

<script>
import appState from './appState';
import ColorPicker from './components/ColorPicker';
import Loading from './components/Loading';
import FindBounds from './components/FindBounds';
import EditableLabel from './components/EditableLabel';
import About from './components/About';
import generateZazzleLink from './lib/getZazzleLink';
import tinycolor from 'tinycolor2';

export default {
  name: 'App',
  data() {
    return appState;
  },
  components: {
    Loading,
    About,
    EditableLabel,
    ColorPicker,
    FindBounds
  },
  mounted() {
    this.onResize = () => {
      appState.sizeDirty = true;
    }
    window.addEventListener('resize', this.onResize, true);
    appState.init();
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
    },
    lineColorHex() {
      return tinycolor(this.lineColor).toHexString();
    }
  },

  watch: {
    selectedTheme(newValue) {
      let themeDefinition = this.themes.find(x => x.value === newValue);
      if (!themeDefinition) return; // how is this possible?

      this.lineColor = tinycolor(themeDefinition.lineColor).toRgb();
      this.lineBackground = tinycolor(themeDefinition.lineBackground).toRgb();
      this.backgroundColor = tinycolor(themeDefinition.backgroundColor).toRgb();
      this.redraw();
    },
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
      let string = appState.exportToSVG({
        labels: collectText()
      });
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

      collectText().forEach(label => {
        drawHtml(label, blendedCtx);
      })

      return blended;
    }
  }
}

function collectText() {
  return Array.from(
    document.querySelectorAll('.printable')
  ).map(element => {
    let computedStyle = window.getComputedStyle(element);
    let bounds = element.getBoundingClientRect();
    let fontSize = Number.parseInt(computedStyle.fontSize, 10);
    return {
      text: element.innerText,
      bounds,
      fontSize,
      color: computedStyle.color,
      fontFamily: computedStyle.fontFamily,
      fill: computedStyle.color,
    }
  });
}

function drawHtml(element, ctx) {
  if (!element) return;
  ctx.save();
  let dpr = window.devicePixelRatio || 1;
  ctx.font = dpr * element.fontSize + 'px ' + element.fontFamily;
  ctx.fillStyle = element.color;
  ctx.textAlign = 'end'
  ctx.fillText(element.text, element.bounds.right * dpr, element.bounds.bottom * dpr)
  ctx.restore();
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
@import('./variables.styl');

.app-container {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  width: app-width;
  background: white;
  z-index: 4;
  box-shadow: 0 2px 4px rgba(0,0,0,.2);
}
h3 {
  font-weight: normal;
  margin: 12px 0;
}
.hide-print-message {
  position: absolute;
  right: 8px;
}
.options-container {
  border-top: 1px solid border-color;
  border-bottom: 1px solid border-color;
  background: secondary-background;
  margin: 0 -16px;
  padding: 8px 16px;
}
.options-container-toggle {
  position: absolute;
  height: 24px;
  right: 8px;
  display: block;
  padding: 5px;
  border: 1px solid transparent;
}
.options-container-toggle.is-open {
  background: secondary-background;
  border: 1px solid border-color;
  border-bottom: 0;
}
.height-map {
  position: absolute;
  z-index: 3;
  pointer-events: none;
  opacity: 0;
  transition: opacity 100ms ease-in-out;
  background-position: 0px 0px, 10px 10px;
  background-size: 20px 20px;
  background-image: linear-gradient(45deg, #bbb 25%, transparent 25%, transparent 75%, #bbb 75%, #bbb 100%),linear-gradient(45deg, #bbb 25%, white 25%, white 75%, #bbb 75%, #bbb 100%);
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
    margin-right: 8px;
    min-width: 120px;
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
  a {
    border-top: 2px solid transparent;
    display: flex;
    align-items: center;
    border-bottom: 1px solid border-color;
  }
  
  a.settings {
    border-right: 1px solid border-color;
    padding: 0 16px;
    &:hover {
      color: primary-action-color;
    }
  }
  a.settings.open {
    box-shadow: 0 -3px 4px rgba(0,0,0,0.2);
    border-top: 2px solid highlight-color;
    border-bottom: none;
  }
  .draw {
    flex: 1;
    justify-content: center;
  }
}

.settings-form {
  position: relative;
  padding: 24px 16px 8px 16px;
  overflow-y: auto;
  border-right: 1px solid border-color;
  max-height: calc(100vh - 134px);
  h3 {
    margin: 8px 0 0 0;
    text-align: right;
  }

  input[type='number'] {
    max-width: 42px;
  }
}

.mapboxgl-ctrl-top-right .mapboxgl-ctrl {
  margin: 0;
}
.app-container .mapboxgl-ctrl-geocoder{
  box-shadow: 0 2px 4px rgba(0,0,0,.2)
}

.mapboxgl-ctrl-geocoder input[type='text'] {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  height: 42px;
}

.preview-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  font-size: 14px;
  align-items: center;
  display: flex;
  background-color: secondary-background;
  border: 1px solid border-color;
  margin: 8px -16px;

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
  animation: blink 4.5s ease-in-out infinite alternate;
  position: absolute;
  top: 41px;
  left: 0;
  width: app-width - 1px;
  z-index: 20;
  font-size: 12px;
  color: white;
  opacity: 0;
  text-align: center;
  background: rgb(255, 64, 129, 0.08);
  box-shadow: -1px 1px 4px rgba(134, 132, 132, 0.8)
  user-select: none;
}

@keyframes blink {
    0% { background: rgba(255, 64, 129, 0.88);  }
    33% { background: rgba(255, 64, 247, 0.88);  }
    66% { background: rgba(64, 191, 255, 0.88);  }
    100% { background: rgba(255, 64, 129, 0.88); }
}
.peaks {
  border-right: 1px solid border-color;
}

.map-name {
  position: fixed;
  right: 32px;
  bottom: 54px;
  font-size: 24px;
  color: #434343;
  z-index: 3;
  min-height: 46px;
  input {
    font-size: 24px;
    outline: none;
  }
}
.license {
  z-index: 3;
  text-align: right;
  position: fixed;
  font-family: labels-font;
  right: 32px;
  bottom: 32px;
  font-size: 12px;
  padding-right: 8px;
  a {
    text-decoration: none;
    display: inline-block;
    color: primary-text;
  }
}


@media (max-width: small-screen) {
  #app {
    width: 100%;
  }
  #progress {
    width: 100%;
  }

  .mapboxgl-ctrl-geocoder {
    display: none;
  }

  .title {
    font-size: 16px;
  }
  .map-name  {
    right: 8px;
    bottom: 24px;
  }
  .license  {
    right: 8px;
    bottom: 8px;
  }
}
</style>
