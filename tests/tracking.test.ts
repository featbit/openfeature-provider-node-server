import { OpenFeature } from '@openfeature/server-sdk';
import { integrations } from '@featbit/node-server-sdk';
import { FbProvider } from '../src';

describe('tracking through OpenFeature', () => {
  let provider: FbProvider;
  let track: jest.SpyInstance;
  const domain = 'tracking-tests';

  beforeEach(async () => {
    provider = new FbProvider({ sdkKey: 'sdk-key', offline: true, logger: new integrations.TestLogger() });
    track = jest.spyOn(provider.getClient(), 'track').mockImplementation(() => {});
    await OpenFeature.setProviderAndWait(domain, provider);
  });

  afterEach(async () => {
    await OpenFeature.close();
    jest.restoreAllMocks();
  });

  it.each([99.9, 0])('forwards the event and metric value %s with the merged context', (value) => {
    const client = OpenFeature.getClient(domain);
    client.setContext({ targetingKey: 'client-user', name: 'Alice', plan: 'pro' });

    expect(client.track('purchase', { targetingKey: 'invocation-user' }, {
      value,
      currency: 'CNY',
    })).toBeUndefined();

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith({
      key: 'invocation-user',
      name: 'Alice',
      customizedProperties: [{ name: 'plan', value: 'pro' }],
    }, 'purchase', value);
  });

  it('uses client context when invocation context and details are omitted', () => {
    const client = OpenFeature.getClient(domain);
    client.setContext({ targetingKey: 'client-user' });
    client.track('page-view');

    expect(track).toHaveBeenCalledWith(expect.objectContaining({ key: 'client-user' }), 'page-view', undefined);
  });

  it('supports the legacy key and leaves the metric default to the SDK', () => {
    OpenFeature.getClient(domain).track('page-view', { key: 'legacy-user' }, { source: 'home' });

    expect(track).toHaveBeenCalledWith(expect.objectContaining({ key: 'legacy-user' }), 'page-view', undefined);
  });
});
