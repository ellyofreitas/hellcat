import { METHODS } from 'http';
import { NotFoundError } from './exceptions';
import { Handler } from './handler';
import { Layer, StackLayer } from './layer';
import { chain } from '../utils/chain';

interface Route {
  resource: string;
  method: string;
  handle: Handler;
  stack?: StackLayer[];
}

const removeEndSlash = (p: string) =>
  p.endsWith('/') ? p.substring(0, p.length - 1) : p;

const cleanPrefix = chain(
  (p: string) => (p.startsWith('/') ? p : `/${p}`),
  removeEndSlash
);

const cleanResource = chain(
  (p: string) => (p.startsWith('/') ? p.substring(1, p.length) : p),
  removeEndSlash
);

export const concatPaths = (prefix: string, resource: string) =>
  `${cleanPrefix(prefix)}/${cleanResource(resource)}`;

export const preparePathRegexp = (resource: string) => {
  let wildcard = 1;
  const PARAM_PATH_PATTERN = /\{(?<$1>.*?)\}/g;
  const WILDCARD_PATTERN = new RegExp('\\*', 'g');
  const PROXY_PATTERN = /\{proxy\+\}/;

  const replacePathParam = (_: any, param: string) => `(?<${param}>[^/]+?)`;
  const replaceWildcard = () => `(?<$${wildcard++}>[^/]+?)`;
  const replaceProxy = () => '(?<$proxy>.*)';

  const regexp = `^${resource
    .replace(WILDCARD_PATTERN, replaceWildcard)
    .replace(PROXY_PATTERN, replaceProxy)
    .replace(PARAM_PATH_PATTERN, replacePathParam)}(?:/)?$`;

  return new RegExp(regexp);
};

export class Router {
  #map: Map<string, Layer> = new Map();

  #stack: StackLayer[] = [];

  constructor(readonly prefix: string = '/') {}

  #parseParamsPath(params: Record<string, string> = {}) {
    const parsedParams: Record<string, string | number> = {
      ...params,
    };
    const ONLY_NUMBER_PATTERN = /^\d*$/;
    for (const param in params) {
      const value = params[param];
      const isNumber = ONLY_NUMBER_PATTERN.test(value);
      if (isNumber) parsedParams[param] = Number(value);
    }
    return parsedParams;
  }

  route(route: Route) {
    if (!route.resource) throw { message: 'resource is required' };
    if (!route.method) throw { message: 'method is required' };
    if (!route.handle) throw { message: 'handle is required' };
    if (!METHODS.includes(route.method.toUpperCase()))
      throw { message: 'method http invalid' };
    if (typeof route.handle !== 'function')
      throw { message: 'handle must be a function' };

    const resource = concatPaths(this.prefix, route.resource);
    const method = route.method.toLowerCase();

    this.#map.set(`${method}:${resource}`, {
      resource,
      regexp: preparePathRegexp(resource),
      method: method.toLowerCase(),
      handle: route.handle,
      stack: (route.stack ?? []).concat(this.#stack),
    });

    return this;
  }

  match(method: string, path: string) {
    for (const route of this.#map.values()) {
      if (method.toLowerCase() !== route.method) continue;
      const res = route.regexp.exec(path);
      if (res)
        return {
          ...route,
          params: this.#parseParamsPath({ ...(res?.groups ?? {}) }),
        };
    }

    throw new NotFoundError('resource not matched');
  }

  merge(router: Router) {
    for (const route of router.#map.values()) this.route(route);
    for (const stackLayer of router.#stack) this.use(stackLayer);
    return this;
  }

  use(stackLayer: StackLayer) {
    this.#stack.push(stackLayer);
    return this;
  }
}
