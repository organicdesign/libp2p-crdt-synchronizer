import { SyncContext, BroadcastHandler } from "@organicdesign/crdt-interfaces";

export interface CRDTSynchronizer {
	protocol: string,
	sync (data: Uint8Array | undefined, context: SyncContext): Uint8Array | undefined
}

// Todo work out how this is going to work.
export interface CRDTSerializer {
	serialize? (): Uint8Array
	deserialize? (data: Uint8Array): void
}

// Todo work out how this is going to work.
export interface CRDTBroadcaster {
	addBroadcaster? (broadcaster: BroadcastHandler): void
	onBroadcast?: BroadcastHandler
}

// Extend just to help ensure compatibility.
export interface CRDT extends CRDTSerializer, CRDTBroadcaster {
	id: Uint8Array
	toValue (): unknown
	getProtocols (): Iterable<string>
	getSynchronizer (protocol: string): CRDTSynchronizer | undefined
}
