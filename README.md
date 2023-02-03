# libp2p-crdt-synchronizer

A CRDT synchronizer for Libp2p.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
  - [createCRDTSynchronizer](#createcrdtsynchronizer)
  - [CRDTSynchronizer](#crdtsynchronizer)
    - [start](#start)
    - [stop](#stop)
    - [setCRDT](#setcrdt)
    - [getCRDT](#getcrdt)
    - [sync](#sync)
    - [CRDTNames](#crdtnames)
- [Logging](#logging)
- [Building](#building)
- [Tests](#tests)
- [To-Do](#to-do)

## install

```
npm i @organicdesign/libp2p-crdt-synchronizer
```

## Usage

```javascript
import { createCRDTSynchronizer } from "@organicdesign/libp2p-crdt-synchronizer";

const synchronizer = createCRDTSynchronizer(options)(libp2p);

synchronizer.start();

// 'crdt' is an instance of a crdt wich follows the 'CRDT' interface.
synchronizer.setCRDT("my-crdt", crdt);

// Manually synchronize crdts. (Only needed if autoSync is disabled.)
await synchronizer.sync();

// Output the value,
console.log(synchronizer.getCRDT("my-crdt").toValue());

// Stop the synchronizer.
await synchronizer.stop();
```

Any crdt should work if it follows the `CRDT` interface from `@organicdesign/crdt-interfaces` and all instances in your network are using the same CRDT under each name. You can also use one of the CRDT implementations from `@organicdesign/crdts`.

## API

### createCRDTSynchronizer

```javascript
createCRDTSynchronizer([options])(libp2p);
```

- `options` `<Object>` An optional object with the following properties:
  - `protocol` `<string>` Specifies the name of the protocol to sync crdts over. Default: `"/libp2p-crdt-synchronizer/0.0.1"`.
  - `autoSync` `<boolean>` Enables auto sync. Default: `true`.
  - `interval` `<integer>` Specifies the interval to sync the crdts. Requires autoSync to be enabled. Default: `120000` (2 minutes).
- `libp2p` `<Libp2p>` The libp2p instance.
- Returns: `<MessageHandler>` The message handler instance.

Creates a Libp2p message handler

### CRDTSynchronizer

```javascript
new CRDTSynchronizer(libp2p, [options]);
```

- `options` `<Object>` An optional object with the following properties:
  - `protocol` `<string>` Specifies the name of the protocol to sync crdts over. Default: `"/libp2p-crdt-synchronizer/0.0.1"`.
  - `autoSync` `<boolean>` Enables auto sync. Default: `true`.
  - `interval` `<integer>` Specifies the interval to sync the crdts. Requires autoSync to be enabled. Default: `120000` (2 minutes).
- `libp2p` `<Libp2p>` The libp2p instance.

The CRDTSynchronizer class. It is not recommended to instanciate it directly but rather use the `createCRDTSynchronizer` function.

#### start

```javascript
crdtSynchronizer.start();
```

- Returns: `<Promise>`

Start the synchronizer, resolves when it has finished starting.

#### stop

```javascript
crdtSynchronizer.stop();
```

- Returns: `<Promise>`

Stop the synchronizer, resolves when it has finished stopping.

#### setCRDT

```javascript
crdtSynchronizer.setCRDT(name, crdt);
```

- `name` `<string>` The name to store the CRDT under.
- `crdt` `<CRDT>` A CRDT implementing the CRDT interface from `@organicdesign/crdt-interfaces`.

Add a CRDT to the synchronizer under a name.

#### getCRDT

```javascript
crdtSynchronizer.getCRDT(name);
```

- `name` `<string>` The name to get the CRDT by.
- Returns: `<CRDT>` | `<undefined>` The CRDT that was assigned to this name or undefined if the name is not assigned.

Get a CRDT from the synchronizer by name.

#### sync

```javascript
crdtSynchronizer.sync();
```

- Returns: `<Promise>`

Manually run synchronization with all connected peers. Resolves when completed. It is not necessary to call this if `autoSync` in the options is enabled but may still be called if synchronization is needed on demand.

#### CRDTNames

```javascript
crdtSynchronizer.CRDTNames;
```

- Type `<string[]>` The list names with CRDTs assigned to them.

Get a list of CRDT names.

## Logging

The logger has the following namespaces:

* `libp2p:crdt-synchronizer` - Logs general actions like starting, stopping and sync.
* `libp2p:crdt-synchronizer:peers` - Logs individual peer sync cycles.
* `libp2p:crdt-synchronizer:crdts` - Logs individual CRDT sync cycles.

To enable logging in nodejs add the following environment variable (by prefixing the start command):

```
DEBUG=libp2p:crdt-synchronizer*
```

Or in the browser:

```javascript
localStorage.setItem("debug", "libp2p:crdt-synchronizer*");
```

## Building

To build the project files:

```
npm run build:protos && npm run build
```

## Tests

To run the test suite:

```
npm run test
```

To lint the files:

```
npm run lint
```

## To-Do

- [x] Add tests.
- [x] Add logging.
