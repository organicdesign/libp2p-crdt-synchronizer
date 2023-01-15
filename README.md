# libp2p-crdt-synchronizer

A CRDT synchronizer for Libp2p.

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

### createCRDTSynchronizer([options])(libp2p)

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

### synchronizer.start()

```javascript
synchronizer.start();
```

- Returns: `<Promise>`

Start the synchronizer, resolves when it has finished starting.

### synchronizer.stop()

```javascript
synchronizer.stop();
```

- Returns: `<Promise>`

Stop the synchronizer, resolves when it has finished stopping.

### synchronizer.setCRDT(name, crdt)

```javascript
synchronizer.setCRDT(name, crdt);
```

- `name` `<string>` The name to store the CRDT under.
- `crdt` `<CRDT>` A CRDT implementing the CRDT interface from `@organicdesign/crdt-interfaces`.

Add a CRDT to the synchronizer under a name.

### synchronizer.getCRDT(name)

```javascript
synchronizer.getCRDT(name);
```

- `name` `<string>` The name to get the CRDT by.
- Returns: `<CRDT>` | `<undefined>` The CRDT that was assigned to this name or undefined if the name is not assigned.

Get a CRDT from the synchronizer by name.

### synchronizer.sync()

```javascript
synchronizer.sync();
```

- Returns: `<Promise>`

Manually run synchronization with all connected peers. Resolves when completed. It is not nessary to call this if `autoSync` in the options is enabled but may still be called if synchronization is needed on demand.

### synchronizer.CRDTNames

```javascript
synchronizer.CRDTNames;
```

- Type `<string[]>` The list names with CRDTs assigned to them.

Get a list of CRDT names.

## TODO

- [ ] Add tests.
