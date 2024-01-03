import { IUser, UserBuilder, IContextProperty, ILogger } from "@featbit/node-server-sdk";
import { EvaluationContext } from "@openfeature/server-sdk";

const builtInKeys = ['key', 'name', 'custom', 'targetingKey'];

export function translateContext(logger: ILogger, evalContext: EvaluationContext): IUser {
  const custom: IContextProperty[] = (evalContext.custom || []) as unknown as IContextProperty[];
  const name: string = evalContext.name as string || '';
  const key: string = evalContext.targetingKey || evalContext.key as string || '';

  if (key === '') {
    logger.error("The EvaluationContext must contain either a 'targetingKey' or a 'key' and the "
      + 'type must be a string.');
  }

  const builder = new UserBuilder(key)
    .name(name);

  if (custom) {
    if (Array.isArray(custom)) {
      custom.forEach(({ name, value }) => {
        builder.custom(name, value);
      });
    } else if (typeof custom === 'object') {
      Object.entries(custom).forEach(([key, value]) => {
        builder.custom(key, value as any as string);
      });
    }
  }

  Object.entries(evalContext).forEach(([key, value]) => {
    if (builtInKeys.includes(key)) {
      return;
    }

    builder.custom(key, value as string);
  });

  return builder.build();
}