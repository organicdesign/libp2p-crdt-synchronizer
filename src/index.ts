import type { Libp2p } from "libp2p";
// import { DistributedStateSynchronizer } from "distributed-state-synchronizer";
import * as lp from "it-length-prefixed";
import { pipe } from "it-pipe";

const PROTOCOL = "/libp2p-state-replication/0.0.1";

export class StateReplicator {
	private node: Libp2p;

	constructor(node: Libp2p) {
		node.handle(PROTOCOL, async ({ stream }) => {
			await pipe(stream, lp.decode(), async function (source) {
				for await (const message of source) {
					console.log("Got filter", message);
				}
			});
		});

		this.node = node;
	}

	async requestBlocks () {
		const connections = this.node.connectionManager.getConnections();

		for (const connection of connections) {
			// This will throw if the node does not support this proto
			const stream = await connection.newStream(PROTOCOL);

			console.log("need to request blocks");
		}
	}
}
