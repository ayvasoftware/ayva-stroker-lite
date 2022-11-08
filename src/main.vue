<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <n-notification-provider placement="bottom-right">
    <n-spin :show="showSpinner" class="app-spinner">
      <App />
    </n-spin>
  </n-notification-provider>
</template>

<script>
import { computed } from 'vue';
import App from './App.vue';

export default {

  components: {
    App,
  },

  provide () {
    return {
      globalSpinner: computed(() => this.spinner),
    };
  },

  data () {
    return {
      showSpinner: false,
      spinner: {
        show: (promise) => {
          this.showSpinner = true;
          promise.finally(() => (this.showSpinner = false));
        },
      },
    };
  },
};
</script>
