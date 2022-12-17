<template>
  <div class="modal-body">
    <div class="header">
      <div class="toolbar">
        <span class="toolbar-left">
          <span>License</span>
        </span>
        <span class="toolbar-right">
          <span>
            <close-icon class="close icon" @click="$emit('close')" />
          </span>
        </span>
      </div>
    </div>
    <div class="body">
      <div class="release-notes light-gray" style="white-space: pre; text-align: center;">
        {{ license }}
      </div>
    </div>
  </div>
</template>

<script>

export default {
  emits: ['close'],

  data () {
    return {
      license: '',
    };
  },

  beforeMount () {
    fetch('./LICENSE').then((response) => response.text()).then((license) => {
      this.license = license;
    });
  },
};
</script>

<style scoped>
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
</style>
