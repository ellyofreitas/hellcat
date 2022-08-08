import zlib from 'node:zlib';
import { STATUS_CODES } from 'node:http';
import { HttpHeaders } from './types';
import { parseHeaders } from './util';

export class HttpResponse {
  status: number;

  body: Buffer | null;

  headers: HttpHeaders;

  private compressed: boolean = false;

  constructor(
    status: number,
    body: Buffer | string | Record<any, any>,
    headers: Record<string, string> = {}
  ) {
    this.status = status;
    this.headers = parseHeaders(headers);
    this.body = this.parsePayload(body);
  }

  get isJSON() {
    return (
      (!!this.body && this.contentType?.includes('application/json')) ?? false
    );
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

  private parsePayload(body: Buffer | string | Record<any, any>) {
    if (!body) return null;
    if (Buffer.isBuffer(body)) return body;
    if (typeof body === 'string')
      return Buffer.from(body, this.charsetEncoding);
    const bodyIsObject = typeof body === 'object';
    if (this.isJSON || bodyIsObject) {
      console.log('body is object');
      this.addHeader('content-type', 'application/json');
      return Buffer.from(JSON.stringify(body), this.charsetEncoding);
    }
    return null;
  }

  compress(acceptEncoding: string = '') {
    if (this.compressed) {
      console.warn('can not compress payload encoding: already compressed');
      return this;
    }
    if (!this.body) {
      console.warn('can not compress payload encoding: body is empty');
      return this;
    }
    if (acceptEncoding?.includes('br')) {
      this.body = zlib.brotliCompressSync(this.body);
      this.addHeader('content-encoding', 'br');
      this.compressed = true;
    } else if (acceptEncoding?.includes('gzip')) {
      this.body = zlib.gzipSync(this.body);
      this.addHeader('content-encoding', 'gzip');
      this.compressed = true;
    } else {
      console.warn('can not compress payload encoding: no supported encoding');
    }
    return this;
  }

  getHeader(name: string) {
    return this.headers.get(name?.toLowerCase());
  }

  addHeader(name: string, value: string) {
    this.headers.set(name?.toLowerCase(), String(value));
    return this;
  }

  toJSON() {
    return {
      status: this.status,
      body: this.body,
      headers: Object.fromEntries([...this.headers]),
    };
  }

  private static createStatus(status: number, statusMessage?: string) {
    return new this(status, {
      status,
      statusMessage: statusMessage ?? STATUS_CODES[status]?.toLowerCase(),
    });
  }

  static ok(body: any, headers: Record<string, string> = {}) {
    return new this(200, body, headers);
  }

  static badRequest(statusMessage?: string) {
    return this.createStatus(400, statusMessage);
  }

  static unauthorized(statusMessage?: string) {
    return this.createStatus(401, statusMessage);
  }

  static forbidden(statusMessage?: string) {
    return this.createStatus(403, statusMessage);
  }

  static notFound(statusMessage?: string) {
    return this.createStatus(404, statusMessage);
  }

  static serverError() {
    return this.createStatus(500);
  }
}
