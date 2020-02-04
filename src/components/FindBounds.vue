<template>
  <div class='find-bounds'>
    <div v-if='showIntro'>To limit rendering of the ridge lines to a given area, type an area name below</div>
    <form v-on:submit.prevent="onSubmit" class='search-box'>
      <input class='query-input' v-model='enteredInput' type='text' placeholder='Enter a place name to start. E.g. Washington' ref='input'>
      <a type='submit' class='search-submit' href='#' @click.prevent='onSubmit' v-if='enteredInput && !hideInput'>Find</a>
    </form>

    <div class='results' v-if='!loading'>
      <div v-if='suggestionsLoaded && suggestions.length' class='suggestions '>
        <div class='prompt message'>
          Select boundaries below to apply bounds
        </div>
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
      <div v-if='suggestionsLoaded && !suggestions.length && !loading && !error' class='no-results message'>
        Didn't find matching places. Try a different query?
      </div>

      <div v-if='error' class='error message'>
        <div>Sorry, we were not able to fetch data from the OpenStreetMap.</div>
        <div class='error-links'>
          <a :href='getBugReportURL(error)' :title='"report error: " + error' target='_blank'>report this bug</a>
        </div>
      </div>
    </div>

    <div v-if='loading' class='loading message'>
      <loading-icon></loading-icon>
      <span>{{loading}}</span>
    </div>
  </div>
</template>
<script>

import Loading from './Loading'
import request from '../lib/request';
import appState from '../appState';

export default {
  name: 'FindBounds',
  components: {
    'loading-icon': Loading
  },
  data() {
    let enteredInput = appState.boundarySearchQuery || '';
    let showIntro = !enteredInput;
    return {
      enteredInput,
      showIntro,
      loading: null,
      error: null,
      hideInput: false,
      suggestionsLoaded: appState.boundarySearchResults.length > 0,
      suggestions: appState.boundarySearchResults,
    };
  },
  methods: {
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
      appState.setBounds(Object.freeze(suggestion));
    },
    onSubmit() {
      this.suggestions = [];
      this.error = false;
      appState.boundarySearchQuery = this.enteredInput;
      const query = encodeURIComponent(this.enteredInput);
      this.loading = 'Searching places that match your query...'
      request(`https://nominatim.openstreetmap.org/search?format=json&polygon_geojson=1&q=${query}`, {responseType: 'json'})
        .then(data => {
          this.showIntro = false;
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
</script>

<style lang="stylus" scoped>
@import('../variables.styl');
.prompt {
  padding: 4px;
  text-align: center;
  font-size: 12px;
  background-color: border-color;
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
.search-box {
  position: relative;
  background-color: emphasis-background;
  border: 1px solid border-color;
  padding: 0 8px;
  padding: 0 0 0 8px;
  height: 48px;
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
  &:hover {
    color: emphasis-background;
    background: highlight-color;
  }
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
    max-height: 200px;
    padding: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }
}
.message,
.loading {
  padding: 4px 8px;
  position: relative;
  background-color: border-color;
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
</style>