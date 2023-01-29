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

						return StatelessSyncMessage.encode({
							type: StatelessMessageType.SYNC,
							sync: synchronizer.sync(undefined, context),
							crdt: message.crdt,
							protocol: message.protocol
						});
					}

					if (message.crdt != null) {
						return this.selectNextProtocol(message.crdt, message.protocol);
					}
				} else {
					if (message.crdt != null && message.protocol != null) {
						return this.selectNextProtocol(message.crdt, message.protocol);
					}

					if (message.crdt != null) {
						// Rejected only CRDT
						return this.selectNextCrdt(message.crdt);
					}
				}

				throw new Error("SELECT_RESPONSE must include crdt");
			case StatelessMessageType.SYNC_RESPONSE:
				{
					if (message.protocol == null || message.crdt == null) {
						throw new Error("missing protocol or crdt");
					}

					if (message.sync == null || message.sync.length === 0) {
						return new Uint8Array();
					}

					const crdt = this.components.getCrdt(message.crdt);

					if (crdt == null || !isSynchronizableCRDT(crdt)) {
						return StatelessSyncMessage.encode({
							type: StatelessMessageType.SELECT_RESPONSE,
							accept: false,
							crdt: message.crdt
							// Don't include protocol here since we want to reject the CRDT itself.
						});
					}

					const synchronizer = (crdt as SynchronizableCRDT).getSynchronizer(message.protocol);

					if (synchronizer == null) {
						return StatelessSyncMessage.encode({
							type: StatelessMessageType.SELECT_RESPONSE,
							accept: false,
							crdt: message.crdt,
							protocol: message.protocol
						});
					}

					return StatelessSyncMessage.encode({
						type: StatelessMessageType.SYNC,
						sync: synchronizer.sync(message.sync, context)
					});
				}
			case StatelessMessageType.SYNC:
				if (message.protocol == null || message.crdt == null) {
					throw new Error("missing protocol or crdt");
				}

				const crdt = this.components.getCrdt(message.crdt);

				if (crdt == null || !isSynchronizableCRDT(crdt)) {
					return StatelessSyncMessage.encode({
						type: StatelessMessageType.SELECT_RESPONSE,
						accept: false,
						crdt: message.crdt
						// Don't include protocol here since we want to reject the CRDT itself.
					});
				}

				const synchronizer = (crdt as SynchronizableCRDT).getSynchronizer(message.protocol);

				if (synchronizer == null) {
					return StatelessSyncMessage.encode({
						type: StatelessMessageType.SELECT_RESPONSE,
						accept: false,
						crdt: message.crdt,
						protocol: message.protocol
					});
				}

				return StatelessSyncMessage.encode({
					type: StatelessMessageType.SYNC_RESPONSE,
					sync: synchronizer.sync(message.sync, context)
				});

			case StatelessMessageType.SELECT:
				if (message.crdt != null && message.protocol != null) {
					// Trying to select protocol
					const crdt = this.components.getCrdt(message.crdt);

					if (crdt == null || !isSynchronizableCRDT(crdt)) {
						return StatelessSyncMessage.encode({
							type: StatelessMessageType.SELECT_RESPONSE,
							accept: false,
							crdt: message.crdt
							// Don't include protocol here since we want to reject the CRDT itself.
						});
					}

					const synchronizer = (crdt as SynchronizableCRDT).getSynchronizer(message.protocol);

					return StatelessSyncMessage.encode({
						type: StatelessMessageType.SELECT_RESPONSE,
						accept: synchronizer != null,
						crdt: message.crdt,
						protocol: message.protocol
					});
				}

				if (message.crdt != null) {
					// Trying to select CRDT
					return StatelessSyncMessage.encode({
						type: StatelessMessageType.SELECT_RESPONSE,
						accept: this.components.getCrdt(message.crdt) != null,
						crdt: message.crdt
					});
				}

				throw new Error("SELECT must include crdt");
			default:
				throw new Error(`recieved unknown message type: ${message.type}`);
		}
	}

	// Create a messsage that selects the next protocol.
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

	// Create a message that selects the next CRDT.
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

	// Get the next CRDT name.
	private getNextCrdt(last?: string) {
		return this.getNext(this.components.getCRDTKeys(), last);
	}

	// Get the next protocol name.
	private getNextProtocol(crdtName: string, last?: string) {
		const crdt = this.components.getCrdt(crdtName);

		if (crdt == null || !isSynchronizableCRDT(crdt)) {
			return;
		}

		const iterable = (crdt as SynchronizableCRDT).getSynchronizerProtocols();

		return this.getNext(iterable, last);
	}

	// Get the next valuee from an iterable.
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
