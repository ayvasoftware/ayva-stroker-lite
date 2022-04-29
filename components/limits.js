import { html, makeCollapsible } from '../util.js';
import Slider from '../lib/nouislider.min.mjs';

export default {
  template: html`
  <div class="limits-container lil-gui root">
    <div class="title">Output Range</div>
    <div class="limits lil-gui children">

      <template v-for="axis of axes">
        <div class="limit" :class="axis">
          <div class="axis">{{ axis }}</div>
          <div class="slider"></div>
        </div>
      </template>
    </div>
  </div>
  `,

  data () {
    return {
      axes: ['stroke', 'forward', 'left', 'twist', 'roll', 'pitch'],
    }
  },

  mounted () {
    this.axes.forEach((axis) => {
      const element = this.$el.querySelector(`.limit.${axis} .slider`);

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
        this.$emit('update-limits', {
          name: axis,
          limits: {
            min: Number(min),
            max: Number(max),
          },
        });
      });
    });

    makeCollapsible(this.$el);
  }
};