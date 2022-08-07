import { IncomingMessage } from 'node:http';

export const getRequestBody = async (req: IncomingMessage) => {
  const body = [];
  for await (const chunk of req) body.push(chunk);
  return Buffer.concat(body);
};
