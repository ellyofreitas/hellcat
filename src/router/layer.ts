import { Handler, StackHandler } from './handler';

export interface Layer {
  resource: string;
  method: string;
  handle: Handler;
  regexp: RegExp;
  stack: StackLayer[];
}

export interface StackLayer {
  resource?: string;
  handle: StackHandler;
}
