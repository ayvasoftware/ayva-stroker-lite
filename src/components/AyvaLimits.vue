<template>
  <div class="limits-container lil-gui root">
    <div class="title">
      Output Range
    </div>
    <div class="limits lil-gui children">
      <template v-for="axis of axes" :key="axis">
        <div
          class="limit"
          :class="axis"
        >
          <div class="axis">
            {{ axis }}
          </div>
          <div class="slider" />
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import Slider from 'nouislider';
import { makeCollapsible, has } from '../util.js';

export default {
  emits: ['update-limits'],

  data () {
    return {
      axes: ['stroke', 'forward', 'left', 'twist', 'roll', 'pitch'],
    };
  },

  mounted () {
    const savedLimits = this.load();

    this.axes.forEach((axis) => {
      const element = this.$el.querySelector(`.limit.${axis} .slider`);

      Slider.create(element, {
        start: [0, 1],
        tooltips: true,
        margin: 0.1,
        connect: true,
        range: {
          min: [0],
          max: [1],
        },
      });

      if (has(savedLimits, axis)) {
        element.noUiSlider.set(savedLimits[axis]);
      }

      element.noUiSlider.on('update', ([min, max]) => {
        this.updateLimit(axis, min, max);
      });

      element.noUiSlider.on('change', ([min, max]) => {
        this.updateLimit(axis, min, max);
      });
    });

    makeCollapsible(this.$el);
  },

  methods: {
    load () {
      return JSON.parse(localStorage.getItem('limits') || '{}');
    },

    save (axis, limits) {
      const axes = this.load();
      axes[axis] = limits;

      localStorage.setItem('limits', JSON.stringify(axes));
    },

    updateLimit (axis, min, max) {
      const limits = {
        min: Number(min),
        max: Number(max),
      };

      this.save(axis, [min, max]);

      this.$emit('update-limits', {
        name: axis,
        limits,
      });
    },
  },
};
</script>
