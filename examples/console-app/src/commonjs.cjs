const fb = require('@featbit/node-server-sdk');
const { FbProvider } = require("@featbit/openfeature-provider-node-server");
const { OpenFeature, ProviderEvents } = require("@openfeature/server-sdk");

const provider = new FbProvider({ sdkKey: 'K-uRsveVY0m8r_8QBJYZfwicaDhphJRkq67HkDfO44sQ', streamingUri: 'wss://app-eval.featbit.co', eventsUri: 'https://app-eval.featbit.co' });
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