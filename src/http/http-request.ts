import zlib from 'node:zlib';
import { IncomingMessage } from 'node:http';
import { APIGatewayProxyEvent, ALBEvent } from 'aws-lambda';
import { HttpResponse } from './http-response';
import { HttpHeaders } from './types';
import { parseHeaders } from './util';
import { getRequestBody } from '../utils/get-request-body';

export namespace HttpRequest {
  export interface Input {
    path: string;

    method: string;

    params?: Record<string, string | undefined>;

    body: Buffer | string | null;

    headers: Record<string, string | undefined>;
  }
}

export class HttpRequest {
  path: string;

  method: string;

  params: Record<string, string | undefined> = {};

  body: Buffer | string | null;

  payload: Record<any, any> | null;

  headers: HttpHeaders;

  raw: any;

  constructor(input: HttpRequest.Input, raw?: any) {
    this.path = input.path;
    this.method = input.method.toLowerCase();
    this.headers = parseHeaders(input.headers);
    this.body = input.body;
    if (input.params) this.params = input.params;
    if (this.contentEncoding) this.body = this.decodePayload();
    this.payload = this.parsePayload();
    this.raw = raw;
  }

  get isJSON() {
    return (
      (!!this.body && this.contentType?.includes('application/json')) ?? false
    );
  }

  get acceptEncoding() {
    return this.getHeader('accept-encoding');
  }

  get isGzip() {
    return (!!this.body && this.contentEncoding?.includes('gzip')) ?? false;
  }

  get isBrotli() {
    return (!!this.body && this.contentEncoding?.includes('br')) ?? false;
  }

  get contentType() {
    return this.getHeader('content-type');
  }

  get contentEncoding() {
    return this.getHeader('content-encoding');
  }

  get charsetEncoding() {
    const contentType = this.getHeader('content-type') ?? '';
    const CHAR_EXP = /;(\s)*charset=(?<encoding>.*)(\s)*/;
    const res = CHAR_EXP.exec(contentType);
    return (res?.groups?.encoding ?? 'utf-8') as BufferEncoding;
  }

  get isServer() {
    return !!this.raw?.socket;
  }

  get isAPIGateway() {
    return !!this.raw?.requestContext?.apiId;
  }

  get isALB() {
    return !!this.raw?.requestContext?.elb?.targetGroupArn;
  }

  private parsePayload() {
    try {
      if (!this.body) return this.body;
      return this.isJSON
        ? JSON.parse(this.body.toString(this.charsetEncoding))
        : null;
    } catch (error) {
      throw HttpResponse.badRequest('json badly formatted');
    }
  }

  private decodePayload() {
    if (!this.body) return this.body;
    if (this.isBrotli) return zlib.brotliDecompressSync(this.body);
    if (this.isGzip) return zlib.gunzipSync(this.body);
    throw HttpResponse.badRequest('can not decompress payload encoding');
  }

  getHeader(name: string) {
    return this.headers.get(name?.toLowerCase());
  }

  setPathParams(params = {}) {
    this.params = { ...(this.params ?? {}), ...params };
    return this;
  }

  static async fromServer(request: IncomingMessage) {
    const body = await getRequestBody(request);
    const { pathname } = new URL(request.url ?? '', 'http://localhost');
    return new HttpRequest(
      {
        path: pathname,
        method: request.method ?? 'GET',
        headers: Object.fromEntries([...parseHeaders(request.headers)]),
        body: body,
      },
      request
    );
  }

  static fromLambda(event: APIGatewayProxyEvent | ALBEvent) {
    return new HttpRequest(
      {
        path: event.path,
        method: event.httpMethod,
        headers: event.headers ?? {},
        body: event.body,
      },
      event
    );
  }
}
