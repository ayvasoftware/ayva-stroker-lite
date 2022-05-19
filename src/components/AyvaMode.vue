<template>
  <div class="mode-container lil-gui">
    <span>Mode:</span>
    <span
      class="mode"
      :class="modeClass"
    >{{ mode }}</span>
  </div>
</template>

<script>
export default {
  props: {
    mode: {
      type: String,
      default: '',
    },
  },

  computed: {
    modeClass () {
      return `${this.mode.toLowerCase().replaceAll(/\s+/g, '-')}-mode`;
    },
  },
};
</script>
