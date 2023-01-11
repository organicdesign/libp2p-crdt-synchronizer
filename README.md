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

`options` is an optional object with the following properties:
- `protocol`: A string which specifies the name of the protocol to sync crdts over. Defaults to `"/libp2p-crdt-synchronizer/0.0.1"`.
- `autoSync`: A boolean value which enables auto sync. Defaults to `true`.
- `interval`: An integer value which specifies the interval to sync the crdts. Requires autoSync to be enabled. Defaults to `120000` (2 minutes).
