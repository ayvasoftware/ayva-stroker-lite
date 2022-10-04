<template>
  <div class="modal-body" @mouseover="onHover">
    <div class="header" hover-info="">
      <div class="toolbar">
        <span class="toolbar-left">
          <span>{{ edit ? 'Edit' : 'Create' }} AyvaScript</span>
        </span>
        <span class="toolbar-right">
          <span>
            <close-icon class="close icon" @click="close" />
          </span>
        </span>
      </div>
      <div class="main-inputs">
        <div class="setup">
          <button class="play" @click="togglePlaying">
            <span>
              <play-icon v-show="!playingScript" class="play-icon" />
              <stop-icon v-show="playingScript" class="stop-icon" />
            </span>
            <span>{{ playingScript ? 'Stop' : 'Play' }}</span>
          </button>
        </div>
        <div v-if="device && device.connected" class="device">
          <span>
            <ayva-checkbox id="preview-on-device" v-model="previewOnDevice" />
            <label for="preview-on-device">Send preview to actual device.</label>
          </span>
        </div>
        <div v-else class="device">
          <label disabled>No device connected. Preview only available on emulator.</label>
        </div>
      </div>
    </div>
    <div class="editor-column">
      <div ref="editor" class="editor" :class="playingScript ? 'readonly' : ''" />
    </div>
    <div class="emulator-column" hover-info="">
      <div ref="emulator" class="emulator" />
    </div>
    <div class="save-container" hover-info="">
      <div>
        <label>Name:</label>
        <n-tooltip :show="scriptNameDuplicate" class="error-tooltip">
          <template #trigger>
            <input v-model="scriptName" class="name" :class="scriptNameDuplicate ? 'error' : ''">
          </template>
          A behavior with that name already exists.
        </n-tooltip>
        <button class="ayva-button primary" :disabled="!scriptNameValid" @click="save">
          {{ saveText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { Ayva, ScriptBehavior, TempestStroke } from 'ayvajs';
import OSREmulator from 'osr-emu';
import { createAyva } from '../lib/ayva-config.js';
import AyvaCheckbox from './widgets/AyvaCheckbox.vue';
import CustomStrokeStorage from '../lib/custom-stroke-storage.js';
import ayvascriptEditor from '../lib/ayvascript-editor';

const customStrokeStorage = new CustomStrokeStorage();
const ayva = createAyva();
let emulator;
let editor;

export default {
  components: {
    AyvaCheckbox,
  },

  inject: {
    globalAyva: {
      from: 'globalAyva',
    },

    device: {
      from: 'globalDevice',
    },
  },

  props: {
    editScript: {
      type: String,
      default: null,
    },
  },

  emits: ['close', 'save'],

  data () {
    return {
      playingScript: false,

      tempestStrokeLibrary: TempestStroke.library,

      customStrokeLibrary: {},

      previewOnDevice: false,

      scriptName: '',
    };
  },

  computed: {
    edit () {
      return !!this.editScript;
    },

    saveText () {
      return this.edit ? 'Save' : 'Add to Library';
    },

    disabled () {
      // Because we are putting this attribute on non input elements we have
      // to do this hacky thing...
      return this.playingScript ? '' : undefined;
    },

    scriptNameDuplicate () {
      if (this.editScript && this.scriptName === this.editScript) {
        return false;
      }

      // TODO: Add check for customScriptLibrary
      return !!this.tempestStrokeLibrary[this.scriptName] || !!this.customStrokeLibrary[this.scriptName];
    },

    scriptNameValid () {
      return this.scriptName.length && !this.scriptNameDuplicate && !this.scriptNameReserved;
    },

    scriptNameReserved () {
      return this.scriptName === 'default' || this.scriptName === 'header';
    },
  },

  watch: {
    previewOnDevice () {
      if (this.previewOnDevice) {
        ayva.addOutput(this.device);
      } else {
        ayva.removeOutput(this.device);
        this.resetGlobalDevicePosition();
      }
    },

    'device.connected' (connected) {
      if (!connected) {
        ayva.removeOutput(this.device);
        this.previewOnDevice = false;
      }
    },

    scriptName (value) {
      this.scriptName = value.replaceAll(/[^a-zA-Z0-9-]/g, '').toLowerCase();
    },
  },

  beforeMount () {
    this.customStrokeLibrary = customStrokeStorage.load();

    // TODO: Load custom script library here.
  },

  mounted () {
    emulator = new OSREmulator(this.$refs.emulator);
    ayva.addOutput(emulator);

    // Copy all axis limits from global Ayva instance.
    Object.keys(ayva.axes).forEach((name) => {
      ayva.updateLimits(name, this.globalAyva.$[name].min, this.globalAyva.$[name].max);
    });

    if (this.editScript) {
      this.scriptName = this.editScript;

      // TODO: Load existing script into editor here.
    }

    editor = ayvascriptEditor.create(this.$refs.editor);

    editor.getModel().onDidChangeContent((event) => {
      console.log('changed data');
    });
  },

  unmounted () {
    ayva.stop();
    ayva.removeOutput(emulator);
    ayva.removeOutput(this.device);
    emulator.destroy();

    if (this.previewOnDevice) {
      this.resetGlobalDevicePosition();
    }
  },

  methods: {
    togglePlaying () {
      if (this.playingScript) {
        this.stop();
      } else {
        const script = editor.getValue();

        console.log(JSHINT);

        this.play(editor.getValue());
      }
    },

    save () {
      // TODO: Stop script if running.
      if (this.editScript) {
        // TODO: Delete from customScriptStorage instead.
        // customStrokeStorage.delete(this.editScript);
      }

      // TODO: Save to customScriptStorage instead.
      // customStrokeStorage.save(this.scriptName, stroke);
      this.$emit('close');
      this.$emit('save');
    },

    close () {
      // TODO: Stop script if running.
      this.$emit('close');
    },

    play (script) {
      ayva.do(new ScriptBehavior(script));
      this.playingScript = true;
      editor.updateOptions({ readOnly: true });
    },

    stop () {
      // TODO: Also move back to home position.
      ayva.stop();
      this.playingScript = false;
      editor.updateOptions({ readOnly: false });
    },

    resetGlobalDevicePosition () {
      for (const axis in ayva.$) { // eslint-disable-line guard-for-in
        this.globalAyva.$[axis].value = ayva.$[axis].value;
      }
    },
  },
};
</script>

<style src="../assets/ayva-modal.css" scoped></style>
<style scoped>
  .editor {
    padding-left: 40px;
    width: 560px;
    height: 550px;
  }

  .modal-body {
    grid-template-columns: 50% 50%;
  }
  .emulator {
    width: 560px;
    height: 100%;
  }

  .play {
    background-color: var(--ayva-background-medium);
    padding: 5px;
    height: 30px;
    border: 1px solid rgb(20, 20, 20);
    border-radius: 4px;
    width: 60px;
    display: flex;
    align-items: center;
    justify-content: space-around;
  }

  .play:hover {
    background-color: rgb(28, 28, 28);
    border: 1px solid rgb(20, 20, 20);
    border-radius: 4px;
  }

  .play:focus {
    border-color: black;
  }

  .play:active {
    transform: translateY(1px);
  }

  .main-inputs .setup {
    margin-left: 40px;
  }

  .play-icon, .stop-icon {
    width: 12px;
    margin-top: 3px;
  }

  .play-icon {
    color: green;
  }

  .stop-icon {
    color: rgb(168, 0, 0);
  }

  .editor.readonly {
    opacity: 0.5;
  }
</style>
