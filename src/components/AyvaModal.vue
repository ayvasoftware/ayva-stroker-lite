<template>
  <n-modal :show="show" :auto-focus="false">
    <div v-if="lilGui">
      <div class="lil-gui">
        <slot />
      </div>
    </div>
    <template v-else>
      <slot />
    </template>
  </n-modal>
</template>

<script>

export default {
  inject: ['modals'],

  props: {
    show: {
      type: Boolean,
      value: false,
    },

    lilGui: {
      type: Boolean,
      value: false,
    },
  },

  watch: {
    show: {
      immediate: true,
      handler (newValue, oldValue) {
        if (newValue) {
          // Increment the number of modals shown.
          this.modals.count++;
        } else if (oldValue === true) {
          // Only decrement the number of modals shown if we're changing from true to false.
          this.modals.count--;
        }
      },
    },
  },
};
</script>
