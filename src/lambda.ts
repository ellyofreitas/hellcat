import {
  ALBEvent,
  ALBResult,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import hellcat, { App } from './app';
import { HttpRequest } from './http';

let app: App;

export default (input?: App | App.Options) => {
  app = input instanceof App ? input : new App(input);
  return async (
    event: APIGatewayProxyEvent | ALBEvent,
    context: Context
  ): Promise<APIGatewayProxyResult | ALBResult> => {
    const request = HttpRequest.fromLambda(event);
    const handler = hellcat(app);
    const response = await handler(request);
    const { body, headers, status } = response.toJSON();
    return {
      statusCode: status,
      body: body?.toString(),
      headers,
    };
  };
};
