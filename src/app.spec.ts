import assert from 'assert';
import sinon from 'sinon';
import { Router } from '.';
import makeHandler, { App } from './app';
import { HttpResponse } from './http';
import { makeEvent } from './spec/utils/make-event';

const makeSut = () => {
  const router = new Router();
  const event = makeEvent();
  const sut = makeHandler({ router });
  return { sut, event, router };
};

describe('app', () => {
  it('must create a handler and handler instance of app', async () => {
    const handler = makeHandler();
    assert(handler instanceof App);
  });

  it('must bootstrap on request', async () => {
    // const handler = makeHandler();
    const { sut, event } = makeSut();
    const bootstrapSpy = sinon.spy();
    sut.on('bootstrap', bootstrapSpy);
    await sut(event);
    assert(bootstrapSpy.called);
  });

  it('must use a handler', async () => {
    const { sut, event } = makeSut();
    const response = await sut(event);
    assert(response.statusCode);
    assert(response.body);
  });

  it('must add stack layer with a function', async () => {
    const { sut, event, router } = makeSut();
    const unauthorizedResponse = HttpResponse.unauthorized();
    const authStub = sinon.stub().returns(unauthorizedResponse);
    sut.use(authStub);
    router.route({
      handle: () => HttpResponse.ok(''),
      method: 'get',
      resource: '/',
    });
    const response = await sut(event);
    assert(authStub.called);
    assert.deepStrictEqual(response, unauthorizedResponse.toJSON());
  });
});
