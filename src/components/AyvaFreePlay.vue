<template>
  <div class="free-play">
    <div class="free-play-container lil-gui root">
      <div class="title">
        <span>Free Play Parameters</span>
        <span class="guide" @click.stop>
          <a href="https://ayvajs.github.io/ayvajs-docs/tutorial-ayva-stroker-lite.html" target="_blank">Help</a>
        </span>
      </div>
      <div class="limits lil-gui children">
        <div class="limit">
          <div class="axis">
            Change BPM
          </div>
          <ayva-bpm-select
            v-model="bpmMode"
            storage-key="free-play-bpm-mode"
            @change="onUpdate('bpm-mode', $event)"
          />
        </div>

        <div class="limit">
          <div class="axis">
            BPM Range
          </div>
          <ayva-slider
            :options="bpmOptions"
            storage-key="free-play-bpm"
            @update="onUpdate('bpm', $event)"
          />
        </div>

        <div class="limit">
          <div class="axis" :disabled="disableAcceleration">
            Acceleration (bpm/s)
          </div>
          <ayva-slider
            :options="accelerationOptions"
            :disabled="disableAcceleration"
            storage-key="free-play-acceleration"
            @update="onUpdate('acceleration', $event)"
          />
        </div>

        <div class="limit">
          <div class="axis">
            Pattern Duration
          </div>
          <ayva-slider
            :options="patternDurationOptions"
            storage-key="free-play-pattern-duration"
            @update="onUpdate('pattern-duration', $event)"
          />
        </div>

        <div class="limit">
          <div class="axis">
            Transition Duration
          </div>
          <ayva-slider
            :options="transitionDurationOptions"
            storage-key="free-play-transition-duration"
            @update="onUpdate('transition-duration', $event)"
          />
        </div>

        <div class="limit twist">
          <div class="axis">
            Default Twist
          </div>
          <div>
            <ayva-checkbox v-model="twist" storage-key="free-play-enable-twist" />
          </div>
        </div>

        <div class="limit">
          <div
            class="axis"
            :disabled="disableTwist"
          >
            Twist Range
          </div>

          <ayva-slider
            :options="twistRangeOptions"
            :disabled="disableTwist"
            storage-key="free-play-twist-range"
            @update="onUpdate('twist-range', $event)"
          />
        </div>

        <div class="limit">
          <div
            class="axis"
            :disabled="disableTwist"
          >
            Twist Phase
          </div>
          <ayva-slider
            :options="twistPhaseOptions"
            :disabled="disableTwist"
            storage-key="free-play-twist-phase"
            @update="onUpdate('twist-phase', $event)"
          />
        </div>

        <div class="limit">
          <div
            class="axis"
            :disabled="disableTwist"
          >
            Twist Eccentricity
          </div>
          <ayva-slider
            :options="twistEccOptions"
            :disabled="disableTwist"
            storage-key="free-play-twist-ecc"
            @update="onUpdate('twist-ecc', $event)"
          />
        </div>
      </div>
    </div>
    <div ref="strokesContainer" class="free-play-container lil-gui root">
      <div class="title">
        <span>Strokes</span>
        <span v-show="currentStrokeName !== 'None'" class="current-stroke-container">
          <span class="label">Playing:</span>
          <span class="current-stroke">{{ currentStrokeName }}</span>
        </span>
        <span v-show="currentStrokeName === 'None'" class="settings-container" @click.stop>
          <n-dropdown
            placement="bottom-start"
            trigger="click"
            size="small"
            :options="settingsOptions"
            :disabled="mode !== 'Stopped'"
            @select="onSettings"
          >
            <settings-icon :disabled="mode !== 'Stopped' ? '' : null" class="settings icon" @click.stop />
          </n-dropdown></span>
      </div>
      <div class="limits lil-gui children" style="padding-top: 0;">
        <!-- <div class="info">
          Select what strokes to include in free play mode, or click buttons to manually trigger a stroke
          (manually triggering a stroke will transition out of free play mode).
        </div> -->

        <div ref="tempestStrokeContainer" class="tempest-stroke-container">
          <div class="tempest-stroke">
            <div class="checkbox">
              <ayva-checkbox v-model="selectAllStrokes" />
            </div>
            <div>
              <div class="info">
                Select or manually trigger a stroke.
              </div>
            </div>
            <div class="stroke-actions" />
          </div>
          <template v-for="stroke of strokes" :key="stroke.name">
            <div class="tempest-stroke">
              <div class="checkbox">
                <ayva-checkbox
                  v-model="stroke.enabled"
                  :storage-key="`free-play-pattern-${stroke.name}`"
                  @change="fireUpdateStrokes"
                />
              </div>
              <div>
                <button :title="stroke.name" @click="fireSelectStroke(stroke.name)">
                  {{ stroke.name }}
                </button>
              </div>
              <div class="stroke-actions">
                <n-popover
                  trigger="hover"
                  raw
                  :show-arrow="false"
                  :delay="250"
                  @update:show="previewStroke(stroke.name, $event)"
                >
                  <template #trigger>
                    <eye-icon class="preview icon" :disabled="stroke.type !== 'tempest-stroke' ? '' : undefined" />
                  </template>
                  <div :data-preview-stroke="stroke.name" />
                </n-popover>
                <n-dropdown
                  placement="bottom-start"
                  trigger="click"
                  size="small"
                  :options="customStrokeActions"
                  :disabled="mode !== 'Stopped'"
                  @select="onCustomStrokeAction(stroke, $event)"
                >
                  <settings-icon v-show="stroke.custom" class="settings icon" :disabled="mode !== 'Stopped' ? '' : null" />
                </n-dropdown>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <n-modal :show="showStrokeEditor" :auto-focus="false">
      <div>
        <div class="lil-gui">
          <tempest-stroke-editor ref="strokeEditor" :edit-stroke="editStroke" @close="showStrokeEditor = false" @save="refreshStrokes" />
        </div>
      </div>
    </n-modal>

    <n-modal :show="showScriptEditor" :auto-focus="false">
      <div>
        <div class="lil-gui">
          <ayva-script-editor ref="strokeEditor" :edit-script="editScript" @close="showScriptEditor = false" @save="refreshStrokes" />
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script>
import { TempestStroke } from 'ayvajs';
import OSREmulator from 'osr-emu';
import { useNotification } from 'naive-ui';
import { h, nextTick } from 'vue';
import { createAyva } from '../lib/ayva-config.js';
import AyvaSlider from './widgets/AyvaSlider.vue';
import AyvaCheckbox from './widgets/AyvaCheckbox.vue';
import AyvaBpmSelect from './widgets/AyvaBpmSelect.vue';
import AyvaScriptEditor from './AyvaScriptEditor.vue';
import TempestStrokeEditor from './TempestStrokeEditor.vue';
import {
  makeCollapsible, formatter, clampHeight
} from '../lib/util.js';
import CustomBehaviorStorage from '../lib/custom-behavior-storage.js';

let previewAyva = null;
let previewEmulator = null;

const customBehaviorStorage = new CustomBehaviorStorage();

export default {

  components: {
    AyvaSlider,
    AyvaCheckbox,
    AyvaBpmSelect,
    AyvaScriptEditor,
    TempestStrokeEditor,
  },

  inject: ['globalAyva'],

  props: {
    currentStrokeName: {
      type: String,
      default: null,
    },

    mode: {
      type: String,
      default: null,
    },
  },

  emits: ['update-parameters', 'update-strokes', 'select-stroke'],

  setup () {
    const notification = useNotification();
    return {
      notify: notification,
    };
  },

  data () {
    return {
      twist: false,

      bpmOptions: {
        range: {
          min: 0,
          max: 150,
        },
        start: [20, 60],
        padding: [10],
        step: 1,
        format: formatter(),
      },
      accelerationOptions: {
        range: {
          min: 0,
          max: 150,
        },
        start: [0, 20],
        step: 1,
        format: formatter(),
      },
      patternDurationOptions: {
        range: {
          min: 0,
          max: 30,
        },
        start: [5, 10],
        padding: [1],
        step: 0.1,
        format: formatter(1, 's'),
      },
      transitionDurationOptions: {
        range: {
          min: 0,
          max: 30,
        },
        start: [2, 5],
        padding: [1],
        step: 0.1,
        format: formatter(1, 's'),
      },
      twistRangeOptions: {
        range: {
          min: 0,
          max: 1,
        },
        start: [0, 1],
        margin: 0.1,
      },
      twistPhaseOptions: {
        range: {
          min: -4,
          max: 4,
        },
        start: [0],
      },
      twistEccOptions: {
        range: {
          min: -1,
          max: 1,
        },
        start: [0],
      },

      strokes: [],

      customBehaviorLibrary: {},

      initialParameters: {},

      previewElement: null,
      previewParent: null,

      showScriptEditor: false,

      editScript: null,

      showStrokeEditor: false,

      editStroke: null,

      bpmMode: 'transition',

      settingsOptions: [{
        key: 'create-stroke',
        label: 'Create Stroke',
      }, {
        key: 'create-script',
        label: 'Create AyvaScript',
      }, {
        key: 'import',
        label: 'Import',
      }, {
        key: 'export',
        label: 'Export',
      }],

      customStrokeActions: [{
        key: 'edit',
        label: 'Edit',
      }, {
        key: 'export',
        label: 'Export',
      }, {
        key: 'delete',
        label: 'Delete',
      }],
    };
  },

  computed: {
    disableTwist () {
      return !this.twist ? '' : null;
    },

    disableAcceleration () {
      return this.bpmMode !== 'continuous' ? '' : null;
    },

    selectAllStrokes: {
      get () {
        return this.strokes.reduce((enabled, stroke) => enabled && stroke.enabled, true);
      },

      set (value) {
        this.strokes.forEach((stroke) => {
          stroke.enabled = !!value;
        });
      },
    },
  },

  watch: {
    twist: {
      immediate: true,
      handler (value) {
        this.fireUpdateParameter('twist', value);
      },
    },

    strokes: {
      immediate: true,
      handler () {
        this.fireUpdateStrokes();
      },
    },

    selectAllStrokes () {
      this.fireUpdateStrokes();
    },
  },

  mounted () {
    this.$el.querySelectorAll('.free-play-container').forEach((element) => {
      makeCollapsible(element);
    });

    this.previewElement = document.createElement('div');
    this.previewElement.classList.add('preview-popup');

    previewEmulator = new OSREmulator(this.previewElement);

    window.addEventListener('resize', this.onResize);

    this.refreshStrokes();

    this.onResize();
  },

  unmounted () {
    window.removeEventListener('resize', this.onResize);
  },

  methods: {
    refreshStrokes () {
      const enabledMap = this.strokes.reduce((map, next) => {
        map[next.name] = next.enabled;
        return map;
      }, {});

      this.customBehaviorLibrary = customBehaviorStorage.load();

      const makeLibraryList = (library, custom = false) => Object.keys(library).sort().map((name) => ({
        name,
        custom,
        type: library[name].type || 'tempest-stroke',
        enabled: enabledMap[name] ?? true,
      }));

      this.strokes = [
        ...makeLibraryList(this.customBehaviorLibrary, true),
        ...makeLibraryList(TempestStroke.library)];

      this.onResize();
    },

    onResize () {
      nextTick(() => {
        if (!this.$refs.strokesContainer.classList.contains('closed')) {
          const childHeight = this.$refs.tempestStrokeContainer.getBoundingClientRect().height;
          clampHeight(this.$refs.strokesContainer, 200, childHeight + 50);
        }
      });
    },

    onUpdate (name, value) {
      this.fireUpdateParameter(name, value);
    },

    onSettings (key) {
      if (key === 'create-stroke') {
        this.openStrokeEditor();
      } else if (key === 'create-script') {
        this.openScriptEditor();
      } else if (key === 'import') {
        const onConflicts = (conflicts) => {
          this.notify.warning({
            content: 'Some strokes renamed due to conflicts:',
            meta: () => h('div', conflicts.map((c) => h('div', c))),
          });
        };

        customBehaviorStorage.import(onConflicts).then(() => {
          this.refreshStrokes();
        }).catch((error) => {
          this.notify.error({
            content: 'Error importing stroke:',
            meta: error.message,
          });
        });
      } else if (key === 'export') {
        customBehaviorStorage.export();
      }
    },

    onCustomStrokeAction (stroke, action) {
      if (action === 'delete') {
        customBehaviorStorage.delete(stroke.name);
        this.refreshStrokes();
      } else if (action === 'edit' && stroke.type === 'tempest-stroke') {
        this.openStrokeEditor(stroke.name);
      } else if (action === 'edit' && stroke.type === 'ayvascript') {
        this.openScriptEditor(stroke.name);
      } else if (action === 'export') {
        customBehaviorStorage.exportOne(stroke.name);
      }
    },

    openScriptEditor (editScript = null) {
      this.editScript = editScript;
      this.showScriptEditor = true;
      this.animateEditorResize(1000);
    },

    openStrokeEditor (editStroke = null) {
      this.editStroke = editStroke;
      this.showStrokeEditor = true;
      this.animateEditorResize(1000);
    },

    animateEditorResize (delay, lastTime) {
      window.dispatchEvent(new Event('resize'));

      if (!lastTime) {
        requestAnimationFrame(this.animateEditorResize.bind(this, delay, performance.now()));
      } else {
        const elapsed = performance.now() - lastTime;
        const remaining = delay - elapsed;

        if (remaining > 0) {
          requestAnimationFrame(this.animateEditorResize.bind(this, remaining, performance.now()));
        }
      }
    },

    fireUpdateStrokes () {
      const selectedStrokes = this.strokes.filter((s) => s.enabled).map((s) => s.name);
      this.$emit('update-strokes', selectedStrokes);
    },

    fireUpdateParameter (name, value) {
      this.$emit('update-parameters', {
        name,
        value,
      });
    },

    fireSelectStroke (stroke) {
      this.$emit('select-stroke', stroke);
    },

    previewStroke (stroke, show) {
      this.destroyPreview();

      if (show) {
        setTimeout(() => {
          const tempestStroke = TempestStroke.library[stroke];

          const behavior = tempestStroke ? {
            name: stroke,
            type: 'tempest-stroke',
            data: tempestStroke,
          } : this.customBehaviorLibrary[stroke];

          if (behavior.type !== 'tempest-stroke') {
            return;
          }

          this.previewParent = document.querySelector(`[data-preview-stroke="${stroke}"]`);
          this.previewParent.appendChild(this.previewElement);
          const container = this.previewParent.closest('.v-binder-follower-content');
          container.classList.add('preview-popup-container');

          previewAyva = this.createPreviewAyva();
          previewAyva.addOutput(previewEmulator);

          const uniqueAxes = Object.keys(previewAyva.axes).reduce((map, axisName) => {
            const axis = previewAyva.axes[axisName];
            map[axis.name] = axis;
            return map;
          }, {});

          Object.entries(uniqueAxes).forEach(([name]) => {
            // Reset all preview axes.
            previewAyva.$[name].value = 0.5;
          });

          previewAyva.do(new TempestStroke(behavior.data));
        }, 100);
      }
    },

    createPreviewAyva () {
      const ayva = createAyva();

      // Copy all axis limits from global Ayva instance.
      Object.keys(ayva.axes).forEach((name) => {
        ayva.updateLimits(name, this.globalAyva.$[name].min, this.globalAyva.$[name].max);
      });

      return ayva;
    },

    destroyPreview () {
      if (previewAyva) {
        previewAyva.stop();
        previewAyva = null;
      }

      if (this.previewParent) {
        this.previewParent.removeChild(this.previewElement);
        this.previewParent = null;
      }
    },
  },
};
</script>

<style scoped>

.axis {
  display: flex;
  align-items: center;
}

.preview.icon {
  color: var(--ayva-text-color-off-white);
  margin-top: 0;
  height: 20px;
  cursor: default;
}

.preview.icon[disabled] {
  cursor: not-allowed;
}

.stroke-actions {
  padding-left: 10px;
}

.settings.icon {
  width: 18px;
  outline: none;
  position: relative;
  top: 2px;
  margin-right: 3px;
}

.settings.icon[disabled] {
  opacity: 0.25;
}

.stroke-actions .settings.icon {
  top: -1px;
  margin-left: 5px;
}

.info {
  content: "Empty";
  padding: 0 var(--padding);
  margin: 2px 0;
  display: block;
  font-style: italic;
  line-height: var(--widget-height);
  opacity: 0.75;
  align-items: center;
  justify-content: center;
  display: flex;
  gap: 10px;
}

.free-play-container .title {
  display: flex;
  align-items: flex-start;
}

.free-play-container .title > *:not(.settings-container) {
  position: relative;
  top: 2px;
}

.current-stroke-container, .settings-container {
  padding-left: 25px;
  margin-left: auto;
}

.current-stroke-container {
  display: flex;
}

.tempest-stroke button:focus {
  border: none;
}

.tempest-stroke button {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  padding: 0 10px;
}

.guide {
  margin-left: auto;
  padding-left: 25px;
}

.guide a {
  color: var(--ayva-blue);
}
</style>
