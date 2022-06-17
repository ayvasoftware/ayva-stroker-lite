import Ayva, { AyvaBehavior, TempestStroke, VariableDuration } from 'ayvajs';
import CustomStrokeStorage from './custom-stroke-storage';

export default class Controller extends AyvaBehavior {
  #customStrokeStorage = new CustomStrokeStorage();

  #currentStroke = null;

  #duration = null;

  #bpm;

  generateActions (ayva) {
    if (this.strokeCommand) {
      // Transition into user selected stroke and take us out of random mode.
      const stroke = this.strokeCommand;
      this.#clearState();
      this.#queueTransition(ayva, stroke);
    } else if (this.random && this.#readyForNextStroke()) {
      this.#queueTransition(ayva, this.randomStroke());
    }

    if (this.#currentStroke) {
      this.queueBehavior(this.#currentStroke, 1);
    } else {
      // Waiting for a command.
      this.queueSleep(0.1);
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
  #queueTransition (ayva, strokeConfig) {
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

      const { transitionStroke, nextStroke } = this.#currentStroke.createTransition(
        duration,
        this.#createStrokeConfig(strokeConfig),
        bpmProvider,
      );

      this.#currentStroke = nextStroke;
      this.#queueTransitionStartEvent(duration, nextStroke.bpm);
      this.queueBehavior(transitionStroke, 1, ayva);
    } else {
      // Just move to the start position for the new stroke.
      this.#currentStroke = new TempestStroke(this.#createStrokeConfig(strokeConfig), bpmProvider);
      this.#queueTransitionStartEvent(1, this.#currentStroke.bpm);
      this.queueMove(...this.#currentStroke.getStartMoves(ayva, { duration: 1 }));
    }

    this.#queueTransitionEndEvent(strokeConfig, this.#currentStroke.bpm);

    if (this.random) {
      this.queueFunction(() => {
        // Start the timer for the next stroke after finishing the transition.
        this.#startTimer();
      });
    }
  }

  #createStrokeConfig (stroke) {
    if (typeof stroke === 'string') {
      const customStrokeLibrary = this.#customStrokeStorage.load();
      const config = customStrokeLibrary[stroke] || TempestStroke.library[stroke];

      if (this.parameters.twist) {
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

  #queueTransitionStartEvent (duration, targetBpm) {
    this.queueFunction(() => {
      if (this.onTransitionStart) {
        this.onTransitionStart(duration, targetBpm);
      }
    });
  }

  #queueTransitionEndEvent (strokeConfig, bpm) {
    this.queueFunction(() => {
      if (this.onTransitionEnd) {
        this.onTransitionEnd(strokeConfig, bpm);
      }
    });
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
