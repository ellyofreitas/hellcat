export const parseHeaders = (headers: any): Map<string, string> =>
  new Map(
    Object.entries(headers).map(([key, value]) => [
      key.toLowerCase(),
      String(value),
    ])
  );
