import {
  Ayva, GeneratorBehavior, TempestStroke, VariableDuration
} from 'ayvajs';
import _ from 'lodash';
import CustomBehaviorStorage from './custom-behavior-storage';
import ScriptRunner from './script-runner';

import { clamp, createConstantProperty, eventMixin } from './util.js';

const STATE = {
  TRANSITION_MANUAL: 0,
  TRANSITION_FREE_PLAY: 1,
  STROKING: 2,
};

const scriptGlobals = {};

class Controller extends GeneratorBehavior {
  #customBehaviorStorage = new CustomBehaviorStorage();

  #currentBehavior = null;

  #manualBehavior = null;

  #freePlay = false;

  #duration = null;

  #bpm;

  constructor () {
    super();

    createConstantProperty(this, 'bpmSliderState', {
      active: false,
      updated: false,
      value: null,
    });

    Object.keys(scriptGlobals).forEach((key) => {
      delete scriptGlobals[key];
    });
  }

  * generate (ayva) {
    switch (this.#computeState(ayva)) {
      case STATE.TRANSITION_MANUAL:
        yield* this.#createTransition(ayva, this.#manualBehavior);
        this.#resetManualMode();

        break;
      case STATE.TRANSITION_FREE_PLAY:
        yield* this.#createTransition(ayva, _.sample(this.strokes));

        break;
      case STATE.STROKING:
        if (this.#currentBehavior instanceof TempestStroke) {
          yield* this.#currentBehavior;
        } else {
          yield this.#currentBehavior.next();
        }

        break;
      default:
        // Waiting for a command.
        yield 0.1;
    }
  }

  startManualMode (stroke) {
    this.#manualBehavior = stroke;
  }

  startFreePlayMode () {
    this.#freePlay = true;

    if (this.#isScript()) {
      // TODO: No... don't want to muck about with the behavior's complete status manually.
      this.#currentBehavior.complete = true;
    }
  }

  resetTimer () {
    if (this.#freePlay) {
      const [from, to] = this.parameters['pattern-duration'];

      if (from === to) {
        this.#duration = new VariableDuration(from);
      } else {
        this.#duration = new VariableDuration(from, to);
      }
    }
  }

  #computeState (ayva) {
    if (this.#manualBehavior) {
      return STATE.TRANSITION_MANUAL;
    }

    if (this.#freePlay && this.#readyForNextStroke()) {
      return STATE.TRANSITION_FREE_PLAY;
    } else if (!this.#freePlay && this.#isScriptAndComplete()) {
      // If a behavior completes itself in manual mode, simply stop().
      ayva.stop();
      return null;
    }

    if (this.#currentBehavior) {
      return STATE.STROKING;
    }

    return null;
  }

  #resetManualMode () {
    this.#manualBehavior = null;
    this.#duration = null;
    this.#freePlay = false;
  }

  * #createTransition (ayva, name) {
    const customBehaviorLibrary = this.#customBehaviorStorage.load();

    if (customBehaviorLibrary[name]?.type === 'ayvascript') {
      this.#currentBehavior = this.#createScriptRunner(customBehaviorLibrary[name].data.script).bind(ayva);
      this.#currentBehavior.on('error', (error) => this.$emit('script-error', name, error));
      this.$emit('update-current-behavior', name);
      this.$emit('toggle-bpm-enabled', false);
      this.resetTimer();
    } else {
      yield* this.#transitionTempestStroke(ayva, name);
    }
  }

  * #transitionTempestStroke (ayva, strokeConfig) {
    this.#bpm = this.#generateNextBpm();
    const bpmProvider = this.#createBpmProvider();

    if (this.#currentBehavior instanceof TempestStroke || scriptGlobals.output instanceof TempestStroke) {
      const currentStroke = this.#currentBehavior instanceof TempestStroke ? this.#currentBehavior : scriptGlobals.output;
      // Create smooth transition to the next stroke.
      const duration = this.#generateTransitionDuration();
      this.#currentBehavior = currentStroke
        .transition(this.#createStrokeConfig(strokeConfig), bpmProvider, duration, this.#startTransition.bind(this), ($, bpm) => {
          // Make sure we use the pretransformed stroke config for the event.
          this.#endTransition(strokeConfig, bpm);
        });

      scriptGlobals.output = null;

      yield* this.#currentBehavior;
    } else {
      // Just move to the start position for the new stroke.
      this.#currentBehavior = new TempestStroke(this.#createStrokeConfig(strokeConfig), bpmProvider).bind(ayva);

      this.#startTransition(1, this.#currentBehavior.bpm);
      yield* this.#currentBehavior.start({ duration: 1, value: Ayva.RAMP_PARABOLIC });
      this.#endTransition(strokeConfig, this.#currentBehavior.bpm);
    }
  }

  #isScriptAndComplete () {
    return this.#isScript() && this.#currentBehavior.complete;
  }

  #isScript () {
    return this.#currentBehavior instanceof ScriptRunner;
  }

  #startTransition (duration, bpm) {
    this.$emit('transition-start', duration, bpm);
  }

  #endTransition (strokeConfig, bpm) {
    this.$emit('transition-end', strokeConfig, bpm);

    // Start the timer for the next stroke after finishing the transition.
    this.resetTimer();
  }

  #createStrokeConfig (stroke) {
    if (typeof stroke === 'string') {
      const customBehaviorLibrary = this.#customBehaviorStorage.load();
      const config = customBehaviorLibrary[stroke]?.data || TempestStroke.library[stroke];

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
    const ready = (!this.#duration || this.#duration.complete) && this.strokes.length && !this.bpmSliderState.active;

    // ... OR, if we are a script behavior and have completed.
    return (ready && !this.#isScript()) || this.#isScriptAndComplete();
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
      if (!this.#freePlay || this.bpmSliderState.active || this.bpmSliderState.updated) {
        // Use user supplied bpm from slider.
        this.#bpm = this.bpmSliderState.value;
        this.bpmSliderState.updated = false;
      }

      if (this.parameters['bpm-mode'] === 'continuous') {
        if (!this.bpmSliderState.active && bpmProvider.initialized) {
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

          this.$emit('update-bpm', this.#bpm);
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

  #createScriptRunner (script) {
    const parameters = Object.keys(this.parameters).reduce((result, key) => {
      Object.defineProperty(result, _.camelCase(key), {
        enumerable: true,
        get: () => this.parameters[key],
      });

      return result;
    }, {});

    if (this.#currentBehavior instanceof TempestStroke) {
      scriptGlobals.input = this.#currentBehavior;
    } else if (this.#currentBehavior instanceof ScriptRunner) {
      scriptGlobals.input = scriptGlobals.output;
    } else {
      scriptGlobals.input = null;
    }

    scriptGlobals.output = null;

    scriptGlobals.parameters = parameters;

    Object.defineProperty(scriptGlobals, 'mode', {
      configurable: true,
      enumerable: true,
      get: () => (this.#freePlay ? 'freePlay' : 'manual'),
    });

    return new ScriptRunner(script, {
      GLOBALS: scriptGlobals,
    });
  }
}

Object.assign(Controller.prototype, eventMixin);

export default Controller;
