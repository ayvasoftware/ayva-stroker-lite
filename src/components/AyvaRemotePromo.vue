<template>
  <Transition name="fade">
    <div v-show="showPromo" class="modal-body" @mouseover="onHover">
      <div class="body">
        <a target="_blank" href="https://remote.ayvasoftware.io/about">
          <img class="promo" src="/img/ayva-remote.png">
        </a>
        <close-icon class="close icon" @click="$emit('close')" />
        <div class="promo" style="padding: 1rem 0">
          Want someone <b>hot</b> to stroke you off over the internet? When you're finished with <b>Ayva Stroker <span class="indigo">Lite</span></b>,
          try <a target="_blank" href="https://remote.ayvasoftware.io/about">Ayva <span class="indigo">Remote</span></a>, the first app that
          allows <b class="indigo"><span style="text-decoration: underline">true</span> live control</b> of
          Homebuilt Multi Axis Strokers over the internet!

          <br><br>New <a class="indigo" target="_blank" href="https://remote.ayvasoftware.io/providers">providers</a> listed regularly!
        </div>
      </div>
    </div>
  </Transition>
</template>

<script>

export default {
  emits: ['close'],

  data () {
    return {
      showPromo: false,
    };
  },

  mounted () {
    setTimeout(() => {
      this.showPromo = true;
    }, 100);
  },
};
</script>

<style scoped>
.modal-body {
  width: fit-content;
  background-color: black;
}

.header {
  grid-column: span 2;
}

.body {
  position: relative;
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

.promo {
  width: 40rem;
  font-family: Helvetica;
  font-size: 1rem;
  line-height: 1.5rem;
  color: var(--ayva-blue);
  text-align: center;
}

.promo a {
  font-family: locust;
  text-decoration: none;
  color: var(--ayva-blue);
}

.promo b {
  font-family: locust;
}

.close.icon {
  position: absolute;
  right: 0;
  color: var(--ayva-text-color-off-white);
}

.indigo {
  color: indigo !important;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 1.5s ease-in;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
