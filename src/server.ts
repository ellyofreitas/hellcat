import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import hellcat, { App } from './app';
import { HttpRequest } from './http';

let app: App;

const createListener = (app: App) => {
  return async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const request = await HttpRequest.fromServer(req);
      const handler = hellcat(app);
      const response = await handler(request);
      const { body, headers, status } = response.toJSON();
      res.writeHead(status, headers);
      res.end(body);
    } catch (error) {
      const parsedError = app.parseError(error);
      const { body, headers, status } = parsedError.toJSON();
      res.writeHead(status, headers);
      res.end(JSON.stringify(body));
    } finally {
      if (res.socket) res.end();
    }
  };
};

export default (input?: App | App.Options) => {
  app = input instanceof App ? input : new App(input);
  const listener = createListener(app);
  const server = createServer(listener);
  return server;
};
