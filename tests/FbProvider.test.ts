import { FbProvider } from "../src";
import { Client, ErrorCode, OpenFeature, ProviderEvents, ProviderStatus } from "@openfeature/server-sdk";
import { IClientContext, IFbClient, integrations, ReasonKinds, IFallthrough, IStore } from "@featbit/node-server-sdk";
import { translateContext } from "../src/translateContext";

it('can be initialized', async () => {
  const logger = new integrations.TestLogger();
  const provider = new FbProvider({ sdkKey: 'sdk-key', offline: true, logger });
  await provider.initialize({});

  expect(provider.status).toEqual(ProviderStatus.READY);
  expect(logger.logs.length).toEqual(2);
  expect(logger.logs).toEqual(['Offline mode enabled. No streaming or polling will occur.', 'FbClient started successfully.']);
  await provider.onClose();
});

it('can fail to initialize client', async () => {
  const logger = new integrations.TestLogger();
  const provider = new FbProvider({
    sdkKey: 'sdk-key',
    logger,
    dataSynchronizer: (
      clientContext: IClientContext,
      store: IStore,
      dataSourceUpdates: any,
      initSuccessHandler: VoidFunction,
      errorHandler?: (e: Error) => void,
    ) => ({
      start: () => {
        setTimeout(() => errorHandler?.({ code: 401 } as any), 20);
      },
    })
  });
  try {
    await provider.initialize({});
  } catch (e) {
    expect((e as Error).message).toEqual('Authentication failed. Double check your SDK key.');
  }
  expect(provider.status).toEqual(ProviderStatus.ERROR);
});

it('emits events for flag changes', async () => {
  const logger = new integrations.TestLogger();
  const td = new integrations.TestData();
  const provider = new FbProvider( {
    sdkKey: 'sdk-key',
    logger,
    dataSynchronizer: td.getFactory(),
  });
  let count = 0;
  provider.events.addHandler(ProviderEvents.ConfigurationChanged, (eventDetail) => {
    expect(eventDetail?.flagsChanged).toEqual(['flagA']);
    count += 1;
  });

  const fallthrough: IFallthrough = {
    dispatchKey: "keyId",
    includedInExpt: true,
    variations: [
      {
        id: "trueId",
        exptRollout: 1,
        rollout: [0, 1]
      }
    ]
  }

  const flag = new integrations.FlagBuilder()
    .key('flagA')
    .isEnabled(true)
    .disabledVariationId('falseId')
    .fallthrough(fallthrough)
    .variations([{id: 'trueId', value: 'true'}, {id: 'falseId', value: 'false'}])
    .version(1)
    .build();

  await td.update(flag);
  expect(await provider.getClient()
    .stringVariation('flagA', { key: 'test-key' }, 'false'))
    .toEqual('true');
  expect(count).toEqual(1);
  await provider.onClose();
});

describe('given a mock FbClient', () => {
  const logger: integrations.TestLogger = new integrations.TestLogger();
  let provider: FbProvider;
  let fbClient: IFbClient;
  let openFeatureClient: Client;
  const basicContext = { targetingKey: 'the-key' };
  const testFlagKey = 'a-key';
  let testFlagBuilder;

  const td = new integrations.TestData();
  const factory = td.getFactory();

  beforeEach(() => {
    testFlagBuilder = new integrations.FlagBuilder()
      .key(testFlagKey)
      .disabledVariationId('invalidId')
      .fallthrough({
        dispatchKey: "keyId",
        includedInExpt: true,
        variations: [
          {
            id: "trueId",
            exptRollout: 1,
            rollout: [0, 1]
          }
        ]
      })
      .targetUsers([{keyIds: [basicContext.targetingKey], variationId: 'trueId'}])
      .variations([{id: 'trueId', value: 'true'}, {id: 'falseId', value: 'false'}, {id: 'invalidId', value: 'badness'}])
      .version(1);

    provider = new FbProvider({
      sdkKey: 'sdk-key',
      logger,
      streamingUri: 'ws://localhost:5100',
      eventsUri: 'http://localhost:5100',
      dataSynchronizer: factory,
    });

    fbClient = provider.getClient();
    OpenFeature.setProvider(provider);
    openFeatureClient = OpenFeature.getClient();
    logger.reset();
  });

  afterEach(() => {
    jest.resetAllMocks();
  })

  afterAll(async () => {
    await provider.onClose();
  });
  // String variations
  it('calls the client correctly for string variations', async () => {
    fbClient.evaluateCore<string> = jest.fn( () => ({
      kind: ReasonKinds.Off,
      reason: '',
      value: 'some value'
    }));
    await openFeatureClient.getStringDetails(testFlagKey, 'default', basicContext);
    expect(fbClient.evaluateCore)
      .toHaveBeenCalledWith(testFlagKey, translateContext(logger, basicContext), 'default', expect.anything());
    jest.clearAllMocks();
    await openFeatureClient.getStringValue(testFlagKey, 'default', basicContext);
    expect(fbClient.evaluateCore)
      .toHaveBeenCalledWith(testFlagKey, translateContext(logger, basicContext), 'default', expect.anything());
  });

  it('handles correct return types for string variations', async () => {
    await td.update(testFlagBuilder.isEnabled(true).build());
    const res = await openFeatureClient.getStringDetails(testFlagKey, 'default', basicContext);
    expect(res).toMatchObject({
      flagKey: testFlagKey,
      value: 'true',
      reason: ReasonKinds.TargetMatch,
    });
  });

  // Boolean variations
  it('calls the client correctly for boolean variations', async () => {
    fbClient.evaluateCore<boolean> = jest.fn( () => ({
      kind: ReasonKinds.Off,
      reason: '',
      value: true
    }));
    await openFeatureClient.getBooleanDetails(testFlagKey, false, basicContext);
    expect(fbClient.evaluateCore)
      .toHaveBeenCalledWith(testFlagKey, translateContext(logger, basicContext), false, expect.anything());
    jest.clearAllMocks();
    await openFeatureClient.getBooleanValue(testFlagKey, false, basicContext);
    expect(fbClient.evaluateCore)
      .toHaveBeenCalledWith(testFlagKey, translateContext(logger, basicContext), false, expect.anything());
  });

  it('handles correct return types for boolean variations', async () => {
    await td.update(testFlagBuilder.isEnabled(true).build());
    const res = await openFeatureClient.getBooleanDetails(testFlagKey, false, basicContext);
    expect(res).toMatchObject({
      flagKey: testFlagKey,
      value: true,
      reason: ReasonKinds.TargetMatch,
    });
  });

  it('handles incorrect return types for boolean variations', async () => {
    await td.update(testFlagBuilder.isEnabled(false).build());
    const res = await openFeatureClient.getBooleanDetails(testFlagKey, false, basicContext);
    expect(res).toMatchObject({
      flagKey: testFlagKey,
      value: false,
      reason: 'ERROR',
      errorCode: 'TYPE_MISMATCH',
    });
  });

  // Numeric variations
  it('calls the client correctly for numeric variations', async () => {
    fbClient.evaluateCore<number> = jest.fn( () => ({
      kind: ReasonKinds.Off,
      reason: '',
      value: 1
    }));
    await openFeatureClient.getNumberDetails(testFlagKey, 0, basicContext);
    expect(fbClient.evaluateCore)
      .toHaveBeenCalledWith(testFlagKey, translateContext(logger, basicContext), 0, expect.anything());
    jest.clearAllMocks();
    await openFeatureClient.getNumberValue(testFlagKey, 0, basicContext);
    expect(fbClient.evaluateCore)
      .toHaveBeenCalledWith(testFlagKey, translateContext(logger, basicContext), 0, expect.anything());
  });

  it('handles correct return types for numeric variations', async () => {
    await td.update(testFlagBuilder.variations([{id: 'invalidId', value: '1'}]).isEnabled(false).build());
    const res = await openFeatureClient.getNumberDetails(testFlagKey, 0, basicContext);
    expect(res).toMatchObject({
      flagKey: testFlagKey,
      value: 1,
      reason: ReasonKinds.Off
    });
  });

  it('handles incorrect return types for numeric variations', async () => {
    await td.update(testFlagBuilder.isEnabled(true).build());
    const res = await openFeatureClient.getNumberDetails(testFlagKey, 0, basicContext);
    expect(res).toMatchObject({
      flagKey: testFlagKey,
      value: 0,
      reason: 'ERROR',
      errorCode: 'TYPE_MISMATCH',
    });
  });

  // JSON variations
  it('calls the client correctly for object variations', async () => {
    fbClient.evaluateCore<any> = jest.fn( () => ({
      kind: ReasonKinds.Off,
      reason: '',
      value: { some: 'value' }
    }));
    await openFeatureClient.getObjectDetails(testFlagKey, {}, basicContext);
    expect(fbClient.evaluateCore)
      .toHaveBeenCalledWith(testFlagKey, translateContext(logger, basicContext), {}, expect.anything());
    jest.clearAllMocks();
    await openFeatureClient.getObjectValue(testFlagKey, {}, basicContext);
    expect(fbClient.evaluateCore)
      .toHaveBeenCalledWith(testFlagKey, translateContext(logger, basicContext), {}, expect.anything());
  });

  it('handles correct return types for object variations', async () => {
    await td.update(testFlagBuilder.variations([{id: 'invalidId', value: '{"some": "value"}'}]).isEnabled(false).build());
    const res = await openFeatureClient.getObjectDetails(testFlagKey, {}, basicContext);
    expect(res).toMatchObject({
      flagKey: testFlagKey,
      value: { some: 'value' },
      reason: ReasonKinds.Off
    });
  });

  it('handles incorrect return types for object variations', async () => {
    await td.update(testFlagBuilder.isEnabled(false).build());
    const res = await openFeatureClient.getObjectDetails(testFlagKey, {}, basicContext);
    expect(res).toMatchObject({
      flagKey: testFlagKey,
      value: {},
      reason: 'ERROR',
      errorCode: 'TYPE_MISMATCH',
    });
  });

  it('not existing flag', async () => {
    const flagKey = 'not_existing_flag';
    const res = await openFeatureClient.getObjectDetails(flagKey, {}, basicContext);
    expect(res).toMatchObject({
      flagKey,
      value: {},
      reason: 'ERROR',
      errorCode:  ErrorCode.FLAG_NOT_FOUND,
    });
  });

  it('logs information about missing keys', async () => {
    await openFeatureClient.getObjectDetails(testFlagKey, {}, {});
    expect(logger.logs[0]).toEqual("The EvaluationContext must contain either a 'targetingKey' "
      + "or a 'key' and the type must be a string.");
  });
});


