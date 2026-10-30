import { OpenFeature, ProviderEvents } from '@openfeature/server-sdk';
import { FbProvider } from '@featbit/openfeature-provider-node-server';

const provider = new FbProvider({
  sdkKey: 'j-2pVwU1e0uNg8LR_u27KAL1n1amy42U2P2kDf5acCMA',
  streamingUri: 'ws://localhost:5100',
  eventsUri: 'http://localhost:5100'
});

OpenFeature.setProvider(provider);

// If you need access to the FbClient, then you can use provider.getClient()

// Evaluations before the provider indicates it is ready may get default values with a
// CLIENT_NOT_READY reason.
OpenFeature.addHandler(ProviderEvents.Ready, async (eventDetails) => {
  console.log(`Changed ${eventDetails.flagsChanged}`);

  const client = OpenFeature.getClient();
  // targetingKey identifies the user, not the metric event name.
  const context = { targetingKey: 'my-key' };
  const value = await client.getBooleanValue('ff1', false, context);
  console.log({ value });

  // Demo events: in an application, track when the corresponding action occurs.
  // The first argument is the metric event name configured in FeatBit.
  // Use the same user context as the flag evaluation; no other user fields are required.
  client.track('page-view', context); // Omitted metric value defaults to 1.
  client.track('purchase', context, { value: 99.9 }); // Custom numeric metric value.
});


// The FeatBit provider supports the ProviderEvents.ConfigurationChanged event.
// The provider will emit this event for any flag key that may have changed (each event will contain
// a single key in the `flagsChanged` field).
OpenFeature.addHandler(ProviderEvents.ConfigurationChanged, async (eventDetails) => {
  const client = OpenFeature.getClient();
  const value = await client.getBooleanValue('ff1', false, {targetingKey: 'my-key'});
  console.log({...eventDetails, value});
});

// (async () => {
//   // When the FeatBit provider is closed it will flush the events on the FbClient instance.
//   // This can be useful for short lived processes.
//   await OpenFeature.close();
// })();
