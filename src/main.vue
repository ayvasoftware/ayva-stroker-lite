<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <n-notification-provider placement="bottom-right">
    <n-dialog-provider>
      <n-spin :show="showSpinner" class="app-spinner">
        <App v-if="fundraiserComplete" />
        <AyvaFundraiser v-else @end-fundraiser="onEndFundraiser" />
      </n-spin>
    </n-dialog-provider>
  </n-notification-provider>
</template>

<script>
import { computed } from 'vue';
import App from './App.vue';
import AyvaFundraiser from './components/AyvaFundraiser.vue';
import Storage from './lib/ayva-storage';

const fundraiserStorage = new Storage('fundraiser');

export default {

  components: {
    App,
    AyvaFundraiser,
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
          return promise.finally(() => (this.showSpinner = false));
        },
      },
      fundraiserComplete: false,
    };
  },

  beforeMount () {
    if (fundraiserStorage.load('november-2023')) {
      this.fundraiserComplete = true;
    }
  },

  methods: {
    onEndFundraiser () {
      this.fundraiserComplete = true;
      fundraiserStorage.save('november-2023', true);
    },
  },
};
</script>
