import { STATUS_CODES } from 'http';

export class HttpResponse {
  constructor(
    readonly statusCode: number,
    readonly body: any,
    readonly headers: Record<string, string> = {},
    readonly isBase64Encoded = false
  ) {}

  addHeader(name: string, value: string) {
    this.headers[name?.toLowerCase()] = String(value);
    return this;
  }

  toJSON() {
    let body = this.body;
    const bodyIsObject = typeof body === 'object';
    if (bodyIsObject) {
      this.addHeader('content-type', 'application/json');
      body = JSON.stringify(body);
    }

    return {
      statusCode: this.statusCode,
      body: Buffer.from(body).toString(
        this.isBase64Encoded ? 'base64' : 'utf-8'
      ),
      headers: this.headers,
      isBase64Encoded: this.isBase64Encoded,
    };
  }

  private static createStatus(statusCode: number, statusMessage?: string) {
    return new this(statusCode, {
      statusCode,
      statusMessage: statusMessage ?? STATUS_CODES[statusCode]?.toLowerCase(),
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
