<template>
  <!-- <canvas ref="canvas" :width="size" :height="size" /> -->
  <svg
    ref="knob"
    xmlns="http://www.w3.org/2000/svg"
    version="1.1"
    :width="size"
    :height="size"
    class="container"
    @mousedown="start"
    @mousemove="update"
    @wheel.prevent="wheel"
  >
    <defs>
      <radialGradient id="trackGradient">
        <stop offset="0%" stop-color="black" />
        <stop offset="95%" stop-color="var(--ayva-background-medium)" />
      </radialGradient>

      <linearGradient id="knobGradient" x1="0%" y1="0%" x2="100%" y2="0">
        <stop offset="0%" stop-color="rgb(100, 100, 100)" />
        <stop offset="50%" stop-color="rgb(48, 48, 48)" />
      </linearGradient>
    </defs>
    <!-- Track -->
    <circle :cx="center" :cy="center" :r="radius" fill="url('#trackGradient')" />

    <!-- Knob -->
    <circle class="knob" :cx="center" :cy="center" :r="radius - 2" fill="url('#knobGradient')" />

    <!-- Value -->
    <circle
      :cx="center"
      :cy="center"
      :r="radius"
      :stroke-dasharray="arcLength"
      :stroke-dashoffset="arcOffset"
      stroke="rgb(138, 99, 131)"
      stroke-width="2"
      fill="none"
    />
  </svg>
</template>

<script>
import Storage from '../../lib/ayva-storage.js';
import { clamp } from '../../lib/util.js';

const storage = new Storage('knob-value');

export default {
  props: {
    modelValue: {
      type: Number,
      default: 0,
    },

    storageKey: {
      type: String,
      default: null,
    },

    size: {
      type: Number,
      default: 18,
    },
  },

  emits: ['update:modelValue', 'change'],

  data () {
    return {
      initialValue: 0,
      active: false,
    };
  },

  computed: {
    center () {
      return this.size / 2;
    },

    radius () {
      return (this.size / 2) - 1;
    },

    arcLength () {
      return 2 * Math.PI * this.radius;
    },

    arcOffset () {
      return this.arcLength * (1 - this.modelValue);
    },
  },

  watch: {
    modelValue (value) {
      if (this.storageKey) {
        storage.save(this.storageKey, value);
      }
    },
  },

  beforeMount () {
    if (this.storageKey) {
      this.initialValue = storage.load(this.storageKey);
    }
  },

  mounted () {
    if (this.initialValue !== null && this.initialValue !== undefined) {
      this.notifyChange(this.initialValue);
    }

    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('mouseup', this.stop);
  },

  unmounted () {
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('mouseup', this.stop);
  },

  methods: {
    setValue (newValue) {
      if (this.storageKey) {
        storage.save(this.storageKey, newValue);
      }

      this.notifyChange(newValue);
    },

    notifyChange (value) {
      this.$emit('update:modelValue', value);
      this.$emit('change', value);
    },

    update (event) {
      if (this.active) {
        const tweakValue = clamp(Number((-event.movementY / 100).toFixed(2)), -1, 1);
        const newValue = clamp(this.modelValue + tweakValue, 0, 1);
        this.setValue(newValue);
      }
    },

    start () {
      this.active = true;
      this.$refs.knob.requestPointerLock();
    },

    stop () {
      if (this.active) {
        this.active = false;
        document.exitPointerLock();
      }
    },

    wheel (event) {
      const tweakValue = clamp(Number((-event.deltaY / 200).toFixed(2)), -1, 1);
      const newValue = clamp(this.modelValue + tweakValue, 0, 1);
      this.setValue(newValue);
    },

    onPointerLockChange () {
      if (document.pointerLockElement !== this.$refs.knob) {
        this.stop();
      }
    },
  },
};
</script>

<style scoped>
  .container {
    cursor: pointer;
    transform: rotate(90deg);
  }

  .knob:hover {
    filter: brightness(1.25);
  }
</style>
