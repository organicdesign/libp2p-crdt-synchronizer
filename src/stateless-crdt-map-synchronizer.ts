import type { CRDTSynchronizer, CRDT, SynchronizableCRDT, SyncContext } from "@organicdesign/crdt-interfaces";
import { StatelessSyncMessage, StatelessMessageType } from "./CRDTSyncProtocol.js";

export interface CRDTMapSyncComponents {
	getCRDTKeys (): Iterable<string>
	getCrdt (key: string): CRDT | SynchronizableCRDT | undefined
	getId (): Uint8Array
}

export interface CRDTMapSyncOpts {
	protocol: string
}

const isSynchronizableCRDT = (crdt: CRDT) => crdt["getSynchronizer"] && crdt["getSynchronizerProtocols"];

export class CRDTMapSynchronizer implements CRDTSynchronizer {
	public readonly protocol: string;
	private readonly components: CRDTMapSyncComponents;

	constructor(components: CRDTMapSyncComponents, options: Partial<CRDTMapSyncOpts> = {}) {
		this.protocol = options.protocol ?? "/stateless-crdt-map/0.1.0";
		this.components = components;
	}

	sync (data: Uint8Array | undefined, context: SyncContext): Uint8Array | undefined {
		if (data == null) {
			const crdt = this.getNextCrdt();

			return StatelessSyncMessage.encode({
				type: StatelessMessageType.SELECT,
				crdt
			});
		}

		const message = StatelessSyncMessage.decode(data);

		switch (message.type) {
			case StatelessMessageType.SELECT_RESPONSE:
				if (message.accept) {
					if (message.crdt != null && message.protocol != null) {
						// Accepted both protocol and crdt
						const crdt = this.components.getCrdt(message.crdt);

						if (crdt == null || !isSynchronizableCRDT(crdt)) {
							return this.selectNextCrdt(message.crdt);
						}

						const synchronizer = (crdt as SynchronizableCRDT).getSynchronizer(message.protocol);

						if (synchronizer == null) {
							return this.selectNextProtocol(message.crdt, message.protocol);
						}
					}

					if (message.crdt != null) {
						return this.selectNextProtocol(message.crdt, message.protocol);
					}

					throw new Error("SELECT_RESPONSE must include crdt");
				} else {
					if (message.crdt != null && message.protocol != null) {
						return this.selectNextProtocol(message.crdt, message.protocol);
					}

					if (message.crdt != null) {
						// Rejected only CRDT
						return this.selectNextCrdt(message.crdt);
					}

					throw new Error("SELECT_RESPONSE must include crdt");
				}
			case StatelessMessageType.SYNC_RESPONSE:
				return this.handleCRDTSyncResponse(message, context.id);
			case StatelessMessageType.SYNC:
				return this.handleCRDTSync(message, context.id);
			case StatelessMessageType.SELECT:
				return this.handleCRDTSelect(message, context.id);
			default:
				throw new Error(`recieved unknown message type: ${message.type}`);
		}
	}

	private selectNextProtocol (crdt: string, protocol?: string) {
		const next = this.getNextProtocol(crdt, protocol);

		if (next == null) {
			return this.selectNextCrdt(crdt);
		}

		return StatelessSyncMessage.encode({
			type: StatelessMessageType.SELECT,
			crdt,
			protocol: next
		});
	}

	private selectNextCrdt (name?: string) {
		const crdt = this.getNextCrdt(name);

		if (crdt == null) {
			return new Uint8Array();
		}

		return StatelessSyncMessage.encode({
			type: StatelessMessageType.SELECT,
			crdt
		});
	}

	private getNextCrdt(last?: string) {
		return this.getNext(this.components.getCRDTKeys(), last);
	}

	private getNextProtocol(crdtName: string, last?: string) {
		const crdt = this.components.getCrdt(crdtName);

		if (crdt == null || !isSynchronizableCRDT(crdt)) {
			return;
		}

		const iterable = (crdt as SynchronizableCRDT).getSynchronizerProtocols();

		return this.getNext(iterable, last);
	}

	private getNext (iterable: Iterable<string>, last?: string) {
		const iterator = iterable[Symbol.iterator]();
		let curr = iterator.next();

		if (last == null) {
			return curr.value;
		}

		while (!curr.done) {
			if (curr.value === last) {
				return iterator.next().value;
			}

			curr = iterator.next();
		}

		return curr.value;
	}
}

export const createCRDTMapSynchronizer = (options?: Partial<CRDTMapSyncOpts>) => (components: CRDTMapSyncComponents) => new CRDTMapSynchronizer(components, options);
