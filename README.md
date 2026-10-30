# FeatBit OpenFeature provider for Node.js SDK

## Introduction

This is the OpenFeature provider for the [Node.js Server-Side SDK](https://github.com/featbit/featbit-node-server-sdk) for the 100% open-source feature flags management platform [FeatBit](https://github.com/featbit/featbit).

The FeatBit OpenFeature provider is designed primarily for use in multi-user systems such as web servers and applications. It is not intended for use in desktop and embedded systems applications.

## Tracking

After registering and initializing the provider, use the OpenFeature client to track events:

```js
const client = OpenFeature.getClient();
const context = { targetingKey: 'user-123' };

client.track('page-view', context);
client.track('purchase', context, { value: 99.9 });
```

Tracking uses the same context-to-user mapping as flag evaluations, including `targetingKey`
(or the legacy `key`), `name`, and custom user attributes. OpenFeature merges context before
passing it to the provider, so a user key set on the client or global context can also be used.
The optional `value` is passed to FeatBit as the numeric metric value; when omitted, the
FeatBit SDK defaults it to `1`. A value of `0` is preserved. Other tracking event details
are ignored because the FeatBit SDK only supports a numeric metric value.

`track` returns `void` and does not need to be awaited. Events are delivered by the FeatBit
SDK's event processor. Call `await OpenFeature.close()` at application shutdown to flush
pending events and release resources.

## Supported Node versions

This version of the FeatBit OpenFeature provider is compatible with Node.js versions 16 and above.

## Getting started

### Installation

```bash
npm install @openfeature/server-sdk
npm install @featbit/node-server-sdk
npm install @featbit/openfeature-provider-node-server
```

### Quick start

```js
import { OpenFeature, ProviderEvents } from '@openfeature/server-sdk';
import { FbProvider } from '@featbit/openfeature-provider-node-server';

const provider = new FbProvider({
    sdkKey: '<your-sdk-key>',
    streamingUri: '<your-streaming-uri>',
    eventsUri: '<your-events-uri>'
});

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
```
