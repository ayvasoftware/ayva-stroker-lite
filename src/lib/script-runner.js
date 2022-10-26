import { ScriptBehavior, GeneratorBehavior } from 'ayvajs';
import { eventMixin } from './util';

class ScriptRunner extends GeneratorBehavior {
  #scriptBehavior;

  constructor (script) {
    super();
    this.#scriptBehavior = new ScriptBehavior(script);
  }

  get complete () {
    return this.#scriptBehavior.complete;
  }

  set complete (value) {
    this.#scriptBehavior.complete = value;
  }

  * generate (ayva) {
    // Give control to the script, but catch errors.
    try {
      yield this.#scriptBehavior.perform(ayva).then(() => {
        if (this.complete) {
          this.$emit('complete');
        }
      }).catch(this.handleError.bind(this));
    } catch (error) {
      this.handleError(error);
    }
  }

  handleError (error) {
    this.complete = true;
    this.$emit('error', error);
    this.$emit('complete');
  }
}

Object.assign(ScriptRunner.prototype, eventMixin);

export default ScriptRunner;
