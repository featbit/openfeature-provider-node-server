import { translateContext } from "../src/translateContext";
import { integrations } from "@featbit/node-server-sdk";

const testLogger = new integrations.TestLogger();
it('Uses the targetingKey as the user key', () => {
  expect(translateContext(testLogger, { targetingKey: 'the-key' })).toEqual({ key: 'the-key', name: '', customizedProperties: [] });
});

it('Uses the name as the user name', () => {
  expect(translateContext(testLogger, { name: 'the-key' })).toEqual({ key: '', name: 'the-key', customizedProperties: [] });
});

it('gives targetingKey precedence over key', () => {
  expect(translateContext(
    testLogger,
    { targetingKey: 'target-key', key: 'key-key' },
  )).toEqual({
    key: 'target-key',
    name: '',
    customizedProperties: []
  });
});

describe.each([
  ['firstName', 'value3'],
  ['lastName', 'value4'],
  ['email', 'value5'],
  ['avatar', 'value6'],
  ['ip', 'value7'],
  ['country', 'value8'],
  ['anonymous', true],
])('given custom attributes', (key, value) => {
  it('accepts the custom attribute as customized property correctly', () => {
    expect(translateContext(
      testLogger,
      { targetingKey: 'the-key', name: 'abc', [key]: value },
    )).toEqual({
      key: 'the-key',
      name: 'abc',
      customizedProperties: [{
        name: key, value
      }]
    });
  });
});

it('Accepts array custom as customized properties', () => {
  const context = {
    key: 'the-key',
    custom: [{ name: 'custom1', value: 'value1' }, { name: 'custom2', value: 'value2' }]
  };

  expect(translateContext(
    testLogger,
    context,
  )).toEqual({
    key: 'the-key',
    name: '',
    customizedProperties: context.custom
  });
});

it('Accepts object custom as customized properties', () => {
  const context = {
    key: 'the-key',
    custom: {
      custom1: 'value1',
      custom2: 'value2'
    }
  };

  expect(translateContext(
    testLogger,
    context,
  )).toEqual({
    key: 'the-key',
    name: '',
    customizedProperties: [
      {
        name: 'custom1',
        value: 'value1'
      },
      {
        name: 'custom2',
        value: 'value2'
      }
    ]
  });
});

it.each(['key', 'targetingKey'])('handles key or targetingKey', (key) => {
  expect(translateContext(
    testLogger,
    { [key]: 'the-key' },
  )).toEqual({
    key: 'the-key',
    name: '',
    customizedProperties: []
  });
});


