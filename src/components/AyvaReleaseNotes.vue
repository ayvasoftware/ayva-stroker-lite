<template>
  <div class="modal-body" @mouseover="onHover">
    <div class="header" hover-info="">
      <div class="toolbar">
        <span class="toolbar-left">
          <span>Release Notes (1.44.0)</span>
        </span>
        <span class="toolbar-right">
          <span>
            <close-icon class="close icon" @click="$emit('close')" />
          </span>
        </span>
      </div>
    </div>
    <div class="body">
      <div class="release-notes">
        <h2>Additional Emulators now Available!</h2>
        <div class="release-notes light-gray">
          Enable the SR6 or SSR1 emulators from the Output Settings menu:
        </div>
        <img style="margin-bottom: 10px" src="/img/enable-sr6.gif">
        <div class="examples">
          <img src="/img/sr6-example.gif">
          <img src="/img/ssr1-example.gif">
        </div>
      </div>
      <div class="release-notes light-gray">
        View the updated guide <a
          style="color: var(--ayva-text-color-blue)" href="https://ayvajs.github.io/ayvajs-docs/tutorial-ayva-stroker-lite.html" target="_blank"
        >here.</a>
      </div>

      <div class="release-notes light-gray">
        <i>Note: Import, export, and these release notes can be accessed from the settings menu in the lower left corner of the app.</i>
      </div>
    </div>
  </div>
</template>

<script>

import settingsStorage from '../lib/settings-storage';

export default {
  emits: ['close'],

  data () {
    return {
      settingsStorage,
    };
  },
};
</script>

<style scoped>
.modal-body {
  width: 500px;
  height: fit-content;
}

.header {
  grid-column: span 2;
}

.body {
  padding: 20px;
}

.warning {
  color: var(--ayva-color-error);
  font-weight: bold;
  font-size: 36px;
  text-align: center;
  padding-bottom: 16px;
}

.lost {
  color: var(--ayva-color-error);
  text-decoration: underline;
  font-weight: bold;
}

.release-notes {
  font-size: 16px;
  line-height: 24px;
  padding-bottom: 15px;
}

.light-gray {
  color: var(--ayva-text-color-light-gray);
}

.export {
  font-size: 16px;
  padding: 5px;
  height: 36px;
}

.toolbar {
  background-color: rgb(17, 17, 17);
  height: 30px;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
}

.toolbar > * {
  display: flex;
}

.toolbar-left {
  align-items: center;
}

[disabled] > * {
  pointer-events: none;
}

img {
  width: 50%;
  display: block;
  margin: auto;
}

h2 {
  padding-bottom: 1rem;
}

.examples {
  display: flex;
}

.examples > * {
  height: 221px;
}
</style>
