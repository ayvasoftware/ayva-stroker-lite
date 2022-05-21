<template>
  <div class="container">
    <div class="range">
      <div ref="range" class="slider vertical" />
    </div>
    <div class="wave">
      <canvas ref="wave" width="435" height="100" />
    </div>

    <div class="phase-label">
      <label>Phase</label>
    </div>
    <div class="phase">
      <div ref="phase" class="slider horizontal" />
    </div>

    <div class="ecc-label">
      <label>Ecc</label>
    </div>
    <div class="ecc">
      <div ref="ecc" class="slider horizontal" />
    </div>
  </div>
</template>

<script>
import Slider from 'nouislider';
import Ayva from 'ayvajs';

export default {
  data () {
    return {
      sliderConfigs: [{
        name: 'range',
        options: {
          range: {
            min: 0,
            max: 1,
          },
          start: [0.5, 0.5],
          orientation: 'vertical',
          direction: 'rtl',
          behaviour: 'unconstrained',
        },
      }, {
        name: 'phase',
        options: {
          range: {
            min: -2,
            max: 2,
          },
          start: [0],
        },
      }, {
        name: 'ecc',
        options: {
          range: {
            min: -4,
            max: 4,
          },
          start: [0],
        },
      }],

      sliders: {},

      from: 0.5,
      to: 0.5,
      phase: 0,
      ecc: 0,
    };
  },

  mounted () {
    this.sliderConfigs.forEach((slider) => {
      const element = this.$refs[slider.name];
      this.sliders[slider.name] = { element };

      Slider.create(element, {
        tooltips: true,
        connect: true,
        ...slider.options,
      });

      const onUpdate = (value) => {
        if (slider.name === 'range') {
          this.from = Number(value[0]);
          this.to = Number(value[1]);
        } else {
          this[slider.name] = Number(value[0]);
        }

        this.plot();
      };

      element.noUiSlider.on('update', onUpdate);

      element.noUiSlider.on('change', onUpdate);

      element.querySelectorAll('.noUi-handle').forEach((handle) => {
        handle.addEventListener('dblclick', function () {
          element.noUiSlider.reset();
        });
      });
    });

    this.plot();
  },

  methods: {
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

      context.lineCap = 'round';
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.beginPath();

      context.setLineDash([3, 3]);
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

      context.strokeStyle = 'black';
      context.lineWidth = 2;
      context.stroke();
    },
  },
};
</script>

<style scoped>
  .container {
    display: grid;
    grid-template-columns: 15px 60px 1fr 60px 1fr;
    grid-template-rows: 100px;
    width: 450px;
  }

  .wave {
    grid-column: 2 / span 4;
  }

  .phase-label {
    grid-column: 2;
  }
</style>
