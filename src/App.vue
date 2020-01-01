<template>
  <div class='app-container'>
    <div id='map' ref='map'></div>
    <canvas class='absolute height-map' ref='heightMap'></canvas>
    <div id='progress' :style="{opacity: !settingsOpen && renderProgress ? 1 : 0}">
      {{renderProgress && renderProgress.message}}
    </div>
    <div id="app" class='absolute'> 
      <div class='row control-panel'>
        <a href="#" class='settings' @click.prevent='settingsOpen = !settingsOpen' title='Toggle settings'>
          <svg  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="24" height="24" fill="none" stroke="currentcolor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
              <path d="M13 2 L13 6 11 7 8 4 4 8 7 11 6 13 2 13 2 19 6 19 7 21 4 24 8 28 11 25 13 26 13 30 19 30 19 26 21 25 24 28 28 24 25 21 26 19 30 19 30 13 26 13 25 11 28 8 24 4 21 7 19 6 19 2 Z" />
              <circle cx="16" cy="16" r="4" />
          </svg>
        </a>
        <a href="#" class='draw' title='Draw the heightmap chart' @click.prevent='onMainActionClick'>{{mainActionText}}</a>
      </div>
      <div class='settings-form' v-if='settingsOpen'>
        <div class='row'>
          <div class='col'>Line density</div>
          <div class='col'>
            <input type="range" min="1" max="100" step="1" v-model="lineDensity"> 
            <input type='number' :step='1' v-model='lineDensity'  autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" min='1' max='100'>
          </div>
        </div>
        <div class='row'>
          <div class='col'>Height scale</div>
          <div class='col'>
            <input type='range' min='10' max='800' step='1' v-model='heightScale'> 
            <input type='number' :step='1' v-model='heightScale'  autocomplete='off' autocorrect='off' autocapitalize="off" spellcheck="false" min='10' max='800'>
          </div>
        </div>
        <div class='row'>
          <div class='col'>Ocean level</div>
          <div class='col'>
            <input type='range' min='-20' max='500' step='1' v-model='oceanLevel'> 
            <input type='number' :step='1' v-model='oceanLevel' autocomplete='off' autocorrect='off' autocapitalize='off' spellcheck='false' max='500' min='-20'>
          </div>
        </div>
        <div class='row'>
          <div class='col'>Smooth steps</div>
          <div class='col'>
            <input type='range' min='1' max='12' step='1' v-model='smoothSteps'> 
            <input type='number' :step='1' v-model='smoothSteps'  autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" min='1' max='12'>
          </div>
        </div>
        <div class='row'>
          <div class='col'>Overlay opacity</div>
          <div class='col'>
            <input type="range" min="1" max="100" step="1" v-model="mapOpacity"> 
            <input type='number' :step='1' v-model='mapOpacity'  autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" min='1' max='100'>
          </div>
        </div>
        <div class='row'>
          <div class='col'>Map Angle</div>
          <div class='col'>
            <input type="range" min="-180" max="180" step="1" v-model="angle"> 
            <input type='number' :step='1' v-model='angle'  autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" min='-180' max='180'>
          </div>
        </div>

        <div class='row'>
          <div class='col'>Line color</div>
          <div class='col'>
            <color-picker v-model='lineColor' @change='updateLinesColor'></color-picker>
          </div>
        </div>
        <div class='row'>
          <div class='col'>Line background</div>
          <div class='col'>
            <color-picker v-model='lineBackground' @change='updateLinesColor'></color-picker>
          </div>
        </div>

        <div class='row'>
          <div class='col'>Scene color</div>
          <div class='col'>
            <color-picker v-model='backgroundColor' @change='updateBackground'></color-picker>
          </div>
        </div>
      </div>

      <div class='preview-actions' v-if='!settingsOpen && shouldDraw && showPrintMessage && !hidePrintMessageForSession'>
          <div v-if='!zazzleLink'>
            <span>Like what you see?</span>
            <a href='#' @click.prevent='previewOrOpen' class='action' :class='{"has-link": zazzleLink}'>
              Print it on a mug!
            </a>
          </div>
          <div v-if='zazzleLink' class='padded popup-help'>
            If your browser has blocked the new window, please <a :href='zazzleLink' target='_blank'>click here</a>
            to open it.
          </div>
          <div v-if='generatingPreview' class='loading-container'>
            <loading></loading> Generating preview url...
          </div>
          <a href="#" @click.prevent='handleHideClick' class='hide-print-message'>x</a>
      </div>
      <div class='error padded' v-if='error'>
        <h5>Error occurred:</h5>
        <pre>{{error}}</pre>
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
    }
    window.addEventListener('resize', this.onResize, true);
  },

  beforeDestroy() {
    window.removeEventListener('resize', this.onResize, true);
  },

  computed: {
    mainActionText() {
      if (!this.shouldDraw) {
        return 'Draw the height map'
      }

      return 'Show the original map';
    }
  },

  watch: {
    angle() {
      this.redraw()
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
    mapOpacity(newValue) {
      let heightMap = this.$refs.heightMap;
      if (heightMap) {
        heightMap.style.opacity = parseFloat(newValue) / 100;
      }
    },
    shouldDraw(newValue) {
      if (!newValue) {
        this.settingsOpen = false;
        this.zazzleLink = null;
        this.error = null;
      }
      this.redraw();
    },
    settingsOpen(newValue) {
      if (newValue) {
        this.redraw();
      }
    },
    width() {
      updateSizes(this.$refs);
    },
    height() {
      updateSizes(this.$refs);
    }
  },
  methods: {
    handleHideClick() {
      if (this.zazzleLink) {
        this.showPrintMessage = false;
        this.zazzleLink = null;
      } else {
        this.hidePrintMessageForSession = true
      }
    },
    onMainActionClick() {
      this.shouldDraw = !this.shouldDraw;
    },


    updateBackground(x) {
      this.redraw();
    },

    updateLinesColor(x) {
      this.redraw();
    },

    previewOrOpen() {
      if (this.zazzleLink) {
        window.open(this.zazzleLink, '_blank');
        recordOpenClick(this.zazzleLink);
        return;
      }

      let canvas = this.$refs.heightMap;
      if (!canvas) {
        return;
      }
      appState.generatingPreview = true;

      generateZazzleLink(canvas).then(link => {
        appState.zazzleLink = link;
        window.open(link, '_blank');
        recordOpenClick(link);
        appState.generatingPreview = false;
      }).catch(e => {
        appState.error = e;
        appState.generatingPreview = false;
      });
    },
  }
}

function updateSizes(refs) {
  let dimensions = getCanvasDimensions();
  if (refs.map) {
    if (dimensions.trueWidth/dimensions.width !== 1) {
      refs.map.style.transform = 'scale(' + dimensions.trueWidth/dimensions.width + ')';
      refs.map.style.transformOrigin = 'top left';
    }
    refs.map.style.left = px(dimensions.left);
    refs.map.style.top = px(dimensions.top);
    refs.map.style.width = px(dimensions.width);
    refs.map.style.height = px(dimensions.height);
  }
  setGuideLineSize(refs.heightMap, dimensions);
  appState.redraw();
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
  let {innerWidth: w, innerHeight: h} = window;
  let trueWidth = w;
  let desiredRatio = 540/230; // mug ratio on zazzle. TODO: Customize for other products.
  let guideLineWidth = trueWidth;
  if (guideLineWidth < 1280) {
    guideLineWidth = 1280;
  }

  let guidelineHeight = guideLineWidth / desiredRatio;
  let trueHeight = trueWidth / desiredRatio;

  let left = 0;

  if (trueHeight > h) {
    trueHeight = h;
    trueWidth = trueHeight * desiredRatio;
    guidelineHeight = Math.max(h, 768);
    guideLineWidth = guidelineHeight * desiredRatio;
    // guidelineHeight = h;
    // guideLineWidth = guidelineHeight * desiredRatio;
    left = (w - trueWidth) / 2;
  }

  let top = (h - trueHeight)/2;

  return {
    width: window.innerWidth,
    height: window.innerHeight,
    left: 0,
    top: 0,
    trueWidth: window.innerWidth,
    trueHeight: window.innerHeight
  };
  return {
    width: guideLineWidth,
    height: guidelineHeight,
    left: left,
    top: top,
    trueWidth,
    trueHeight
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

.app-container {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

#app {
  width: 400px;
  background: white;
  z-index: 4;
  box-shadow: 0 0 20px rgba(0,0,0,.3);
}
h3 {
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

.col {
    align-items: center;
    display: flex;
    flex: 1;
    select {
      margin-left: 14px;
    }
  }
.row {
  margin-top: 4px;
  display: flex;
  flex-direction: row;
  height: 32px;
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
    color: border-color;
    padding: 0 16px;
    &:hover {
      color: primary-action-color;
    }
  }
  .draw {
    margin: 0 16px;
    flex: 1;
  }
}
.settings-form {
  padding: 0 16px;
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
  margin: 4px 16px;

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
  width: 400px;
  font-size: 12px;
  color: #333;
  opacity: 0;
  text-align: center;
  background: rgba(255, 255, 255,.22);
  box-shadow: -1px 1px 4px rgba(134, 132, 132, 0.8)
  user-select: none;
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
}
</style>
