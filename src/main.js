import { createApp } from 'vue'
import App from './App.vue'

import { Amplify } from 'aws-amplify';
import config from './aws-exports.js';

Amplify.configure(config);

createApp(App).mount('#app')
