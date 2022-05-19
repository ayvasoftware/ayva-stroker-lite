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
          <div
            ref="bpm"
            class="slider"
          />
        </div>

        <div class="limit">
          <div class="axis">
            Pattern Duration
          </div>
          <div
            ref="pattern-duration"
            class="slider"
          />
        </div>

        <div class="limit">
          <div class="axis">
            Transition Duration
          </div>
          <div
            ref="transition-duration"
            class="slider"
          />
        </div>

        <div class="limit twist">
          <div class="axis">
            Enable Twist
          </div>
          <div>
            <label class="widget">
              <input
                v-model="twist"
                type="checkbox"
              >
            </label>
          </div>
        </div>

        <div class="limit">
          <div
            class="axis"
            :disabled="disableTwist"
          >
            Twist Range
          </div>
          <div
            ref="twist-range"
            class="slider"
            :disabled="disableTwist"
          />
        </div>

        <div class="limit">
          <div
            class="axis"
            :disabled="disableTwist"
          >
            Twist Phase
          </div>
          <div
            ref="twist-phase"
            class="slider"
            :disabled="disableTwist"
          />
        </div>

        <div class="limit">
          <div
            class="axis"
            :disabled="disableTwist"
          >
            Twist Eccentricity
          </div>
          <div
            ref="twist-ecc"
            class="slider"
            :disabled="disableTwist"
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
                <input
                  v-model="stroke.enabled"
                  type="checkbox"
                  @change="fireUpdateStrokes"
                >
              </div>
              <div>
                <button @click="fireSelectStroke(stroke.name)">
                  {{ stroke.name }}
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { TempestStroke } from 'ayvajs';
import Slider from 'nouislider';
import { makeCollapsible, formatter, has } from '../util.js';

export default {

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

      sliderConfigs: [{
        name: 'bpm',
        options: {
          range: {
            min: 0,
            max: 120,
          },
          start: [20, 60],
          padding: [10],
          step: 1,
          format: formatter(),
        },
      }, {
        name: 'pattern-duration',
        options: {
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
      }, {
        name: 'transition-duration',
        options: {
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
      }, {
        name: 'twist-range',
        options: {
          range: {
            min: 0,
            max: 1,
          },
          start: [0, 1],
          margin: 0.1,
        },
      }, {
        name: 'twist-phase',
        options: {
          range: {
            min: 0,
            max: 4,
          },
          start: [0],
        },
      }, {
        name: 'twist-ecc',
        options: {
          range: {
            min: 0,
            max: 1,
          },
          start: [0],
        },
      }],

      sliders: {},

      strokes: Object.keys(TempestStroke.library).sort().map((name) => ({
        name,
        enabled: true,
      })),

      initializedTwist: false,
      initializedStrokes: false,
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
        this.fireUpdateParameter('twist', value, this.initializedTwist);
        this.initializedTwist = true;
      },
    },

    strokes: {
      immediate: true,
      handler () {
        this.fireUpdateStrokes(this.initializedStrokes);
        this.initializedStrokes = true;
      },
    },
  },

  mounted () {
    const parameters = this.load();

    this.sliderConfigs.forEach((slider) => {
      const element = this.$refs[slider.name];
      this.sliders[slider.name] = element;

      Slider.create(element, {
        tooltips: true,
        connect: true,
        ...slider.options,
      });

      if (has(parameters, slider.name)) {
        element.noUiSlider.set(parameters[slider.name]);
      }

      const cleanLimits = (limits) => limits.map((l) => Number(l.replaceAll(/[a-zA-Z]/g, '')));

      element.noUiSlider.on('update', (limits) => {
        this.fireUpdateParameter(slider.name, cleanLimits(limits));
      });

      element.noUiSlider.on('change', (limits) => {
        this.fireUpdateParameter(slider.name, cleanLimits(limits));
      });
    });

    if (has(parameters, 'twist')) {
      this.twist = parameters.twist;
    }

    if (has(parameters, 'strokes')) {
      const enabledStrokes = new Set(parameters.strokes);
      this.strokes.forEach((stroke) => {
        stroke.enabled = enabledStrokes.has(stroke.name);
      });

      this.fireUpdateStrokes();
    }

    this.$el.querySelectorAll('.free-play-container').forEach((element) => {
      makeCollapsible(element);
    });
  },

  methods: {
    fireUpdateStrokes (storage = true) {
      const selectedStrokes = this.strokes.filter((s) => s.enabled).map((s) => s.name);

      if (storage) {
        this.save('strokes', selectedStrokes);
      }

      this.$emit('update-strokes', selectedStrokes);
    },

    fireUpdateParameter (name, value, storage = true) {
      if (storage) {
        this.save(name, value);
      }

      this.$emit('update-parameters', {
        name,
        value,
      });
    },

    fireSelectStroke (stroke) {
      this.$emit('select-stroke', stroke);
    },

    load () {
      return JSON.parse(localStorage.getItem('free-play-parameters') || '{}');
    },

    save (parameter, value) {
      const parameters = this.load();
      parameters[parameter] = value;

      localStorage.setItem('free-play-parameters', JSON.stringify(parameters));
    },
  },
};
</script>
