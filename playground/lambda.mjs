import { createHandler } from '../dist/index.js';
import { app } from './app.mjs';

const handler = createHandler(app);
export { handler };
