# Console example for @featbit/openfeature-provider-node-server

## Introduction
The current example APP contains two files in src folder:
- `esm.ts`: example for using ES module and typescript.
- `commonjs.cjs`: example for using commonjs.


## Get started

This example uses the local provider and FeatBit SDK through `file:` dependencies.
Compile the provider from the repository root with `npx tsc` before running the examples.
Configure the SDK key and service URLs in the selected source file for your environment.

```bash
npm install
```

### ES module

```bash
npm run esm
```

### CommonJs

```bash
npm run cjs
```

## Tracking

Both examples evaluate `ff1` after the provider is ready, then send two demo events:

```js
const context = { targetingKey: 'my-key' };
client.track('page-view', context);
client.track('purchase', context, { value: 99.9 });
```

`targetingKey` is the user ID and must match the flag evaluation context. It is the only
required user field; `name` and custom attributes are optional. The first argument
(`page-view` or `purchase`) is the metric event name: replace it with the event name
configured for your FeatBit metric. An omitted value defaults to `1`.

These calls send demonstration events on provider readiness. In an application, place
them where the actual user actions occur. Call `await OpenFeature.close()` on shutdown
to flush pending events and release resources.
