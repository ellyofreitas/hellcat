import { createServer } from 'node:http';
import createListener, { App } from './app';

let app: App;

export default (input?: App | App.Options) => {
  app = input instanceof App ? input : new App(input);
  const listener = createListener(app);
  const server = createServer(listener);
  return server;
};
