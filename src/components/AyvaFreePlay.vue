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
            storage="free-play-bpm"
            @update="onUpdate('bpm', $event)"
          />
        </div>

        <div class="limit">
          <div class="axis">
            Pattern Duration
          </div>
          <ayva-slider
            :options="patternDurationOptions"
            storage="free-play-pattern-duration"
            @update="onUpdate('pattern-duration', $event)"
          />
        </div>

        <div class="limit">
          <div class="axis">
            Transition Duration
          </div>
          <ayva-slider
            :options="transitionDurationOptions"
            storage="free-play-transition-duration"
            @update="onUpdate('transition-duration', $event)"
          />
        </div>

        <div class="limit twist">
          <div class="axis">
            Enable Twist
          </div>
          <div>
            <ayva-checkbox v-model="twist" storage="free-play-enable-twist" />
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
            storage="free-play-twist-range"
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
            storage="free-play-twist-phase"
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
            storage="free-play-twist-ecc"
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
                  :storage="`free-play-pattern-${stroke.name}`"
                  @change="fireUpdateStrokes"
                />
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
import AyvaSlider from './widgets/AyvaSlider.vue';
import AyvaCheckbox from './widgets/AyvaCheckbox.vue';
import { makeCollapsible, formatter } from '../util.js';

export default {
  components: {
    AyvaSlider,
    AyvaCheckbox,
  },

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
          max: 120,
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
          min: -2.5,
          max: 2.5,
        },
        start: [0],
      },

      strokes: Object.keys(TempestStroke.library).sort().map((name) => ({
        name,
        enabled: true,
      })),

      initialParameters: {},
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
  },
};
</script>
