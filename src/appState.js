// const ratio = 540/230 - mug
const appState = {
  currentState: 'intro',
  lineDensity: 28,
  smoothSteps: 1,
  mapOpacity: 100,
  heightScale: 42,
  oceanLevel: 0,
  aboutVisible: false,
  blank: false,
  error: null,
  zazzleLink: null,
  startOver,
  generatingPreview: false,
  settingsOpen: false,
  shouldDraw: false,
  showPrintMessage: false,
  renderProgress: null,
  hidePrintMessageForSession: false,
  width: window.innerWidth,
  height: window.innerHeight,

  backgroundColor: {
    r: 255, g: 255, b: 255, a: 1
  },
  lineBackground: {
    r: 255, g: 255, b: 255, a: 1
  },
  lineColor: {
    r: 22, g: 22, b: 22, a: 0.85
  },
};

// projects lon/lat into current XY plane

function startOver() {
  appState.zazzleLink = null;
  appState.generatingPreview = false;
  appState.currentState = 'intro';
  appState.blank = false,
  appState.downloadOsmProgress = null;
}

export default appState;