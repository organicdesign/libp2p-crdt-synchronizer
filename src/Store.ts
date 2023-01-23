import type { PeerId } from "@libp2p/interface-peer-id";
import { BufferMap } from "@organicdesign/buffer-collections";

export class Store<T> {
	private readonly data = new BufferMap<T>();

	set (peerId: PeerId, data: T): void {
		this.data.set(peerId.toBytes(), data);
	}

	get (peerId: PeerId): T | undefined {
		return this.data.get(peerId.toBytes());
	}

	has (peerId: PeerId): boolean {
		return this.data.has(peerId.toBytes());
	}
}
