import { APIGatewayProxyEvent } from 'aws-lambda';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const eventPath = path.resolve(dirname, '..', 'fixtures', 'apigw-event.json');
const event = JSON.parse(
  await fs.readFile(eventPath, { encoding: 'utf-8' })
) as APIGatewayProxyEvent;

export function makeEvent(
  params: Partial<APIGatewayProxyEvent> = {}
): APIGatewayProxyEvent {
  return { ...event, ...params };
}
