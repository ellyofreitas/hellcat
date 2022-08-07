// @ts-nocheck
import assert from 'assert';
import sinon from 'sinon';
import { HttpResponse } from '../index';
import { NotFoundError } from './exceptions';
import { Router } from './router';

describe('router', () => {
  it('deve criar um router', () => {
    const router = new Router();
    assert(router);
  });

  it('deve criar um router com prefixo', () => {
    const router = new Router('v1');
    assert(router);
    assert.strictEqual(router.prefix, 'v1');
  });

  it('deve adicionar uma rota', () => {
    const router = new Router();
    const addSpy = sinon.spy(router, 'route');
    const route = {
      resource: '/any',
      method: 'get',
      handle: () => HttpResponse.ok('ok'),
    };
    router.route(route);
    assert.strictEqual(addSpy.callCount, 1);
    assert(addSpy.calledWith(route));
  });

  it('deve lancar um erro ao tentar adicionar uma rota sem recurso', () => {
    const router = new Router();
    const route = {
      method: 'get',
      handle: () => HttpResponse.ok('ok'),
    };
    assert.throws(() => router.route(route), {
      message: 'resource is required',
    });
  });

  it('deve lancar um erro ao tentar adicionar uma rota sem metodo', () => {
    const router = new Router();
    const route = {
      resource: '/any',
      handle: () => HttpResponse.ok('ok'),
    };
    assert.throws(() => router.route(route), {
      message: 'method is required',
    });
  });

  it('deve lancar um erro ao tentar adicionar uma rota sem handle', () => {
    const router = new Router();
    const route = {
      resource: '/any',
      method: 'get',
    };
    assert.throws(() => router.route(route), {
      message: 'handle is required',
    });
  });

  it('deve lancar um erro ao tentar adicionar uma rota com metodo invalido', () => {
    const router = new Router();
    const route = {
      resource: '/any',
      method: 'invalid',
      handle: () => HttpResponse.ok('ok'),
    };
    assert.throws(() => router.route(route), {
      message: 'method http invalid',
    });
  });

  it('deve lancar um erro ao tentar adicionar uma rota com handle invalido', () => {
    const router = new Router();
    const route = {
      resource: '/any',
      method: 'get',
      handle: 'invalid',
    };
    assert.throws(() => router.route(route), {
      message: 'handle must be a function',
    });
  });

  it('deve lancar um erro em uma rota inexistente', () => {
    const router = new Router();
    assert.throws(
      () => router.match('get', '/invalid'),
      new NotFoundError('resource not matched')
    );
  });

  it('deve dar match em uma rota existente', () => {
    const router = new Router();
    const route = {
      resource: '/any',
      method: 'get',
      handle: () => HttpResponse.ok('ok'),
    };
    router.route(route);
    const matched = router.match('get', '/any');
    assert.strictEqual(matched.resource, '/any');
    assert.strictEqual(matched.method, 'get');
  });

  it('deve dar match em uma rota existente com prefixo', () => {
    const router = new Router('/v1');
    const route = {
      resource: '/any',
      method: 'get',
      handle: () => HttpResponse.ok('ok'),
    };
    router.route(route);
    const matched = router.match('get', '/v1/any');
    assert.strictEqual(matched.resource, '/v1/any');
    assert.strictEqual(matched.method, 'get');
  });

  it('deve dar match em uma rota com parametros existente', () => {
    const router = new Router();
    const route = {
      resource: '/any/{any}',
      method: 'get',
      handle: () => HttpResponse.ok('ok'),
    };
    router.route(route);
    const matched = router.match('get', '/any/any');
    assert.strictEqual(matched.resource, '/any/{any}');
    assert.strictEqual(matched.method, 'get');
    assert.deepStrictEqual(matched.params, { any: 'any' });
  });

  it('deve dar match em uma rota coringa', () => {
    const router = new Router();
    const route = {
      resource: '/any/*',
      method: 'get',
      handle: () => HttpResponse.ok('ok'),
    };
    router.route(route);
    const matched = router.match('get', '/any/any');
    assert.strictEqual(matched.resource, '/any/*');
    assert.strictEqual(matched.method, 'get');
    assert.deepStrictEqual(matched.params, { $1: 'any' });
  });

  it('deve dar match em uma rota proxy', () => {
    const router = new Router();
    const route = {
      resource: '/any/{proxy+}',
      method: 'get',
      handle: () => HttpResponse.ok('ok'),
    };
    router.route(route);
    const matched = router.match('get', '/any/any');
    assert.strictEqual(matched.resource, '/any/{proxy+}');
    assert.strictEqual(matched.method, 'get');
    assert.deepStrictEqual(matched.params, { $proxy: 'any' });
  });

  it('deve fazer o merge de routers', () => {
    const router = new Router();
    const route = {
      resource: '/any',
      method: 'get',
      handle: () => HttpResponse.ok('ok'),
    };
    router.route(route);
    const anotherRouter = new Router('another');
    anotherRouter.merge(router);
    const matched = anotherRouter.match('get', '/another/any');
    assert.strictEqual(matched.resource, '/another/any');
    assert.strictEqual(matched.method, 'get');
  });

  it('deve fazer o merge de routers com layer', () => {
    const router = new Router();
    const route = {
      resource: '/any',
      method: 'get',
      handle: () => HttpResponse.ok('ok'),
    };
    const spy = sinon.spy();
    const layer = { handle: spy };
    const anotherRouter = new Router('another');
    const anotherRoute = {
      resource: '/another',
      method: 'get',
      handle: () => HttpResponse.ok('ok'),
    };
    router.use(layer);
    router.route(route);
    anotherRouter.route(anotherRoute);
    anotherRouter.merge(router);
    const matched = anotherRouter.match('get', '/another/any');
    assert.strictEqual(matched.resource, '/another/any');
    assert.strictEqual(matched.method, 'get');
    assert.deepStrictEqual(matched.stack?.[0], layer);
    const anotherMatched = anotherRouter.match('get', '/another/another');
    assert.strictEqual(anotherMatched.resource, '/another/another');
    assert.strictEqual(anotherMatched.method, 'get');
    assert.deepStrictEqual(anotherMatched.stack.length, 0);
  });

  it('nao deve adicionar um layer coringa ao router', () => {
    const router = new Router();
    const route = {
      resource: '/any',
      method: 'get',
      handle: () => HttpResponse.ok('ok'),
    };
    const spy = sinon.spy();
    const layer = { handle: spy };
    router.route(route);
    router.use(layer);
    const matched = router.match('get', '/any');
    assert.strictEqual(matched.resource, '/any');
    assert.strictEqual(matched.method, 'get');
    assert.strictEqual(matched.stack?.length, 0);
  });

  it('deve adicionar um layer coringa ao router', () => {
    const router = new Router();
    const route = {
      resource: '/any',
      method: 'get',
      handle: () => HttpResponse.ok('ok'),
    };
    const spy = sinon.spy();
    const layer = { handle: spy };
    router.use(layer);
    router.route(route);
    const matched = router.match('get', '/any');
    assert.strictEqual(matched.resource, '/any');
    assert.strictEqual(matched.method, 'get');
    assert.deepStrictEqual(matched.stack?.[0], layer);
  });
});
