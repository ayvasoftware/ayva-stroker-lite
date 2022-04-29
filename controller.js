import Ayva, { AyvaBehavior, TempestStroke, VariableDuration } from 'https://unpkg.com/ayvajs';

export default class Controller extends AyvaBehavior {
  #currentStroke = null;
  #duration = null;

  generateActions (ayva) {
    if (this.strokeCommand) {
      // Transition into user selected stroke and take us out of random mode.
      this.#queueTransition(ayva, this.strokeCommand);
      this.#reset();
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

  #reset () {
    this.strokeCommand = null;
    this.#duration = null;
    this.random = false;
  }

  /**
   * Add transition moves to the queue and create the current stroke.
   */
  #queueTransition (ayva, strokeConfig) {
    if (this.#currentStroke) {
      // Create smooth transition to the next stroke.
      const duration = this.#getTransitionDuration();

      const { transitionStroke, nextStroke } = this.#currentStroke.createTransition(
        duration,
        strokeConfig,
        this.#getNextBpm(),
      );

      this.#currentStroke = nextStroke;

      this.queueBehavior(transitionStroke, 1, ayva);
    } else {
      // Just move to the start position for the new stroke.
      this.#currentStroke = new TempestStroke(strokeConfig, this.#getNextBpm());
      this.queueMove(...this.#currentStroke.getStartMoves(ayva, { duration: 1 }));
    }

    if (this.random) {
      this.queueFunction(() => {
        // Start the timer for the next stroke after finishing the transition.
        this.#createDuration();
      });
    }
  }

  #readyForNextStroke () {
    // We're ready for the next stroke when the duration has elapsed, we have strokes available, 
    // and also the user is not mucking about with the bpm slider.
    return (!this.#duration || this.#duration.complete) && this.strokes.length && !this.bpmActive;
  }

  #createDuration () {
    const [from, to] = this.parameters['pattern-duration'];
    this.#duration = new VariableDuration(from, to);
  }

  #getTransitionDuration () {
    const [from, to] = this.parameters['transition-duration'];
    return Ayva.map(Math.random(), 0, 1, from, to);
  }

  #getNextBpm () {
    const [from, to] = this.parameters['bpm'];
    return Math.floor(Ayva.map(Math.random(), 0, 1, from, to));
  }

  randomStroke () {
    return this.strokes[Math.floor(Math.random() * this.strokes.length)];
  }
}
