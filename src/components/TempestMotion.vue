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

    <n-popselect v-model:value="selectedMotion" class="motion" trigger="click" :options="motionOptions" :render-label="renderMotionLabel">
      <function-icon class="function icon" />
    </n-popselect>
  </div>
</template>

<script>
import { Ayva } from 'ayvajs';
import { h, nextTick } from 'vue';
import AyvaSlider from './widgets/AyvaSlider.vue';
import { clamp } from '../lib/util.js';
import SineIcon from '../assets/icons/sine.svg';
import ParabolaIcon from '../assets/icons/parabola.svg';
import LinearIcon from '../assets/icons/linear.svg';

export default {
  components: {
    AyvaSlider,
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
    const watchProperties = ['from', 'to', 'phase', 'ecc'];

    watchProperties.forEach((prop) => this.$watch(prop, () => {
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
        from, to, phase, ecc, motion,
      } = this;

      const fn = (x) => {
        if (motion && motion.name === 'parabolicMotion') {
          return this.parabolicMotion(from, to, phase, ecc, x);
        } else if (motion && motion.name === 'linearMotion') {
          return this.linearMotion(from, to, phase, ecc, x);
        }

        return this.sinMotion(from, to, phase, ecc, x);
      };

      const range = [0, Math.PI * 2, 0, 1];

      const canvas = this.$refs.wave;
      const context = canvas.getContext('2d');
      const { width, height } = canvas;

      const widthScale = (width / (range[1] - range[0]));
      const heightScale = ((height - 12) / (range[3] - range[2]));

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.beginPath();

      let firstPoint = true;
      for (let x = 0; x < width; x++) {
        const xFnVal = (x / widthScale) - range[0];
        let yGVal = (fn(xFnVal) - range[2]) * heightScale;

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
      context.strokeStyle = 'rgb(138, 99, 131)';
      context.lineWidth = 2;
      context.stroke();
      context.closePath();

      // Plot angle.
      const angleScale = (this.angle % (Math.PI * 2)) / (Math.PI * 2);
      const x = angleScale * width;
      const y = height - 6 - (fn((x / widthScale) - range[0]) - range[2]) * heightScale;

      context.beginPath();
      context.arc(x, y, 4, 0, 2 * Math.PI);
      context.fillStyle = 'rgb(138, 99, 131)'; // '#6784bb';
      context.fill();
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
        from, to, phase, ecc, motion,
      } = this;
      this.$emit('update:modelValue', {
        from, to, phase, ecc, motion,
      });
    },

    changed (updated) {
      return !!Object.keys(updated).filter((param) => updated[param] !== this[param]).length;
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
    grid-template-columns: 15px 60px 1fr 20px 1fr 20px 20px;
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

  .function {
    width: 16px;
    grid-column: 7;
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

  .wave canvas {
    background-color: var(--ayva-background-medium);
  }
</style>
