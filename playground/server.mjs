import hellcat, { createServer } from '../dist/index.js';

const app = hellcat();

const server = createServer(app);
server.listen(3000, () => console.log('Server started on port 3000'));
