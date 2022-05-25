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
          <ayva-slider
            :options="sliderOptions"
            :storage="`${axis}-limit`"
            @update="onUpdate(axis, $event)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import AyvaSlider from './widgets/AyvaSlider.vue';
import { makeCollapsible } from '../util.js';

export default {
  components: {
    AyvaSlider,
  },

  emits: ['update-limits'],

  data () {
    return {
      axes: ['stroke', 'forward', 'left', 'twist', 'roll', 'pitch'],
      sliderOptions: {
        start: [0, 1],
        tooltips: true,
        margin: 0.1,
        connect: true,
        range: {
          min: [0],
          max: [1],
        },
      },
    };
  },

  mounted () {
    makeCollapsible(this.$el);
  },

  methods: {
    onUpdate (axis, values) {
      const [min, max] = values;
      this.updateLimit(axis, min, max);
    },

    updateLimit (axis, min, max) {
      const limits = {
        min: Number(min),
        max: Number(max),
      };

      this.$emit('update-limits', {
        name: axis,
        limits,
      });
    },
  },
};
</script>
