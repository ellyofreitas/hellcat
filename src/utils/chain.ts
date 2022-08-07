type FunctionHandler = (...args: any) => any;

export const chain =
  (...handlers: FunctionHandler[]) =>
  (initialValue: any) =>
    handlers.reduce(
      (acc, func) => func(...(Array.isArray(acc) ? acc : [acc])),
      initialValue
    );
