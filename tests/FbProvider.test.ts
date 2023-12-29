import { FbProvider } from "../src";
import { ProviderEvents, ProviderStatus } from "@openfeature/server-sdk";
// @ts-ignore
import TestLogger from "./TestLogger";
import { IClientContext } from "@featbit/node-server-sdk";

it('can be initialized', async () => {
  const logger = new TestLogger();
  const provider = new FbProvider({ sdkKey: 'sdk-key', offline: true, logger });
  await provider.initialize({});

  expect(provider.status).toEqual(ProviderStatus.READY);
  expect(logger.logs.length).toEqual(2);
  expect(logger.logs).toEqual(['Offline mode enabled. No streaming or polling will occur.', 'FbClient started successfully.']);
  await provider.onClose();
});

it('can fail to initialize client', async () => {
  const logger = new TestLogger();
  const provider = new FbProvider({
    sdkKey: 'sdk-key',
    logger,
    dataSynchronizer: (
      clientContext: IClientContext,
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

// it('emits events for flag changes', async () => {
//   const td = new integrations.TestData();
//   const provider = new FbProvider( {
//     sdkKey: 'sdk-key',
//     dataSynchronizer: td.getFactory(),
//   });
//   let count = 0;
//   provider.events.addHandler(ProviderEvents.ConfigurationChanged, (eventDetail) => {
//     expect(eventDetail?.flagsChanged).toEqual(['flagA']);
//     count += 1;
//   });
//   td.update(td.flag('flagA').valueForAll('B'));
//   expect(await provider.getClient()
//     .stringVariation('flagA', { key: 'test-key' }, 'A'))
//     .toEqual('B');
//   expect(count).toEqual(1);
//   await provider.onClose();
// });
