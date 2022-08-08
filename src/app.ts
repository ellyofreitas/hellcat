import { HttpRequest, HttpResponse } from './http';
import {
  concatPaths,
  NotFoundError,
  Router,
  StackHandler,
  StackLayer,
} from './router';

export namespace App {
  export interface Options {
    router?: Router;
    prefix?: string;
  }

  export interface Handler {
    (request: HttpRequest): Promise<HttpResponse>;
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

  async handle(request: HttpRequest) {
    try {
      const route = this.router.match(request.method, request.path);
      for (const layer of route.stack) {
        const res = await layer.handle(request, this);
        if (res && res instanceof HttpResponse) return res;
      }
      const response = await route.handle(request, this);
      if (request.acceptEncoding) response.compress(request.acceptEncoding);
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

const decorateHandler = (handler: App.Handler): App.Handler => {
  for (const key of Reflect.ownKeys(App.prototype)) {
    const descriptor = Reflect.getOwnPropertyDescriptor(App.prototype, key);
    if (descriptor && typeof descriptor.value === 'function')
      Reflect.defineProperty(handler, key, descriptor);
  }
  return handler;
};

export default function (options: App | App.Options): App & App.Handler {
  const app = options instanceof App ? options : new App(options);
  const handler = async (request: HttpRequest) => {
    const response = await app.handle(request);
    return response;
  };
  decorateHandler(handler);
  return Object.assign(handler, app);
}
