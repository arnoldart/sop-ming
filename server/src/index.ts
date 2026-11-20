import { createApp } from './app.js';
import { env } from './env.js';

createApp().listen(env.PORT, () => {
  console.log(`API berjalan di http://localhost:${env.PORT}/api`);
});
