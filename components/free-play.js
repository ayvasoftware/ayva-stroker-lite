import { html, makeCollapsible, formatter } from '../util.js';
import { TempestStroke } from 'https://unpkg.com/ayvajs';
import Slider from '../lib/nouislider.min.mjs';

export default {
  template: html`
  <div class="free-play">
    <div class="free-play-container lil-gui root">
      <div class="title">Free Play Parameters</div>
      <div class="limits lil-gui children">
        <div class="limit">
          <div class="axis">BPM Range</div>
          <div class="slider" ref="bpm"></div>
        </div>

        <div class="limit">
          <div class="axis">Pattern Duration</div>
          <div class="slider" ref="pattern-duration"></div>
        </div>

        <div class="limit">
          <div class="axis">Transition Duration</div>
          <div class="slider" ref="transition-duration"></div>
        </div>

        <div class="limit twist">
          <div class="axis">Enable Twist</div>
          <div>
            <label class="widget">
              <input type="checkbox" v-model="twist">
            </label>
          </div>
        </div>

        <div class="limit">
          <div class="axis" :disabled="disableTwist">Twist Range</div>
          <div class="slider" :disabled="disableTwist" ref="twist-range"></div>
        </div>

        <div class="limit">
          <div class="axis" :disabled="disableTwist">Twist Phase</div>
          <div class="slider" :disabled="disableTwist" ref="twist-phase"></div>
        </div>

        <div class="limit">
          <div class="axis" :disabled="disableTwist">Twist Eccentricity</div>
          <div class="slider" :disabled="disableTwist" ref="twist-ecc"></div>
        </div>
      </div>
    </div>
    <div class="free-play-container lil-gui root">
      <div class="title">
        <span>Strokes</span>
        <span class="current-stroke-container">
          <span class="label">Playing:</span>
          <span class="current-stroke">{{ currentStrokeName }}</span>
        </div>
      <div class="limits lil-gui children">
        <div class="info">
          Select what strokes to include in free play mode, or click buttons to manually trigger a stroke
          (manually triggering a stroke will transition out of free play mode).
        </div>

        <div class="tempest-stroke-container">
          <template v-for="stroke of strokes">
            <div class="tempest-stroke">
              <div class="checkbox"><input type="checkbox" v-model="stroke.enabled" @change="fireUpdateStrokes"></div>
              <div><button @click="fireSelectStroke(stroke.name)">{{ stroke.name }}</button></div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
  
  `,

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
          format: formatter()
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
          format: formatter(1, 's')
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
          format: formatter(1, 's')
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
    }
  },

  props: ['currentStrokeName'],

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
      }
    }
  },

  computed: {
    disableTwist () {
      return !this.twist ? '' : null;
    }
  },

  methods: {
    fireUpdateStrokes () {
      this.$emit('update-strokes', this.strokes.filter(s => s.enabled).map(s => s.name));
    },

    fireUpdateParameter (name, value) {
      this.$emit('update-parameters', {
        name,
        value,
      });
    },

    fireSelectStroke (stroke) {
      this.$emit('select-stroke', stroke);
    }
  },

  mounted () {
    this.sliderConfigs.forEach((slider) => {
      const element = this.$refs[slider.name];
      this.sliders[slider.name] = element;

      Slider.create(element, {
        tooltips: true,
        connect: true,
        ...slider.options,
      });

      element.noUiSlider.on('update', (limits) => {
        this.fireUpdateParameter(slider.name, limits.map(l => Number(l.replaceAll(/[a-zA-Z]/g, ''))));
      });
    });

    this.$el.querySelectorAll('.free-play-container').forEach((element) => {
      makeCollapsible(element);
    });
  }
};