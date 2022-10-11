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
          <button class="play" :disabled="!script.trim()" @click="togglePlaying">
            <span>
              <play-icon v-show="!playing" class="play-icon" />
              <stop-icon v-show="playing" class="stop-icon" />
            </span>
            <span>{{ playing ? 'Stop' : 'Play' }}</span>
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
      <div ref="editor" class="editor" :class="playing ? 'readonly' : ''" />
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
        <button class="ayva-button primary" :disabled="!scriptNameValid || !scriptValid || playing" @click="save">
          {{ saveText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { useNotification } from 'naive-ui';
import { JSHINT } from 'jshint';
import { ScriptBehavior, TempestStroke } from 'ayvajs';
import { h } from 'vue';
import OSREmulator from 'osr-emu';
import { createAyva } from '../lib/ayva-config.js';
import AyvaCheckbox from './widgets/AyvaCheckbox.vue';
import CustomStrokeStorage from '../lib/custom-stroke-storage.js';
import ayvascriptEditor from '../lib/ayvascript-editor';

const customStrokeStorage = new CustomStrokeStorage();
const ayva = createAyva();
let emulator;
let editor;

class ScriptRunner {
  constructor (scriptEditor) {
    this.scriptEditor = scriptEditor;
    this.scriptBehavior = new ScriptBehavior(scriptEditor.script).bind(ayva);
  }

  perform () {
    // Give control to the script, but notify the user and
    // stop the script if there are any errors.
    try {
      return this.scriptBehavior.perform().catch(this.handleError.bind(this)).finally(() => {
        this.complete = this.scriptBehavior.complete;

        if (this.complete) {
          this.scriptEditor.stop();
        }
      });
    } catch (error) {
      this.handleError(error);
      this.complete = true;
      this.scriptEditor.stop();
      return Promise.resolve();
    }
  }

  handleError (error) {
    this.scriptEditor.notify.error({
      content: 'Exception occurred while running script:',
      meta: error.message,
    });

    this.scriptBehavior.complete = true;
  }
}

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

  setup () {
    const notification = useNotification();
    return {
      notify: notification,
    };
  },

  data () {
    return {
      playing: false,

      tempestStrokeLibrary: TempestStroke.library,

      customStrokeLibrary: {},

      customScriptLibrary: {},

      previewOnDevice: false,

      scriptName: '',

      script: '',

      isScriptValid: false,

      decorations: [],
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
      return this.playing ? '' : undefined;
    },

    scriptNameDuplicate () {
      if (this.editScript && this.scriptName === this.editScript) {
        return false;
      }

      return !!this.tempestStrokeLibrary[this.scriptName] || !!this.customStrokeLibrary[this.scriptName]
        || !!this.customScriptLibrary[this.scriptName];
    },

    scriptNameValid () {
      return this.scriptName.length && !this.scriptNameDuplicate && !this.scriptNameReserved;
    },

    scriptNameReserved () {
      return this.scriptName === 'default' || this.scriptName === 'header';
    },

    scriptValid () {
      return !!this.script.trim() && this.validateScript(this.script);
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

    editor.getModel().onDidChangeContent(() => {
      this.script = editor.getValue();

      for (const d of this.decorations) {
        editor.deltaDecorations(d, []);
      }

      this.validateScript(this.script);
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
      if (this.playing) {
        this.stop();
      } else if (this.validateScript(this.script, true)) {
        this.play();
      }
    },

    save () {
      // TODO: Stop script if running.
      if (this.editScript) {
        // customScriptStorage.delete(this.editScript);
      }

      // customScriptStorage.save(this.scriptName, this.script);
      this.$emit('close');
      this.$emit('save');
    },

    close () {
      // TODO: Stop script if running.
      this.$emit('close');
    },

    play () {
      this.playing = true;
      editor.updateOptions({ readOnly: true });

      ayva.do(new ScriptRunner(this));
    },

    stop () {
      // TODO: Also move back to home position.
      ayva.stop();
      this.playing = false;
      editor.updateOptions({ readOnly: false });
    },

    validateScript (script, notify = false) {
      const lines = ['function* generate() {', ...script.split('\n'), '}'];

      const valid = JSHINT(lines, {
        esversion: 11,
        noyield: true,
        debug: true,
      });

      // Discard errors for the first and last line (the faux function declaration),
      // and adjust line number to match editor.
      const errors = Object.values(JSHINT.errors.filter((error) => error.line !== 1 && error.line !== lines.length)
        .map((error) => ({
          ...error,
          line: error.line - 1,
        })).reduce((map, next) => {
          map[next.line] = map[next.line] || next;
          return map;
        }, {}));

      if (!valid) {
        const messages = [];
        for (const error of errors) {
          this.decorations.push(ayvascriptEditor.syntaxError(editor, error.line, error.character));
          messages.push(h('div', [`Line ${error.line}: ${error.reason}`]));
          messages.push(h('br'));
        }

        if (notify) {
          this.notify.error({
            content: 'Syntax error(s):',
            meta: () => h('div', messages),
          });
        }
      }

      return valid;
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

  .play:hover[disabled] {
    background-color: var(--ayva-background-medium);
  }

  .play:focus {
    border-color: black;
  }

  .play:active(:not(disabled)) {
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
