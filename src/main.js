import { createApp } from 'vue';
import naive from 'naive-ui';
import App from './App.vue';
import icons from './lib/icons.js';

const app = createApp(App);

app.use(naive);
app.use(icons);

app.config.unwrapInjectedRef = true;

app.mount('#app');
