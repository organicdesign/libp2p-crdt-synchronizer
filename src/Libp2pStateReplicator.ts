import { JSONRPCServerAndClient, JSONRPCClient, JSONRPCServer } from "json-rpc-2.0";
import type { Libp2p } from "libp2p";
import * as lp from "it-length-prefixed";
import { pipe } from "it-pipe";
import { pushable, Pushable } from "it-pushable";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";
import type { Connection, Stream } from "@libp2p/interface-connection";
import type { CRDT } from "crdt-interfaces";

const PROTOCOL = "/libp2p-state-replication/0.0.1";

export class Libp2pStateReplicator {
	private readonly crdts = new Map<string, CRDT>();
	private readonly node: Libp2p;
	private readonly writers = new Map<string, Pushable<Uint8Array>>();

	private readonly rpc = new JSONRPCServerAndClient<string, string>(
		new JSONRPCServer(),
		new JSONRPCClient(async (request: object, peerId: string) => {
			if (peerId == null) {
				throw new Error("peer Id must be specified");
			}

			const writer = this.writers.get(peerId);

			if (!writer) {
				console.warn("not connected");
				return;
			}

			const asUint8Array = uint8ArrayFromString(JSON.stringify(request));

			writer.push(asUint8Array);
		})
	);
/*
	get data (): CRDTMap {
		return this.root;
	}
*/
	get CRDTNames (): string[] {
		return [...this.crdts.keys()];
	}

	setCRDT (name: string, crdt: CRDT): void {
		this.crdts.set(name, crdt);
	}
/*
	get createCRDT (): CRDTResolver {
		return (protocol: string) => {
			const crdtConstuctor = this.crdtConstrucotrs.get(protocol);

			if (crdtConstuctor == null) {
				throw new Error(`missing constructor for protocol: ${protocol}`);
			}

			return crdtConstuctor();
		};
	}
*/
	constructor({ libp2p }: { libp2p: Libp2p }) {
		this.node = libp2p;

		// Types will not replicate if you do not handle.
		//this.handle("/register/lww", () => new LWWRegister());
		//this.handle("/counter/pn", () => createPNCounter({ id: libp2p.peerId.toString() }));
		//this.handle("/set/g", () => createGSet({ id: libp2p.peerId.toString() }));
		/*this.handle("/set/2p", () => new TwoPSet());
		this.handle("/set/forgetful", () => new ForgetfulSet());
		this.handle("/map/crdt", (c: CRDTConfig) => new CRDTMap(c));
		this.handle("/map/forgetfullww", () => new ForgetfulLWWMap());
		this.handle("/map/lww", () => new LWWMap());
		this.handle("/map/table", (c: CRDTConfig) => new Table(c));*/

		//this.root = this.createCRDT("/map/crdt") as CRDTMap;
	}

	start () {
		this.node.handle(PROTOCOL, async ({ stream, connection }) => {
			this.handleStream(stream, connection);
		});

		this.rpc.addMethod("syncCRDT", async ({ name, data }: { name: string, data: string }) => {
			const crdt = this.crdts.get(name);

			if (crdt == null) {
				return;
			}

			const decodedData = uint8ArrayFromString(data, "ascii");


			const response = crdt.sync(decodedData);

			if (!response) {
				return;
			}

			return uint8ArrayToString(response, "ascii");
		});
	}

	async requestBlocks () {
		const connections = this.node.connectionManager.getConnections();

		for (const connection of connections) {
			// Only open a new stream if we don't already have on open.
			if (!this.writers.has(connection.remotePeer.toString())) {
				// This will throw if the node does not support this protocol
				const stream = await connection.newStream(PROTOCOL);

				this.handleStream(stream, connection);
			}

			for (const [name, crdt] of this.crdts) {
				let sync = crdt.sync();

				while (sync != null) {
					const raw: string | undefined = await this.rpc.request(
						"syncCRDT",
						{ name, data: uint8ArrayToString(sync, "ascii") },
						connection.remotePeer.toString()
					);

					// Remote does not have any data to provide.
					if (raw == null) {
						break;
					}

					const data = uint8ArrayFromString(raw, "ascii");

					sync = crdt.sync(data);
				}
			}
		}
	}

	getCRDT (name: string): CRDT | undefined {
		return this.crdts.get(name);
	}
/*
	handle (protocol: string, crdtConstuctor: (config?: CRDTConfig) => CRDT): void {
		this.crdtConstrucotrs.set(protocol, () => crdtConstuctor({
			resolver: this.createCRDT,
			id: this.node.peerId.toString(),
			protocol
		}));
	}
*/
	private handleStream (stream: Stream, connection: Connection) {
		const that = this;
		const peerId = connection.remotePeer.toString();

		// Handle inputs.
		pipe(stream, lp.decode(), async function (source) {
			for await (const message of source) {
				const data = JSON.parse(uint8ArrayToString(message.subarray()));
				await that.rpc.receiveAndSend(data, peerId, peerId);
			}
		}).catch(() => {
			// Do nothing
		});

		// Don't pipe events through the same connection
		if (this.writers.has(peerId)) {
			return;
		}

		const writer = pushable();

		this.writers.set(peerId, writer);

		// Handle outputs.
		(async () => {
			try {
				await pipe(writer, lp.encode(), stream);
			} finally {
				this.writers.delete(peerId);
			}
		})();
	}
}
