import { createApp } from 'vue';
import naive from 'naive-ui';
import Main from './main.vue';
import icons from './lib/icons.js';

const app = createApp(Main);

app.use(naive);
app.use(icons);

app.config.unwrapInjectedRef = true;

app.mount('#app');
