import zlib from 'zlib';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { HttpResponse } from './http-response';
import { HttpHeaders } from './types';
import { parseHeaders } from './util';

export class HttpRequest {
  path: string;

  method: string;

  params: Record<string, string | undefined> = {};

  body: Buffer;

  payload: Record<any, any> | null;

  headers: HttpHeaders;

  raw: APIGatewayProxyEvent;

  constructor(event: APIGatewayProxyEvent) {
    this.raw = event;
    this.path = event.path;
    this.method = event.httpMethod.toLowerCase();
    this.headers = parseHeaders(event.headers);
    this.body = Buffer.from(
      event.body ?? '',
      event.isBase64Encoded ? 'base64' : this.charsetEncoding
    );
    if (event.pathParameters) this.params = event.pathParameters;
    if (this.contentEncoding) this.body = this.decodePayload();
    this.payload = this.parsePayload();
  }

  get isJSON() {
    return this.contentType?.includes('application/json') ?? false;
  }

  get isGzip() {
    return this.contentEncoding?.includes('gzip') ?? false;
  }

  get isBrotli() {
    return this.contentEncoding?.includes('br') ?? false;
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

  private parsePayload() {
    try {
      return this.isJSON
        ? JSON.parse(this.body.toString(this.charsetEncoding))
        : null;
    } catch (error) {
      throw HttpResponse.badRequest('json badly formatted');
    }
  }

  private decodePayload() {
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
}
