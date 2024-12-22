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
          <a href="https://osrmarket.io?utm_source=ayva_stroker_lite&utm_content=announcement" target="_blank" style="text-decoration: none; color: white">
            <span style="font-family: locust">OSR Market</span> launched!</a>
        </h2>
        <a href="https://osrmarket.io?utm_source=ayva_stroker_lite&utm_content=announcement" target="_blank" style="display: flex;">
          <video
            style="width: 100%; position: relative; left: -25%; z-index: 1"
            autoplay
            muted
            loop
            playsinline poster="https://imagedelivery.net/7u8LqukFR3cVPEzrL6HmYw/bd7eda83-ad9d-40ff-f9f9-4395e7ba1500/public"
          >
            <!-- TODO: Animate transition in, THEN start video.-->
            <source src="https://customer-wzu3ck3lf8kalih1.cloudflarestream.com/71d0182bf0bf0a07347d6ad5c12275a1/downloads/default.mp4" type="video/mp4">
          </video>
          <video
            style="width: 100%; position: relative; left: -72%; clip-path: polygon(20% 0, 100% 0, 100% 100%, 20% 100%); z-index: 1"
            autoplay
            muted
            loop
            playsinline
          >
            <source src="https://customer-wzu3ck3lf8kalih1.cloudflarestream.com/1f6f9f8495ea7d10745048b7eb427fcb/downloads/default.mp4" type="video/mp4">
          </video>
        </a>
        <div class="light-gray" style="padding-top: 5px">
          The <a href="https://osrmarket.io?utm_source=ayva_stroker_lite&utm_content=announcement" target="_blank" style="color: var(--ayva-blue);">
            OSR Market</a> is a premier online marketplace dedicated to
          connecting users with a carefully curated selection of trusted
          and verified suppliers specializing in Open-source Stroker
          Robot devices and accessories. <br><br>Qualifying purchases unlock premium features in
          <span style="font-family: locust; font-size: 0.75rem; color: var(--ayva-blue)">Ayva</span>&nbsp;
          <span style="color: indigo; font-size: 0.75rem; font-family: locust">Software</span> —
          giving you more ways to connect, create, and explore!
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
.release-notes a {
  text-decoration: none;
}

.release-notes a:hover {
  text-decoration: underline;
}

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
  overflow: hidden;
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
