import tinycolor from 'tinycolor2';

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
  showBoundaryDetails: false,
  selectedBoundShortName: null,
  boundarySearchQuery: '',
  boundarySearchResults: [],
  bounds: null,
  mapName: null,
  showLess: false,
  showThemeDetails: false,
  selectedTheme: 'beige',
  themes: [{
    value: 'beige',
    name: 'beige',
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
    value: 'emerald',
    name: 'emerald',
    backgroundColor: '#182217',
    lineBackground: '#182217',
    lineColor: '#2CFA8A',
  }, {
    value: 'white', 
    name: 'white',
    backgroundColor: '#ffffff',
    lineBackground: '#ffffff',
    lineColor: '#000000'
  }],
};

// TODO: This should probably live in App.vue
let theme = appState.themes.find(theme => theme.name === appState.selectedTheme);
appState.backgroundColor = tinycolor(theme.backgroundColor).toRgb();
appState.lineBackground = tinycolor(theme.lineBackground).toRgb();
appState.lineColor = tinycolor(theme.lineColor).toRgb();

export default appState;