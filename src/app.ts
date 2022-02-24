import { HttpRequest, HttpResponse } from './http';
import {
  concatPaths,
  NotFoundError,
  Router,
  StackHandler,
  StackLayer,
} from './router';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { EventEmitter } from 'events';

export class App {
  private router: Router;

  private bootstrapped: boolean = false;

  private eventEmitter: EventEmitter;

  constructor(options?: { router?: Router; prefix?: string }) {
    this.router = options?.router ?? new Router(options?.prefix);
    this.eventEmitter = new EventEmitter({ captureRejections: true });
  }

  on(eventName: string | symbol, listener: (...args: any[]) => void) {
    this.eventEmitter.on(eventName, listener);
    return this;
  }

  private async executeEvent(eventName: string | symbol, ...args: any[]) {
    const listeners = this.eventEmitter.listeners(eventName);
    for (const listener of listeners) await listener(...args);
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

  async bootstrap() {
    if (this.bootstrapped) return;
    await this.executeEvent('bootstrap', this);
    this.bootstrapped = true;
    return this;
  }

  async handle(request: HttpRequest) {
    try {
      const route = this.router.match(request.method, request.path);
      request.setPathParams(route.params);
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
    if (error instanceof HttpResponse) return error;
    console.error(error);
    return HttpResponse.serverError();
  }
}

export type AppHandler = (
  event: APIGatewayProxyEvent
) => Promise<APIGatewayProxyResult>;

export default function makeHandler(options?: {
  router?: Router;
  prefix?: string;
}): App & AppHandler {
  const app = new App(options);
  const handler: AppHandler = async (event) => {
    await app.bootstrap();
    const request = new HttpRequest(event);
    const response = await app.handle(request);
    return response.toJSON();
  };
  Reflect.setPrototypeOf(handler, app);
  return Object.assign(handler, app);
}
