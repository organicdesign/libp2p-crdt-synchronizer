import type { Libp2p } from "libp2p";
import { DistributedStateSynchronizer } from "distributed-state-synchronizer";
import * as lp from "it-length-prefixed";
import { pipe } from "it-pipe";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";

const PROTOCOL = "/libp2p-state-replication/0.0.1";

export class StateReplicator {
	private node: Libp2p;
	public dss = new DistributedStateSynchronizer();

	constructor(node: Libp2p) {
		node.handle(PROTOCOL, async ({ stream }) => {
			const that = this;

			await pipe(stream, lp.decode(), async function* (source) {
				for await (const message of source) {
					const filter = message.subarray();

					const { blocks } = await that.dss.sync({ blocks: [], filter });

					yield uint8ArrayFromString(JSON.stringify(blocks));
				}
			}, lp.encode(), stream);
		});

		this.node = node;
	}

	async requestBlocks () {
		const connections = this.node.connectionManager.getConnections();

		for (const connection of connections) {
			// This will throw if the node does not support this proto
			const stream = await connection.newStream(PROTOCOL);
			const { filter } = await this.dss.sync();
			const that = this;

			await pipe([filter], lp.encode(), stream, lp.decode(), async function (source) {
				for await (const message of source) {
					const str = uint8ArrayToString(message.subarray());
					const blocks = JSON.parse(str);

					await that.dss.sync({ blocks, filter: new Uint8Array() });
				}
			});
		}
	}
}
