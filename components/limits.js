import { html, makeCollapsible } from '../util.js';
import Slider from '../lib/nouislider.min.mjs';

export default {
  template: html`
  <div class="limits-container lil-gui root">
    <div class="title">Output Range</div>
    <div class="limits lil-gui children">

      <template v-for="axis of axes">
        <div class="limit" :class="axis.name">
          <div class="axis">{{ axis.name }}</div>
          <div class="slider"></div>
        </div>
      </template>
    </div>
  </div>
  `,

  data () {
    return {
      availableAxes: ['stroke', 'forward', 'left', 'twist', 'roll', 'pitch'],
    }
  },

  computed: {
    axes () {
      return this.availableAxes.map((name) => ({
        name,
        limits: {
          min: 0,
          max: 1,
        }
      }));
    },
  },

  mounted () {
    this.axes.forEach((axis) => {
      const element = this.$el.querySelector(`.limit.${axis.name} .slider`);

      Slider.create(element, {
        start: [0, 1],
        tooltips: true,
        margin: 0.1,
        connect: true,
        range: {
          'min': [0],
          'max': [1]
        }
      });

      element.noUiSlider.on('update', ([min, max]) => {
        axis.limits.min = min;
        axis.limits.max = max;
        this.$el.dispatchEvent(new CustomEvent('update-limits', {
          composed: true,
          bubbles: true,
          detail: axis,
        }));
      });
    });

    makeCollapsible(this.$el);
  }
};