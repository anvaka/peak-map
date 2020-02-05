<template>
  <div class='find-bounds' v-click-outside='exitEditMode'>
    <div class="row">
      <div class='col' v-if='!editMode'>Boundaries</div>
      <div class='col c-2 bounds-name' v-if='!editMode'>
        <a href='#' :title='boundsName' @click.prevent='editMode = true' >{{boundsName}}</a>
      </div>
      <div class='col form-container'  v-if='editMode'>
        <form v-on:submit.prevent="onSubmit" class='search-box'>
          <input class='query-input' 
              v-model='enteredInput'
              type='text'
              placeholder='Enter a place name'
              ref='input'
              @keydown="onInputKeyDown"
              >
          <a type='submit' class='search-submit' href='#' @click.prevent='onSubmit' v-if='enteredInput && !hideInput'>Find</a>
        </form>
        <div v-if='showIntro && editMode' class='intro col c2' >Type an area name to set the rendering bounds</div>
      </div>
    </div>

    <div class='results' v-if='!loading && editMode && suggestionsLoaded && suggestions.length' >
      <div class='suggestions '>
        <ul>
          <li v-for='(suggestion, index) in suggestions' :key="index">
            <a @click.prevent='pickSuggestion(suggestion)' class='suggestion' href='#'>
              <span>
              {{suggestion.display_name}} <small>({{suggestion.type}})</small>
              </span>
            </a>
          </li>
        </ul>
      </div>
    </div>

    <div v-if='error && editMode' class='error message'>
      <div>Sorry, we were not able to fetch data from the OpenStreetMap.</div>
      <div class='error-links'>
        <a :href='getBugReportURL(error)' :title='"report error: " + error' target='_blank'>report this bug</a>
      </div>
    </div>
    <div v-if='suggestionsLoaded && !suggestions.length && !loading && !error && editMode' class='no-results message'>
      Didn't find matching places. Try a different query?
    </div>


    <div v-if='loading && editMode' class='loading message'>
      <loading-icon></loading-icon>
      <span>{{loading}}</span>
    </div>
  </div>
</template>
<script>

import Loading from './Loading'
import request from '../lib/request';
import appState from '../appState';
import ClickOutside from './clickOutside.js'

export default {
  name: 'FindBounds',
  components: {
    'loading-icon': Loading
  },
  data() {
    let enteredInput = appState.boundarySearchQuery || '';
    let showIntro = !enteredInput;
    return {
      editMode: false,
      enteredInput,
      showIntro,
      loading: null,
      error: null,
      hideInput: false,
      suggestionsLoaded: false,
      suggestions: appState.boundarySearchResults,
    };
  },
  computed: {
    boundsName() {
      return appState.selectedBoundShortName || 'unconstrained';
    },
  },
  watch: {
    editMode(isEditMode) {
      if (isEditMode) {
        setTimeout(() => this.$refs.input.focus(), 10);
      }
    },
    enteredInput() {
      if (!this.suggestionsLoaded) return;
      this.suggestionsLoaded = false;
      this.suggestions = [];
      this.error = false;
    }
  },
  directives: { ClickOutside },
  methods: {
    exitEditMode() {
      this.editMode = false;
    },
    onInputKeyDown(e) {
      if (e.which === 27) {
        this.exitEditMode();
        e.preventDefault();
        return;
      }
    },
    getBugReportURL(error) {
      let title = encodeURIComponent('Peak map OSM Error');
      let body = '';
      if (error) {
        body = 'Hello, an error occurred on the website:\n\n```\n' +
          error.toString() + '\n```\n\n Can you please help?';
      }
      return `https://github.com/anvaka/peak-map/issues/new?title=${title}&body=${encodeURIComponent(body)}`
    },
    pickSuggestion(suggestion) {
      this.enteredInput = suggestion.display_name;
      appState.setBounds(Object.freeze(suggestion));
      this.editMode = false;
    },
    onSubmit() {
      this.suggestions = [];
      this.error = false;
      this.showIntro = false;
      if (!this.enteredInput) {
        appState.setBounds(null);
        this.exitEditMode();
      }
      appState.boundarySearchQuery = this.enteredInput;
      const query = encodeURIComponent(this.enteredInput);
      this.loading = 'Searching places that match your query...'
      request(`https://nominatim.openstreetmap.org/search?format=json&polygon_geojson=1&q=${query}`, {
        cache: true,
        responseType: 'json',
        progress: (p) => this.loading = 'Searching places. Analyzed ' + formatNumber(p.loaded) + ' bytes...'
      })
        .then(data => {
          this.hideInput = data && data.length;
          this.suggestions = Object.freeze(data);
          appState.boundarySearchResults = this.suggestions;
        }).catch(error => {
          this.error = error;
        }).finally(() => {
          this.loading = null;
          this.suggestionsLoaded = true;
        });
    },

  }
}
function formatNumber(x) {
  if (!Number.isFinite(x)) return 'N/A';
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
</script>

<style lang="stylus" scoped>
@import('../variables.styl');
.prompt {
  padding: 4px;
  text-align: center;
  font-size: 12px;
  background-color: border-color;
}

.intro {
  font-size: 12px;
  padding: 4px;
  border: 1px solid border-color;
  border-top: none;
}

input {
  border: none;
  flex: 1;
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  padding: 0;
  color: #434343;
  height: 100%;
  font-size: 16px;
  &:focus {
    outline: none;
  }
}
.results {
  box-shadow: 0 2px 4px rgba(0,0,0,.2);
  position: fixed;
  width: 409px;
  z-index: 4;
}

.search-box {
  position: relative;
  background-color: emphasis-background;
  border: 1px solid border-color;
  padding: 0 0 0 8px;
  height: 32px;
  display: flex;
  font-size: 16px;
  cursor: text;
  a {
    cursor: pointer;
  }
  span {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
}

.search-submit {
  padding: 0 8px;
  align-items: center;
  text-decoration: none;
  display: flex;
  flex-shrink: 0;
  justify-content: center;
  outline: none;
  color: highlight-color
  align-self: stretch;
  align-items: center;
  &:hover {
    color: emphasis-background;
    background: highlight-color;
  }
}
.form-container {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
.suggestion {
  display: block
  min-height: 64px
  align-items: center;
  border-bottom: 1px solid border-color;
  display: flex
  padding: 0 10px;
  text-decoration: none
  color: highlight-color
}
.suggestions {
  position: relative;
  background: white
  border: 1px solid border-color;
  border-top: none;
  .note {
    font-size: 10px;
    font-style: italic;
  }
  ul {
    list-style-type: none;
    margin: 0;
    max-height: 400px;
    padding: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }
}
.message,
.loading {
  padding: 4px 8px;
  position: relative;
  background: white;
  border: 1px solid border-color;
  border-top: none;
  box-shadow: 0 2px 4px rgba(0,0,0,.2);
  font-size: 12px;
}

.loading {
  display: flex;
  svg {
    margin-right: 4px;
  }
}
.error {
  overflow-x: auto;
}

.bounds-name {
  white-space: nowrap;
  overflow-x: hidden;
  text-overflow: ellipsis;
  display: block;
  padding-top: 5px;
}

@media (max-width: small-screen) {
  .results {
    width: calc(100% - 32px);
  }
}
</style>