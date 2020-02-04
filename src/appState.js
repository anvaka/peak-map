const appState = {
  angle: 0,
  currentState: 'intro',
  lineDensity: 28,
  lineWidth: 1,
  smoothSteps: 1,
  mapOpacity: 100,
  heightScale: 42,
  oceanLevel: 0,
  aboutVisible: false,
  error: null,
  zazzleLink: null,
  generatingPreview: false,
  settingsOpen: false,
  shouldDraw: false,
  renderProgress: null,
  width: window.innerWidth,
  height: window.innerHeight,
  showBoundaryDetails: false,
  selectedBoundShortName: null,
  boundarySearchQuery: '',
  boundarySearchResults: [],
  bounds: null,
  mapName: null,
  showThemeDetails: false,
  selectedTheme: 'default',
  themes: [{
    value: 'default',
    name: 'default',
    backgroundColor: '#F7F2E8',
    lineBackground: '#F7F2E8',
    lineColor: 'rgb(22, 22, 22)'
  }, {
    value: 'dark', 
    name: 'dark',
    backgroundColor: '#3C3D3D',
    lineBackground: '#3C3D3D',
    lineColor: '#ffffff'
  }, {
    value: 'blue',
    name: 'blue',
    backgroundColor: '#101E33',
    lineBackground: '#101E33',
    lineColor: '#D1D8E3'
  }, {
    value: 'white', 
    name: 'white',
    backgroundColor: '#ffffff',
    lineBackground: '#ffffff',
    lineColor: '#000000'
  }],

  backgroundColor: {
    r: 0xF7, g: 0xF2, b: 0xE8, a: 1
  },
  lineBackground: {
    // r: 255, g: 255, b: 255, a: 1
    r: 0xF7, g: 0xF2, b: 0xE8, a: 1
  },
  lineColor: {
    r: 22, g: 22, b: 22, a: 1.0
  },
};

export default appState;