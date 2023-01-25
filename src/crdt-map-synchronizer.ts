import type { CRDTSynchronizer, CRDT, SynchronizableCRDT, SyncContext } from "@organicdesign/crdt-interfaces";
import { BufferMap } from "@organicdesign/buffer-collections";
import { SyncMessage, MessageType } from "./CRDTSyncProtocol.js";

export interface CRDTMapSyncComponents {
	getCRDTKeys (): Iterable<string>
	getCrdt (key: string): CRDT | SynchronizableCRDT | undefined
	getId (): Uint8Array
}

export interface CRDTMapSyncOpts {
	protocol: string
}

interface Store {
	crdt?: string
	protocol?: string
	crdtIterator?: Iterator<string>
	protocolIterator?: Iterator<string>
}

const isSynchronizableCRDT = (crdt: CRDT) => crdt["getSynchronizer"] && crdt["getSynchronizerProtocols"];

export class CRDTMapSynchronizer implements CRDTSynchronizer {
	public readonly protocol: string;
	private readonly components: CRDTMapSyncComponents;
	private readonly inStore = new BufferMap<Store>();
	private readonly outStore = new BufferMap<Store>();
	private readonly genMsgId = (() => {
		let id = 0;

		return () => id++;
	})();

	constructor(components: CRDTMapSyncComponents, options: Partial<CRDTMapSyncOpts> = {}) {
		this.protocol = options.protocol ?? "/crdt-map/0.1.0";
		this.components = components;
	}

	sync (data: Uint8Array | undefined, context: SyncContext): Uint8Array | undefined {
		if (data == null) {
			this.inStore.clear();
			this.outStore.clear();
			return this.selectCRDT(context.id);
		}

		const message = SyncMessage.decode(data);

		switch (message.type) {
			case MessageType.SELECT_RESPONSE:
				return this.handleCRDTSelectResponse(message, context.id);
			case MessageType.SYNC_RESPONSE:
				return this.handleCRDTSyncResponse(message, context.id);
			case MessageType.SYNC:
				return this.handleCRDTSync(message, context.id);
			case MessageType.SELECT_CRDT:
				return this.handleCRDTSelect(message, context.id);
			case MessageType.SELECT_PROTOCOL:
				return this.handleProtocolSelect(message, context.id);
			default:
				throw new Error(`recieved unknown message type: ${message.type}`);
		}
	}

	private handleCRDTSelectResponse (message: SyncMessage, id: Uint8Array) {
		if (message.type !== MessageType.SELECT_RESPONSE) {
			throw new Error(`invalid handler for message of type: ${message.type}`);
		}

		const accepted = !!message.accept;
		const store = this.outStore.get(id);

		if (store == null || store.crdt == null) {
			return this.selectCRDT(id);
		}

		if (store.protocol != null && accepted) {
			return this.runSync(id);
		}

		return this.selectProtocol(id);
	}

	private handleCRDTSync (message: SyncMessage, id: Uint8Array) {
		if (message.type !== MessageType.SYNC) {
			throw new Error(`invalid handler for message of type: ${message.type}`);
		}

		return this.runSync(id, message);
	}

	private handleCRDTSyncResponse (message: SyncMessage, id: Uint8Array) {
		if (message.type !== MessageType.SYNC_RESPONSE) {
			throw new Error(`invalid handler for message of type: ${message.type}`);
		}

		return this.runSync(id, message);
	}

	private runSync (id: Uint8Array, message?: SyncMessage) {
		if (message != null && ![MessageType.SYNC_RESPONSE, MessageType.SYNC].includes(message.type)) {
			throw new Error(`invalid handler for message of type: ${message.type}`);
		}

		const direction = (message == null || message.type === MessageType.SYNC_RESPONSE) ? "out" : "in";
		const store = (direction === "out" ? this.outStore : this.inStore).get(id);
		const key = store?.crdt;
		const protocol = store?.protocol;

		if (store == null || key == null || protocol == null) {
			throw new Error("invalid state");
		}

		const crdt = this.components.getCrdt(key);

		if (crdt == null || !isSynchronizableCRDT(crdt)) {
			throw new Error("invalid crdt");
		}

		const synchronizer = (crdt as SynchronizableCRDT).getSynchronizer(protocol);

		if (synchronizer == null) {
			throw new Error("invalid protocol");
		}

		const messageId = message?.id ?? this.genMsgId();
		const syncData = synchronizer.sync(message?.sync, { id, syncId: messageId });

		if (syncData == null && direction === "out") {
			return this.selectCRDT(id);
		}

		if (syncData == null) {
			return;
		}

		return SyncMessage.encode({
			type: direction === "out" ? MessageType.SYNC : MessageType.SYNC_RESPONSE,
			id: messageId,
			sync: syncData
		});
	}

	private handleCRDTSelect (message: SyncMessage, id: Uint8Array) {
		if (message.type !== MessageType.SELECT_CRDT) {
			throw new Error(`invalid handler for message of type: ${message.type}`);
		}

		const key = message.select;

		if (key == null) {
			throw new Error(`SELECT_CRDT message must include the select parameter`);
		}

		const hasCrdt = !!this.components.getCrdt(key);

		if (hasCrdt) {
			this.inStore.set(id, {
				crdt: key
			});
		} else {
			this.inStore.set(id, {});
		}

		return SyncMessage.encode({
			type: MessageType.SELECT_RESPONSE,
			accept: hasCrdt,
			id: message.id
		});
	}

	private handleProtocolSelect (message: SyncMessage, id: Uint8Array) {
		if (message.type !== MessageType.SELECT_PROTOCOL) {
			throw new Error(`invalid handler for message of type: ${message.type}`);
		}

		const protocol = message.select;

		if (protocol == null) {
			throw new Error(`SELECT_PROTOCOL message must include the select parameter`);
		}

		const store = this.inStore.get(id);
		const crdtKey = store?.crdt;

		if (store == null || crdtKey == null) {
			return SyncMessage.encode({
				type: MessageType.SELECT_RESPONSE,
				accept: false,
				id: message.id
			});
		}

		const crdt = this.components.getCrdt(crdtKey);

		if (crdt == null || !isSynchronizableCRDT(crdt)) {
			return SyncMessage.encode({
				type: MessageType.SELECT_RESPONSE,
				accept: false,
				id: message.id
			});
		}

		const hasSynchronizer = !!(crdt as SynchronizableCRDT).getSynchronizer(protocol);

		if (hasSynchronizer) {
			this.inStore.set(id, {
				...store,
				protocol
			});
		}

		return SyncMessage.encode({
			type: MessageType.SELECT_RESPONSE,
			accept: hasSynchronizer,
			id: message.id
		});
	}

	private selectCRDT (id: Uint8Array) {
		const store = this.outStore.get(id);
		let iterator: Iterator<string>;

		if (store == null || store.crdtIterator == null) {
			iterator = this.components.getCRDTKeys()[Symbol.iterator]();
		} else {
			iterator = store.crdtIterator;
		}

		const itrResult = iterator.next();
		const key = itrResult.value;

		if (itrResult.done) {
			return;
		}

		this.outStore.set(id, {
			crdt: key,
			crdtIterator: iterator
		});

		return SyncMessage.encode({
			type: MessageType.SELECT_CRDT,
			select: key,
			id: this.genMsgId()
		});
	}

	private selectProtocol (id: Uint8Array) {
		const store = this.outStore.get(id);

		if (store == null || store.crdt == null) {
			return this.selectCRDT(id);
		}

		const crdt = this.components.getCrdt(store?.crdt);

		if (crdt == null || !isSynchronizableCRDT(crdt)) {
			return this.selectCRDT(id);
		}

		let iterator: Iterator<string>;

		if (store.protocolIterator == null) {
			iterator = (crdt as SynchronizableCRDT).getSynchronizerProtocols()[Symbol.iterator]();
		} else {
			iterator = store.protocolIterator;
		}

		const itrResult = iterator.next();
		const protocol = itrResult.value;

		if (itrResult.done) {
			return this.selectCRDT(id);
		}

		this.outStore.set(id, {
			crdt: store.crdt,
			crdtIterator: store.crdtIterator,
			protocol,
			protocolIterator: iterator
		});

		return SyncMessage.encode({
			type: MessageType.SELECT_PROTOCOL,
			select: protocol,
			id: this.genMsgId()
		});
	}
}

export const createCRDTMapSynchronizer = (options?: Partial<CRDTMapSyncOpts>) => (components: CRDTMapSyncComponents) => new CRDTMapSynchronizer(components, options);
