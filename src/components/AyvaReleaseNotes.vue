<template>
  <div class="modal-body" @mouseover="onHover">
    <div class="header" hover-info="">
      <div class="toolbar">
        <span class="toolbar-left" />
        <span class="toolbar-right">
          <span>
            <close-icon class="close icon" @click="$emit('close')" />
          </span>
        </span>
      </div>
    </div>
    <div class="body">
      <div class="release-notes">
        <h2 style="text-align: center">
          A special announcement!
        </h2>
        <a href="https://remote.ayvasoftware.io/about" target="_blank">
          <img src="/img/ayva-remote.png" style="width: 460px"></a>
        <div class="light-gray" style="padding-top: 5px">
          Ayva Remote is now FREE. Allow anyone in the world to control your device!
          <br><br>Now supporting the <b>SR6</b>, <b>SSR1</b>, <b>The Handy</b>, and <b>Keon</b>!
        </div>
      </div>
      <div class="release-notes">
        <div class="examples">
          <img src="/img/sr6-example.gif">
          <img src="/img/ssr1-example.gif">
        </div>
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
