import { App } from '../app';
import { HttpRequest, HttpResponse } from '../http';

export type Handler = (
  request: HttpRequest,
  app: App
) => HttpResponse | Promise<HttpResponse>;

export type StackHandler = (
  request: HttpRequest,
  app: App
) =>
  | HttpResponse
  | undefined
  | null
  | void
  | Promise<HttpResponse | undefined | null | void>;
