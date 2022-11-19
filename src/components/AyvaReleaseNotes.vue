<template>
  <div class="modal-body" @mouseover="onHover">
    <div class="header" hover-info="">
      <div class="toolbar">
        <span class="toolbar-left">
          <span>Upcoming Release</span>
        </span>
        <span class="toolbar-right">
          <span>
            <close-icon class="close icon" @click="$emit('close')" />
          </span>
        </span>
      </div>
    </div>
    <div class="body">
      <div class="warning">
        Warning!
      </div>
      <div class="release-notes">
        On December 1st, 2022, Ayva Stroker Lite will be changing domains.
        This means that any settings or custom strokes saved in local storage <span class="lost">will be lost unless exported</span>.
      </div>
      <div class="release-notes">
        To export ALL saved settings (including custom strokes) click the button below.
        You will be able to import these settings after the release on December 1st to get everything back.
      </div>
      <button class="export" @click="exportAll">
        Export All Settings
      </button>
      <div class="release-notes" style="font-style: italic; padding-top: 15px; text-align: center">
        Note: To see this message again, refresh the page.
      </div>
    </div>
  </div>
</template>

<script>

export default {
  emits: ['close'],

  data () {
    return {
      fileOptions: {
        types: [
          {
            description: 'Ayva Stroker Lite Settings',
            accept: {
              'application/json': ['.json'],
            },
          },
        ],
        excludeAcceptAllOption: true,
        multiple: false,
        suggestedName: 'ayva-stroker-settings.json',
      },
    };
  },

  methods: {
    async exportAll () {
      let fileHandle;

      try {
        fileHandle = await window.showSaveFilePicker(this.fileOptions);
      } catch (abortError) {
        return;
      }

      const writable = await fileHandle.createWritable();

      await writable.write(JSON.stringify(localStorage, null, 2));
      await writable.close();
    },
  },

};
</script>

<style scoped>
.modal-body {
  width: 500px;
  height: 380px;
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
