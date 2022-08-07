import { STATUS_CODES } from 'node:http';
import { HttpHeaders } from './types';

export class HttpResponse {
  statusCode: number;

  body: any;

  headers: Record<string, string> = {};

  constructor({
    statusCode,
    body,
    headers,
  }: {
    statusCode: number;
    body: any;
    headers?: Record<string, string>;
  }) {
    this.statusCode = statusCode;
    this.body = body;
    this.headers = headers ?? {};
  }
  toJSON() {
    let body = this.body;
    const bodyIsObject = typeof body === 'object' && !Buffer.isBuffer(body);
    if (bodyIsObject) {
      this.addHeader('content-type', 'application/json');
      body = JSON.stringify(body);
    }
    return {
      statusCode: this.statusCode,
      body: Buffer.isBuffer(body) ? body : Buffer.from(body),
      headers: this.headers,
    };
  }

  addHeader(name: string, value: string) {
    this.headers[name?.toLowerCase()] = String(value);
    return this;
  }

  private static createStatus(statusCode: number, statusMessage?: string) {
    return new this({
      statusCode,
      body: {
        statusMessage: statusMessage ?? STATUS_CODES[statusCode]?.toLowerCase(),
      },
    });
  }

  static ok(body: any, headers: Record<string, string> = {}) {
    return new this({ statusCode: 200, body, headers });
  }

  static badRequest(statusMessage?: string) {
    return this.createStatus(400, statusMessage);
  }

  static notFound(statusMessage?: string) {
    return this.createStatus(404, statusMessage);
  }

  static serverError() {
    return this.createStatus(500);
  }
}
