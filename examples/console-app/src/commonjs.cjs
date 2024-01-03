const fb = require('@featbit/node-server-sdk');
const { FbProvider } = require("@featbit/openfeature-provider-node-server");
const { OpenFeature, ProviderEvents } = require("@openfeature/server-sdk");

const provider = new FbProvider({ sdkKey: 'j-2pVwU1e0uNg8LR_u27KAL1n1amy42U2P2kDf5acCMA', streamingUri: 'ws://localhost:5100', eventsUri: 'http://localhost:5100' });
OpenFeature.setProvider(provider);

// If you need access to the FbClient, then you can use provider.getClient()

// Evaluations before the provider indicates it is ready may get default values with a
// CLIENT_NOT_READY reason.
OpenFeature.addHandler(ProviderEvents.Ready, (eventDetails) => {
    console.log(`Changed ${eventDetails.flagsChanged}`);
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
//     // When the FeatBit provider is closed it will flush the events on the FbClient instance.
//     // This can be useful for short lived processes.
//     await OpenFeature.close();
// })();