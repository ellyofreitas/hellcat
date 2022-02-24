import { HttpHeaders } from './types';

export const parseHeaders = (headers: Record<string, any>): HttpHeaders =>
  new Map(
    Object.entries(headers).map(([key, value]) => [
      key.toLowerCase(),
      String(value),
    ])
  );
