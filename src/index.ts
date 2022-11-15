import { JSONRPCServerAndClient, JSONRPCClient, JSONRPCServer } from "json-rpc-2.0";
import type { Libp2p } from "libp2p";
import * as lp from "it-length-prefixed";
import { pipe } from "it-pipe";
import { pushable, Pushable } from "it-pushable";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";
import type { Connection, Stream } from "@libp2p/interface-connection";
import { GSet } from "./GSet.js";
import { Counter } from "./Counter.js";
import { TwoPSet } from "./TwoPSet.js";
import { CRDTMap } from "./CRDTMap.js";
import { LWWMap } from "./LWWMap.js";
import { Table } from "./Table.js";
import type { CRDT } from "./interfaces";

const PROTOCOL = "/libp2p-state-replication/0.0.1";

export class StateReplicator {
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

	get CRDTNames(): string[] {
		return [...this.crdts.keys()];
	}

	constructor({ libp2p }: { libp2p: Libp2p }) {
		this.node = libp2p;

		/*
		this.crdts.set("test", new GSet<string>([node.peerId.toString()]));
		this.crdts.set("static", new GSet<string>(["static string"]));
		const counter = new Counter();
		counter.increment(Math.random());
		this.crdts.set("counter", counter);
		this.crdts.set("2pSet", new TwoPSet(["static string"]));
		*/

		/*
		const crdtMap = new CRDTMap();
		crdtMap.set("a-set", new GSet([node.peerId.toString()]));
		this.crdts.set("CRDTMap", crdtMap);
		*/

		/*
		const lwwMap = new LWWMap();
		lwwMap.set("test", node.peerId.toString());
		this.crdts.set("LWWMap", lwwMap);
		*/

		const table = new Table();
		table.create("test", { column1: "value1", column2: 23 });
		table.create("test2", { column1: libp2p.peerId.toString(), column2: 1 });
		table.create(libp2p.peerId.toString(), { unrelated: false });
		this.crdts.set("table", table);

		libp2p.handle(PROTOCOL, async ({ stream, connection }) => {
			this.handleStream(stream, connection);
		});

		this.rpc.addMethod("syncCRDT", async ({ name, data, protocol }: { name: string, data: unknown, protocol: string }) => {
			const crdt = this.crdts.get(name);

			if (crdt?.protocol !== protocol) {
				return;
			}

			return crdt?.sync(data);
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

			for (const name of this.crdts.keys()) {
				const crdt = this.crdts.get(name);

				let sync = crdt?.sync();
				while (sync != null) {
					const data = await this.rpc.request(
						"syncCRDT",
						{ name, data: sync, protocol: crdt?.protocol },
						connection.remotePeer.toString()
					);

					// Remote does not have any data to provide.
					if (data == null) {
						break;
					}

					sync = crdt?.sync(data);
				}
			}
		}
	}

	getCRDT (name: string): CRDT | undefined {
		return this.crdts.get(name);
	}

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
