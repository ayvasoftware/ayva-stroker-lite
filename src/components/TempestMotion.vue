<template>
  <div class="tempest-motion">
    <div class="range">
      <ayva-slider
        ref="rangeSlider"
        :options="rangeOptions"
        active-tooltips
        @update="onUpdateRange"
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
        :options="phaseOptions"
        active-tooltips
        @update="onUpdatePhase"
      />
    </div>

    <div class="ecc">
      <ayva-slider
        ref="eccSlider"
        :options="eccOptions"
        active-tooltips
        @update="onUpdateEcc"
      />
    </div>
  </div>
</template>

<script>
import Ayva from 'ayvajs';
import AyvaSlider from './widgets/AyvaSlider.vue';

export default {
  components: {
    AyvaSlider,
  },

  props: {
    initialParameters: {
      type: Object,
      default: () => ({
        from: 0.5,
        to: 0.5,
        phase: 0,
        ecc: 0,
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

  emits: ['update:parameters'],

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
          min: -2.5,
          max: 2.5,
        },
        start: [0],
        step: 0.05,
      },

      from: 0.5,
      to: 0.5,
      phase: 0,
      ecc: 0,

      lastFromDirection: -1,
      lastToDirection: 1,
    };
  },

  watch: {
    initialParameters: {
      immediate: true,
      deep: true,
      handler (updatedParameters) {
        this.$nextTick(() => {
          const { rangeSlider, phaseSlider, eccSlider } = this.$refs;
          // Perform this on nextTick to ensure noUiSlider is initialized...
          const {
            from, to, phase, ecc,
          } = updatedParameters;

          rangeSlider.set(from, to);
          phaseSlider.set(phase);
          eccSlider.set(ecc);
        });
      },
    },

    angle () {
      this.plot();
    },
  },

  methods: {
    onUpdateRange (values) {
      [this.from, this.to] = values;
      this.fireUpdateParameters();
    },

    onUpdatePhase (value) {
      this.phase = value;
      this.fireUpdateParameters();
    },

    onUpdateEcc (value) {
      this.ecc = value;
      this.fireUpdateParameters();
    },

    /**
     * Expand or shrink range on mouse wheel.
     */
    onWheel (event) {
      const zoom = event.deltaY * 0.003;
      const average = (this.from + this.to) / 2;

      const computeLimits = (direction) => (direction > 0 ? { min: 0, max: average } : { min: average, max: 1 });
      const format = (value, limits) => this.clamp(value, limits.min, limits.max);
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

    plot () {
      const {
        from, to, phase, ecc,
      } = this;

      const fn = (x) => {
        const value = -Math.cos(x + (Math.PI * phase) / 2 + ecc * Math.sin(x + (Math.PI * phase) / 2));

        const upperLimit = Ayva.map(from, 1, 0, 1, -1);
        const lowerLimit = Ayva.map(to, 1, 0, 1, -1);
        return Ayva.map(value, -1, 1, upperLimit, lowerLimit);
      };

      const range = [0, Math.PI * 2, -1, 1];

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

    fireUpdateParameters () {
      this.plot();

      const {
        from, to, phase, ecc,
      } = this;
      this.$emit('update:parameters', {
        from, to, phase, ecc,
      });
    },

    clamp (value, min, max) {
      return Math.max(min, Math.min(max, value));
    },
  },
};
</script>

<style scoped>
  .tempest-motion {
    display: grid;
    grid-template-columns: 15px 60px 1fr 20px 1fr;
    grid-template-rows: 100px 20px;
    width: 450px;
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

  .display-name {
    grid-column: 1 / span 2;
  }

  .display-name > label {
    position: relative;
    left: -15px;
    bottom: -3px;
    color: #6784bb;
  }

  .range .slider {
    top: 6px;
    left: 6px;
    height: 89%;
  }

  .wave canvas {
    background-color: rgb(25,25,25)
  }
</style>
