import { html } from '../util.js';

export default {
  template: html`
  <div class="connect-status-container lil-gui">
    <span class="connect-icon" :class="connectedClass"></span>
    <span class="connect-status" :class="connectedClass">{{ connectedText }}</span>
  </div>
  `,

  props: ['connected'],

  computed: {
    connectedClass () {
      return this.connected ? 'connected' : 'disconnected';
    },

    connectedText () {
      return this.connected ? 'Connected' : 'Disconnected';
    }
  }
};