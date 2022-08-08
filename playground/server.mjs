import hellcat, { createServer } from '../dist/index.js';
import { app } from './app.mjs';

const server = createServer(app);
server.listen(3000, () => console.log('Server started on port 3000'));
