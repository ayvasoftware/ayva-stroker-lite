<template>
  <div ref="slider" class="slider" :class="sliderClass" />
</template>

<script>
import Slider from 'nouislider';
import _ from 'lodash';

export default {
  expose: ['set', 'get'],

  props: {
    options: {
      type: Object,
      default: () => {},
    },

    activeTooltips: {
      type: Boolean,
      default: false,
    },

    storage: {
      type: String,
      default: null,
    },

    modelValue: {
      type: [Number, Array],
      default: null,
    },
  },

  emits: ['update', 'update:modelValue', 'change', 'start', 'end'],

  data () {
    return {
      value: null,
      defaultOptions: {
        tooltips: true,
        connect: true,
        orientation: 'horizontal',
      },
      slider: null,

      storageNamespace: 'ayva-stroker',
    };
  },

  computed: {
    mergedOptions () {
      return {
        ...this.defaultOptions,
        ...this.options,
      };
    },

    sliderClass () {
      return [this.mergedOptions.orientation, {
        'active-tooltips': this.activeTooltips,
      }];
    },
  },

  watch: {
    mergedOptions () {
      this.initSlider();
    },

    modelValue (newValue) {
      if (!_.isEqual(newValue, this.value)) {
        if (newValue.length) {
          this.slider.set(...newValue);
        } else {
          this.slider.set(newValue);
        }
      }
    },
  },

  beforeMount () {
    if (this.storage) {
      this.value = JSON.parse(localStorage.getItem(this.getStorageKey()));
    }
  },

  mounted () {
    this.initSlider();
  },

  methods: {
    cleanValue (value) {
      return Number(value.replaceAll(/[a-zA-Z]/g, ''));
    },

    onUpdate (values) {
      if (values.length === 1) {
        this.value = this.cleanValue(values[0]);
      } else {
        this.value = values.map((v) => this.cleanValue(v));
      }

      if (this.storage) {
        this.save();
      }

      this.$emit('update', this.value);
      this.$emit('update:modelValue', this.value);
    },

    initSlider () {
      const initialValue = this.value;
      const element = this.$refs.slider;

      if (this.slider) {
        this.slider.destroy();
      }

      this.slider = Slider.create(element, this.mergedOptions);

      this.slider.on('update', this.onUpdate);
      this.slider.on('change', (...args) => {
        this.onUpdate(...args);
        this.$emit('change', ...args);
      });
      this.slider.on('start', (...args) => {
        this.$emit('start', ...args);
      });
      this.slider.on('end', (...args) => {
        this.$emit('end', ...args);
      });

      element.querySelectorAll('.noUi-handle').forEach((handle) => {
        handle.addEventListener('dblclick', () => {
          this.slider.reset();
        });
      });

      if (initialValue) {
        this.slider.set(initialValue);
      }
    },

    save () {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(this.value));
    },

    getStorageKey () {
      return `${this.storageNamespace}-slider--${this.storage}`;
    },

    set (...values) {
      this.slider.set(values);
    },

    get () {
      const value = this.slider.get();

      if (value.length === 1) {
        return value[0];
      }

      return value;
    },
  },
};
</script>

<style src="../../assets/nouislider.css"></style>
<style src="../../assets/ayva-sliders.css"></style>
