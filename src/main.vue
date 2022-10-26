<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <n-notification-provider placement="bottom-right">
    <App />
  </n-notification-provider>
</template>

<script>
import App from './App.vue';

export default {
  components: {
    App,
  },
};
</script>
