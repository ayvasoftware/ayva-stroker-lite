<template>
  <div
    class="connect-status-container lil-gui"
    :class="connectedClass"
    :disabled="mode !== 'Stopped' ? '' : null"
  >
    <span class="connect-status-icon" />
    <span class="connect-status">{{ connectedText }}</span>
    <span class="connect-icon">
      <connect-icon />
    </span>
  </div>
</template>

<script>
export default {
  props: {
    connected: {
      type: Boolean,
      default: false,
    },
    mode: {
      type: String,
      default: '',
    },
  },

  emits: ['request-connection'],

  computed: {
    connectedClass () {
      return this.connected ? 'connected' : 'disconnected';
    },

    connectedText () {
      return this.connected ? 'Connected' : 'Disconnected';
    },
  },
};
</script>
