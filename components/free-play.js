import { html, makeCollapsible, formatter } from '../util.js';
import { TempestStroke } from 'https://unpkg.com/ayvajs';
import Slider from '../lib/nouislider.min.mjs';

export default {
  template: html`
  <div class="free-play">
    <div class="free-play-container lil-gui root">
      <div class="title">Free Play Parameters</div>
      <div class="limits lil-gui children">
        <div class="limit bpm">
          <div class="axis">BPM Range</div>
          <div class="slider"></div>
        </div>

        <div class="limit pattern-duration">
          <div class="axis">Pattern Duration</div>
          <div class="slider"></div>
        </div>

        <div class="limit transition-duration">
          <div class="axis">Transition Duration</div>
          <div class="slider"></div>
        </div>

        <div class="limit twist">
          <div class="axis">Enable Twist</div>
          <div>
            <label class="widget">
              <input type="checkbox" v-model="twist">
            </label>
          </div>
        </div>

        <div class="limit twist-range">
          <div class="axis" disabled>Twist Range</div>
          <div class="slider" disabled></div>
        </div>

        <div class="limit twist-phase">
          <div class="axis" disabled>Twist Phase</div>
          <div class="slider" disabled></div>
        </div>

        <div class="limit twist-ecc">
          <div class="axis" disabled>Twist Eccentricity</div>
          <div class="slider" disabled></div>
        </div>
      </div>
    </div>
    <div class="free-play-container lil-gui root">
      <div class="title">Strokes</div>
      <div class="limits lil-gui children">
        <div class="info">
          Select what strokes to include in free play mode, or click buttons to manually trigger a stroke
          (manually triggering a stroke will transition out of free play mode).
        </div>

        <div class="tempest-stroke-container">
          <template v-for="stroke of strokes">
            <div class="tempest-stroke">
              <div class="checkbox"><input type="checkbox" v-model="stroke.enabled"></div>
              <div><button>{{ stroke.name }}</button></div>
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
          start: [5, 10],
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

  watch: {
    twist (value) {
      const classes = ['twist-range', 'twist-phase', 'twist-ecc'];

      if (!value) {
        classes.forEach((clazz) => {
          this.$el.querySelector(`.${clazz} > .axis`).setAttribute('disabled', true);
          this.$el.querySelector(`.${clazz} > .slider`).setAttribute('disabled', true);
        });
      } else {
        classes.forEach((clazz) => {
          this.$el.querySelector(`.${clazz} > .axis`).removeAttribute('disabled');
          this.$el.querySelector(`.${clazz} > .slider`).removeAttribute('disabled');
        });
      }
    }
  },


  mounted () {
    const sliderElement = (className) => this.$el.querySelector(`.limit.${className} .slider`);

    this.sliderConfigs.forEach((slider) => {
      const element = sliderElement(slider.name);
      this.sliders[slider.name] = element;

      Slider.create(element, {
        tooltips: true,
        connect: true,
        ...slider.options,
      });

      element.noUiSlider.on('update', (arg) => {
        this.$el.dispatchEvent(new CustomEvent('update-free-play', {
          composed: true,
          bubbles: true,
          detail: arg
        }));
      });
    });

    this.$el.querySelectorAll('.free-play-container').forEach((element) => {
      makeCollapsible(element);
    });
  }
};