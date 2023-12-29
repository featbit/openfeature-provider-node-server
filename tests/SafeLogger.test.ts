import SafeLogger from "../src/SafeLogger";
import { BasicLogger, ILogger } from "@featbit/node-server-sdk";

it('throws when constructed with an invalid logger', () => {
  expect(
    () => new SafeLogger({} as ILogger, new BasicLogger({})),
  ).toThrow();
});

describe('given a logger that throws in logs', () => {
  const strings: string[] = [];
  const logger = new SafeLogger({
    info: () => { throw new Error('info'); },
    debug: () => { throw new Error('info'); },
    warn: () => { throw new Error('info'); },
    error: () => { throw new Error('info'); },
  }, new BasicLogger({
    level: 'debug',
    destination: (...args: any) => {
      strings.push(args.join(' '));
    },
  }));

  it('uses the fallback logger', () => {
    logger.debug('a');
    logger.info('b');
    logger.warn('c');
    logger.error('d');
    expect(strings).toEqual([
      'debug: [FeatBit] a',
      'info: [FeatBit] b',
      'warn: [FeatBit] c',
      'error: [FeatBit] d',
    ]);
  });
});