<template>
  <div class="free-play">
    <div class="free-play-container lil-gui root">
      <div class="title">
        Free Play Parameters
      </div>
      <div class="limits lil-gui children">
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
    <div class="free-play-container lil-gui root">
      <div class="title">
        <span>Strokes</span>
        <span class="current-stroke-container">
          <span class="label">Playing:</span>
          <span class="current-stroke">{{ currentStrokeName }}</span>
        </span>
      </div>
      <div class="limits lil-gui children">
        <div class="info">
          Select what strokes to include in free play mode, or click buttons to manually trigger a stroke
          (manually triggering a stroke will transition out of free play mode).
        </div>

        <div class="tempest-stroke-container">
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
                <button @click="fireSelectStroke(stroke.name)">
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
                    <eye-icon class="preview icon" />
                  </template>
                  <div :data-preview-stroke="stroke.name" />
                </n-popover>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Ayva, { TempestStroke } from 'ayvajs';
import OSREmulator from 'osr-emu';
import AyvaSlider from './widgets/AyvaSlider.vue';
import AyvaCheckbox from './widgets/AyvaCheckbox.vue';
import { makeCollapsible, formatter } from '../lib/util.js';
import EyeIcon from '../assets/icons/eye.svg';

let previewAyva = null;
let previewEmulator = null;

export default {
  components: {
    AyvaSlider,
    AyvaCheckbox,
    EyeIcon,
  },

  inject: ['globalAyva'],

  props: {
    currentStrokeName: {
      type: String,
      default: null,
    },
  },

  emits: ['update-parameters', 'update-strokes', 'select-stroke'],

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
      patternDurationOptions: {
        range: {
          min: 0,
          max: 30,
        },
        start: [5, 10],
        padding: [1],
        step: 0.1,
        margin: 3,
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
        margin: 3,
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

      strokes: Object.keys(TempestStroke.library).sort().map((name) => ({
        name,
        enabled: true,
      })),

      initialParameters: {},

      previewElement: null,
      previewParent: null,
    };
  },

  computed: {
    disableTwist () {
      return !this.twist ? '' : null;
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
  },

  mounted () {
    this.$el.querySelectorAll('.free-play-container').forEach((element) => {
      makeCollapsible(element);
    });

    this.previewElement = document.createElement('div');
    this.previewElement.classList.add('preview-popup');

    previewEmulator = new OSREmulator(this.previewElement);
  },

  methods: {
    onUpdate (name, value) {
      this.fireUpdateParameter(name, value);
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
          this.previewParent = document.querySelector(`[data-preview-stroke="${stroke}"]`);
          this.previewParent.appendChild(this.previewElement);
          const container = this.previewParent.closest('.v-binder-follower-content');
          container.classList.add('preview-popup-container');

          previewAyva = this.createPreviewAyva();
          previewAyva.addOutputDevice(previewEmulator);
          previewAyva.do(new TempestStroke(stroke)); // TODO: Support custom strokes too...
        }, 100);
      }
    },

    createPreviewAyva () {
      const ayva = new Ayva().defaultConfiguration();

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
.preview.icon {
  color: var(--ayva-text-color-off-white);
  margin-top: 0;
  height: 20px;
}

.stroke-actions {
  padding-left: 10px;
}
</style>
