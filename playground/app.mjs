import hellcat, { Router, HttpResponse } from '../dist/index.js';

const router = new Router('/v1');

router.route({
  method: 'GET',
  resource: '/',
  async handle(req, app) {
    return HttpResponse.ok({
      message: 'Hello World!',
    });
  },
});

router.route({
  method: 'POST',
  resource: '/',
  async handle(req, app) {
    return HttpResponse.ok(req.payload);
  },
});

const app = hellcat();
app.use(router);

export { app };
