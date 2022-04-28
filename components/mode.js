import { html } from '../util.js';

export default {
  template: html`
  <div class="mode-container lil-gui">
    <span>Mode:</span>
    <span class="mode" :class="modeClass">{{ mode }}</span>
  </div>
  `,

  props: ['mode'],

  computed: {
    modeClass () {
      return `${this.mode.toLowerCase().replaceAll(/\s+/g,'-')}-mode`;
    }
  }
};