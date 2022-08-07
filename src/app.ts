import { IncomingMessage, ServerResponse } from 'node:http';
import { HttpRequest, HttpResponse } from './http';
import {
  concatPaths,
  NotFoundError,
  Router,
  StackHandler,
  StackLayer,
} from './router';
import { getRequestBody } from './utils/get-request-body';

export namespace App {
  export interface Options {
    router?: Router;
    prefix?: string;
  }

  export interface Listener {
    (req: IncomingMessage, res: ServerResponse): void;
  }
}

export class App {
  private router: Router;

  constructor(options?: App.Options) {
    this.router = options?.router ?? new Router(options?.prefix);
  }

  use(arg: StackHandler | StackLayer | Router) {
    if (arg instanceof Router) this.router.merge(arg);
    else if (typeof arg === 'function') this.router.use({ handle: arg });
    else if (typeof arg?.handle === 'function')
      this.router.use({
        ...arg,
        ...(arg.resource && {
          resource: concatPaths(this.router.prefix, arg.resource),
        }),
      });

    return this;
  }

  async handle(input: {
    path: string;
    method: string;
    headers: any;
    body: Buffer | string | null;
  }) {
    try {
      const route = this.router.match(input.method, input.path);
      const request = new HttpRequest({
        path: input.path,
        method: input.method,
        headers: input.headers,
        body: input.body,
      });
      for (const layer of route.stack) {
        const res = await layer.handle(request, this);
        if (res && res instanceof HttpResponse) return res;
      }
      const response = await route.handle(request, this);
      return response;
    } catch (error) {
      return this.parseError(error);
    }
  }

  parseError(error: Error | unknown): HttpResponse {
    if (error instanceof NotFoundError) return HttpResponse.notFound();
    console.error(error);
    return HttpResponse.serverError();
  }
}

const createListener = (app: App) => {
  return async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const result = await app.handle({
        path: url.pathname,
        method: req.method ?? 'GET',
        headers: req.headers,
        body: await getRequestBody(req),
      });
      const response = result.toJSON();
      res.writeHead(response.statusCode, response.headers);
      res.end(response.body);
    } catch (error) {
      const parsedError = app.parseError(error);
      res.writeHead(parsedError.statusCode, parsedError.headers);
      res.end(JSON.stringify(parsedError.body));
    } finally {
      if (res.socket) res.end();
    }
  };
};

const decorateHandler = (handler: App.Listener): App.Listener => {
  for (const key of Reflect.ownKeys(App.prototype)) {
    const descriptor = Reflect.getOwnPropertyDescriptor(App.prototype, key);
    if (descriptor && typeof descriptor.value === 'function')
      Reflect.defineProperty(handler, key, descriptor);
  }
  return handler;
};

export default function (options: App | App.Options): App & App.Listener {
  const app = options instanceof App ? options : new App(options);
  const listener = createListener(app);
  decorateHandler(listener);
  return Object.assign(listener, app);
}
