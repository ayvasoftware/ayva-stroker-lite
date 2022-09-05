<template>
  <div class="tempest-motion">
    <div class="range">
      <ayva-slider
        ref="rangeSlider"
        v-model="range"
        :options="rangeOptions"
        active-tooltips
      />
    </div>
    <div class="wave">
      <canvas ref="wave" width="435" height="100" @wheel.prevent="onWheel" />
    </div>

    <div class="display-name">
      <label>{{ displayName }}</label>
    </div>

    <div class="phase">
      <ayva-slider
        ref="phaseSlider"
        v-model="phase"
        :options="phaseOptions"
        active-tooltips
      />
    </div>

    <div class="ecc">
      <ayva-slider
        ref="eccSlider"
        v-model="ecc"
        :options="eccOptions"
        active-tooltips
      />
    </div>

    <ayva-knob v-model="noise.from" class="noise from" />
    <ayva-knob v-model="noise.to" class="noise to" />

    <n-popselect
      v-model:value="selectedMotion"
      placement="bottom-start"
      class="motion" trigger="click"
      :options="motionOptions"
      :render-label="renderMotionLabel"
    >
      <function-icon class="function icon" />
    </n-popselect>
  </div>
</template>

<script>
import { Ayva } from 'ayvajs';
import { h, nextTick } from 'vue';
import AyvaSlider from './widgets/AyvaSlider.vue';
import AyvaKnob from './widgets/AyvaKnob.vue';
import { clamp } from '../lib/util.js';
import SineIcon from '../assets/icons/sine.svg';
import ParabolaIcon from '../assets/icons/parabola.svg';
import LinearIcon from '../assets/icons/linear.svg';

export default {
  components: {
    AyvaSlider,
    AyvaKnob,
  },

  props: {
    /**
     * The model value of a TempestMotion is a parameters object with from, to, phase, ecc, and motion properties.
     */
    modelValue: {
      type: Object,
      default: () => ({
        from: 0.5,
        to: 0.5,
        phase: 0,
        ecc: 0,
        noise: {
          from: 0,
          to: 0,
        },
        motion: Ayva.tempestMotion,
      }),
    },

    displayName: {
      type: String,
      default: '',
    },

    angle: {
      type: Number,
      default: 0,
    },
  },

  emits: ['update:modelValue'],

  data () {
    return {
      rangeOptions: {
        animate: false,
        range: {
          min: 0,
          max: 1,
        },
        start: [0.5, 0.5],
        orientation: 'vertical',
        direction: 'rtl',
        behaviour: 'unconstrained',
        step: 0.01,
      },
      phaseOptions: {
        range: {
          min: -4,
          max: 4,
        },
        start: [0],
        step: 0.05,
      },
      eccOptions: {
        range: {
          min: -1,
          max: 1,
        },
        start: [0],
        step: 0.05,
      },
      motionOptions: [{
        label: 'Sinusoidal',
        value: 'Ayva.tempestMotion',
      }, {
        label: 'Parabolic',
        value: 'Ayva.parabolicMotion',
      }, {
        label: 'Linear',
        value: 'Ayva.linearMotion',
      }],

      from: 0.5,
      to: 0.5,
      phase: 0,
      ecc: 0,
      motion: Ayva.tempestMotion,
      noise: {
        from: 0,
        to: 0,
      },
      current: {
        from: 0.5,
        to: 0.5,
      },

      selectedMotion: 'Ayva.tempestMotion',

      lastFromDirection: 1,
      lastToDirection: -1,
    };
  },

  computed: {
    range: {
      get () {
        return [this.from, this.to];
      },

      set (value) {
        [this.from, this.to] = value;
      },
    },
  },

  watch: {
    modelValue: {
      immediate: true,
      deep: true,
      handler (updated) {
        nextTick(() => {
          // TODO: Truly understand why this must be done on the next tick to work...
          if (this.changed(updated)) {
            const { rangeSlider, phaseSlider, eccSlider } = this.$refs;

            rangeSlider.set(updated.from, updated.to);
            phaseSlider.set(updated.phase);
            eccSlider.set(updated.ecc);

            this.motion = updated.motion;
            this.noise = typeof updated.noise === 'object' ? updated.noise : {
              from: updated.noise,
              to: updated.noise,
            };

            this.current = updated.$current;

            if (this.motion) {
              this.selectedMotion = `Ayva.${this.motion.name}`;
            } else {
              this.selectedMotion = 'Ayva.tempestMotion';
            }
          }
        });
      },
      flush: 'post',
    },

    angle () {
      this.plot();
    },

    selectedMotion (updatedMotion) {
      this.motion = eval(updatedMotion); // eslint-disable-line no-eval
      this.updateModelValue();
    },
  },

  mounted () {
    const watchProperties = ['from', 'to', 'phase', 'ecc', 'noise.from', 'noise.to'];

    watchProperties.forEach((prop) => this.$watch(prop, (value) => {
      if (prop === 'from') {
        this.current.from = value;
      } else if (prop === 'to') {
        this.current.to = value;
      }

      this.plot();
      this.updateModelValue();
    }));
  },

  methods: {
    /**
     * Expand or shrink range on mouse wheel.
     */
    onWheel (event) {
      const zoom = event.deltaY * 0.003;
      const average = (this.from + this.to) / 2;

      const computeLimits = (direction) => (direction > 0 ? { min: 0, max: average } : { min: average, max: 1 });
      const format = (value, limits) => clamp(value, limits.min, limits.max);
      const computeDirection = (value) => {
        const distance = average - value;

        if (distance > 0) {
          return 1;
        } else if (distance < 0) {
          return -1;
        }

        return 0;
      };

      let targetFrom;
      let targetTo;

      const fromDirection = computeDirection(this.from) || this.lastFromDirection;
      const toDirection = computeDirection(this.to) || this.lastToDirection;

      const fromLimits = computeLimits(fromDirection);
      const toLimits = computeLimits(toDirection);

      targetFrom = this.from + zoom * fromDirection;
      targetTo = this.to + zoom * toDirection;

      targetFrom = format(targetFrom, fromLimits);
      targetTo = format(targetTo, toLimits);

      this.$refs.rangeSlider.set(targetFrom, targetTo);

      this.lastFromDirection = fromDirection;
      this.lastToDirection = toDirection;
    },

    /**
     * Plot the sin wav graph.
     */
    plot () {
      const {
        from, to, phase, ecc, motion, noise, current,
      } = this;

      const mainFn = this.createPlotFunction(from, to, phase, ecc, motion);

      const { width, height } = this.getScale();

      const context = this.getContext();
      context.clearRect(0, 0, width, height);

      this.plotMotion(mainFn, this.getPlotColor());
      this.plotProgressDot(this.createPlotFunction(current.from, current.to, phase, ecc, motion));

      if (noise.from || noise.to) {
        for (let delta = 0; delta < 1; delta += 0.1) {
          const fromNoisy = from + ((to - from) / 2) * ((noise.from || 0) * delta);
          const toNoisy = to + ((from - to) / 2) * ((noise.to || 0) * (1 - delta));

          const noiseFn = this.createPlotFunction(fromNoisy, toNoisy, phase, ecc, motion);
          this.plotMotion(noiseFn, this.getPlotColor(0.1));
        }
      }
    },

    plotMotion (fn, style) {
      const context = this.getContext();
      const {
        width, height, widthScale, heightScale,
      } = this.getScale();

      context.beginPath();

      let firstPoint = true;
      for (let x = 0; x < width; x++) {
        const xFnVal = (x / widthScale);
        let yGVal = (fn(xFnVal) - 0) * heightScale;

        yGVal = height - 6 - yGVal;

        if (firstPoint) {
          context.moveTo(x, yGVal);
          firstPoint = false;
        } else {
          context.lineTo(x, yGVal);
        }
      }

      context.lineCap = 'round';
      context.setLineDash([3, 3]);
      context.strokeStyle = style;
      context.lineWidth = 2;
      context.stroke();
      context.closePath();
    },

    plotProgressDot (fn) {
      const context = this.getContext();
      const {
        width, height, widthScale, heightScale,
      } = this.getScale();

      const angleScale = (this.angle % (Math.PI * 2)) / (Math.PI * 2);
      const x = angleScale * width;
      const y = height - 6 - (fn((x / widthScale)) - 0) * heightScale;

      context.beginPath();
      context.arc(x, y, 4, 0, 2 * Math.PI);
      context.fillStyle = this.getPlotColor();
      context.fill();
    },

    createPlotFunction (from, to, phase, ecc, motion) {
      return (x) => {
        if (motion && motion.name === 'parabolicMotion') {
          return this.parabolicMotion(from, to, phase, ecc, x);
        } else if (motion && motion.name === 'linearMotion') {
          return this.linearMotion(from, to, phase, ecc, x);
        }

        return this.sinMotion(from, to, phase, ecc, x);
      };
    },

    getContext () {
      return this.$refs.wave.getContext('2d');
    },

    getScale () {
      const { width, height } = this.$refs.wave;
      const widthScale = (width / (Math.PI * 2));
      const heightScale = height - 12;

      return {
        width, height, widthScale, heightScale,
      };
    },

    getPlotColor (opacity = 1) {
      return `rgba(138, 99, 131, ${opacity})`;
    },

    sinMotion (from, to, phase, ecc, startAngle) {
      const scale = 0.5 * (to - from);
      const midpoint = 0.5 * (to + from);

      const angle = startAngle + (0.5 * Math.PI * phase);
      return midpoint - scale * Math.cos(angle + (ecc * Math.sin(angle)));
    },

    parabolicMotion (from, to, phase, ecc, startAngle) {
      const { sin, PI } = Math;

      const scale = to - from;
      const offset = to;
      const angle = startAngle + (0.5 * PI * phase);

      const x = (this.mod(angle, (2 * PI)) / PI) - 1 + (ecc / PI) * sin(angle);

      return offset - scale * x * x;
    },

    linearMotion (from, to, phase, ecc, startAngle) {
      const { abs, sin, PI } = Math;

      const scale = to - from;
      const offset = to;
      const angle = startAngle + (0.5 * PI * phase);

      const x = (this.mod(angle, (2 * PI)) / PI) - 1 + (ecc / PI) * sin(angle);

      return offset - scale * abs(x);
    },

    mod (a, b) {
      return ((a % b) + b) % b; // Proper mathematical modulus operator.
    },

    updateModelValue () {
      const {
        from, to, phase, ecc, motion, noise, current,
      } = this;

      this.$emit('update:modelValue', {
        from, to, phase, ecc, motion, noise, $current: current,
      });
    },

    changed (updated) {
      const changedProps = Object.keys(updated).filter(
        (param) => {
          if (param === '$current') {
            return updated.$current.from !== this.current.from || updated.$current.to !== this.current.to;
          }

          return updated[param] !== this[param];
        }
      );

      return !!changedProps.length;
    },

    renderMotionLabel (option) {
      let icon;

      switch (option.label) {
        case 'Sinusoidal':
          icon = SineIcon;
          break;
        case 'Parabolic':
          icon = ParabolaIcon;
          break;
        case 'Linear':
          icon = LinearIcon;
          break;
        default:
      }

      return h('div', { style: 'display: flex' }, [h(icon, {
        style: 'width: 25px; height: 20px; position: relative; left: -2px;',
      }), h('span', [option.label])]);
    },
  },
};
</script>

<style scoped>
  .tempest-motion {
    display: grid;
    grid-template-columns: 15px 60px 1fr 20px 1fr 20px 20px 20px;
    grid-template-rows: 100px 20px;
    width: 450px;
  }

  .tempest-motion[disabled] > * {
    pointer-events: none;
  }

  .wave {
    grid-column: 2 / span 4;
  }

  .phase {
    grid-column: 3;
  }

  .ecc {
    grid-column: 5;
  }

  .noise {
    top: 1px;
    position: relative;
  }

  .noise.from {
    grid-column: 7
  }

  .noise.to {
    grid-column: 8
  }

  .function {
    width: 16px;
    grid-column: 9;
    color: var(--ayva-text-color-light-gray);
  }

  .display-name {
    grid-column: 1 / span 2;
  }

  .display-name > label {
    position: relative;
    left: -15px;
    bottom: -3px;
    color: #6784bb;
    font-size: 12px;
  }

  .range .slider {
    top: 6px;
    left: 6px;
    height: 89%;
  }

  .slider.horizontal {
    top: 9px;
  }

  .wave canvas {
    background-color: var(--ayva-background-medium);
  }
</style>
