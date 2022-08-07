import {
  Ayva, GeneratorBehavior, TempestStroke, VariableDuration
} from 'ayvajs';
import CustomStrokeStorage from './custom-stroke-storage';

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

    const bpmProvider = () => {
      if (!this.random || this.bpmActive || this.updatedBpm) {
        this.#bpm = this.userBpm;
        this.updatedBpm = null;
      }

      return this.#bpm;
    };

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

  randomStroke () {
    return this.strokes[Math.floor(Math.random() * this.strokes.length)];
  }
}
