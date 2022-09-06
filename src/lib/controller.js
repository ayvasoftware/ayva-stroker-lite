import {
  Ayva, GeneratorBehavior, TempestStroke, VariableDuration
} from 'ayvajs';
import CustomStrokeStorage from './custom-stroke-storage';

import { clamp } from './util.js';

export default class Controller extends GeneratorBehavior {
  #customStrokeStorage = new CustomStrokeStorage();

  #currentStroke = null;

  #duration = null;

  #bpm;

  * generate (ayva) {
    if (this.strokeCommand) {
      // Transition into user selected stroke and take us out of random mode.
      const stroke = this.strokeCommand;
      this.#clearState();
      yield* this.#createTransition(ayva, stroke);
    } else if (this.random && this.#readyForNextStroke()) {
      yield* this.#createTransition(ayva, this.randomStroke());
    }

    if (this.#currentStroke) {
      yield* this.#currentStroke;
    } else {
      // Waiting for a command.
      yield 0.1;
    }
  }

  #clearState () {
    this.strokeCommand = null;
    this.#duration = null;
    this.random = false;
  }

  /**
   * Add transition moves to the queue and create the current stroke.
   */
  * #createTransition (ayva, strokeConfig) {
    this.#bpm = this.#generateNextBpm();
    const bpmProvider = this.#createBpmProvider();

    if (this.#currentStroke) {
      // Create smooth transition to the next stroke.
      const duration = this.#generateTransitionDuration();
      this.#currentStroke = this.#currentStroke
        .transition(this.#createStrokeConfig(strokeConfig), bpmProvider, duration, this.#startTransition.bind(this), (config, bpm) => {
          // Make sure we use the pretransformed stroke config for the event.
          this.#endTransition(strokeConfig, bpm);
        });

      yield* this.#currentStroke;
    } else {
      // Just move to the start position for the new stroke.
      this.#currentStroke = new TempestStroke(this.#createStrokeConfig(strokeConfig), bpmProvider).bind(ayva);

      this.#startTransition(1, this.#currentStroke.bpm);
      yield* this.#currentStroke.start({ duration: 1 });
      this.#endTransition(strokeConfig, this.#currentStroke.bpm);
    }
  }

  #startTransition (duration, bpm) {
    if (this.onTransitionStart) {
      this.onTransitionStart(duration, bpm);
    }
  }

  #endTransition (strokeConfig, bpm) {
    if (this.onTransitionEnd) {
      this.onTransitionEnd(strokeConfig, bpm);
    }

    if (this.random) {
      // Start the timer for the next stroke after finishing the transition.
      this.#startTimer();
    }
  }

  #createStrokeConfig (stroke) {
    if (typeof stroke === 'string') {
      const customStrokeLibrary = this.#customStrokeStorage.load();
      const config = customStrokeLibrary[stroke] || TempestStroke.library[stroke];

      const existingTwist = config.twist || config.R0;
      const noTwist = !existingTwist || (existingTwist.from === 0.5 && existingTwist.to === 0.5);

      if (this.parameters.twist && noTwist) {
        const [from, to] = this.parameters['twist-range'];
        const phase = this.parameters['twist-phase'];
        const ecc = this.parameters['twist-ecc'];

        config.R0 = {
          from, to, phase, ecc,
        };
      }

      return config;
    }

    return stroke;
  }

  #readyForNextStroke () {
    // We're ready for the next stroke when the duration has elapsed, we have strokes available,
    // and also the user is not mucking about with the bpm slider.
    return (!this.#duration || this.#duration.complete) && this.strokes.length && !this.bpmActive;
  }

  #startTimer () {
    const [from, to] = this.parameters['pattern-duration'];
    this.#duration = new VariableDuration(from, to);
  }

  #generateTransitionDuration () {
    const [from, to] = this.parameters['transition-duration'];
    return Ayva.map(Math.random(), 0, 1, from, to);
  }

  #generateNextBpm () {
    const [from, to] = this.parameters.bpm;
    return Math.floor(Ayva.map(Math.random(), 0, 1, from, to));
  }

  #generateNextContinuousBpm (startBpm) {
    const [minBpm, maxBpm] = this.parameters.bpm;
    const [minAcc, maxAcc] = this.parameters.acceleration;
    const delta = Ayva.map(Math.random(), 0, 1, minAcc, maxAcc);
    return clamp(startBpm + (Math.random() < 0.5 ? delta : -delta), minBpm, maxBpm);
  }

  #createBpmProvider () {
    const bpmProvider = () => {
      if (!this.random || this.bpmActive || this.updatedBpm) {
        // Use user supplied bpm from slider.
        this.#bpm = this.userBpm;
        this.updatedBpm = null;
      }

      if (this.parameters['bpm-mode'] === 'continuous') {
        if (!this.bpmActive && bpmProvider.initialized) {
          const {
            startBpm, endBpm, startTime, endTime,
          } = bpmProvider;

          const time = performance.now();

          if (time >= endTime) {
            this.#bpm = endBpm;
            bpmProvider.startTime = performance.now();
            bpmProvider.endTime = bpmProvider.startTime + 1000;
            bpmProvider.startBpm = endBpm;
            bpmProvider.endBpm = this.#generateNextContinuousBpm(endBpm);
          } else {
            this.#bpm = Ayva.map(time, startTime, endTime, startBpm, endBpm);
          }

          if (this.onUpdateBpm) {
            this.onUpdateBpm(this.#bpm);
          }
        } else {
          bpmProvider.startTime = 0;
          bpmProvider.endTime = 0;
          bpmProvider.startBpm = this.#bpm;
          bpmProvider.endBpm = this.#bpm;
          bpmProvider.initialized = true;
        }
      }

      return this.#bpm;
    };

    return bpmProvider;
  }

  randomStroke () {
    return this.strokes[Math.floor(Math.random() * this.strokes.length)];
  }
}
