<template>
  <div class="limits-container lil-gui root">
    <div class="title">
      <span>Output Range</span>

      <ayva-connected
        :connected="device.connected"
        :mode="mode"
        @click.stop="toggleConnection"
      />

      <settings-icon :disabled="mode !== 'Stopped' || device.connected ? '' : null" class="settings icon" @click.stop />
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
            :storage-key="`${axis}-limit`"
            @update="onUpdate(axis, $event)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import AyvaSlider from './widgets/AyvaSlider.vue';
import AyvaConnected from './AyvaConnected.vue';
import { makeCollapsible } from '../lib/util.js';

export default {
  components: {
    AyvaSlider,
    AyvaConnected,
  },

  inject: {
    device: {
      from: 'globalDevice',
    },
  },

  props: {
    mode: {
      type: String,
      default: null,
    },
  },

  emits: ['update-limits', 'request-connection', 'disconnect'],

  data () {
    return {
      axes: ['stroke', 'surge', 'sway', 'twist', 'roll', 'pitch'],
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

    toggleConnection () {
      if (!this.device.connected && this.mode === 'Stopped') {
        this.$emit('request-connection');
      } else if (this.device.connected && this.mode === 'Stopped') {
        this.$emit('disconnect');
      }
    },
  },
};
</script>

<style scoped>
.limits-container.lil-gui.root {
  width: 270px;
}

.settings.icon {
  width: 18px;
  outline: none;
  position: relative;
  top: 1px;
  margin-right: 3px;
  margin-left: auto;
}

.settings.icon[disabled] {
  opacity: 0.25;
}

.title {
  display: flex;
  align-items: flex-start;
}
</style>
