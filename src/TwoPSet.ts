import type { CRDT } from "./interfaces.js";

export interface Serialized2PSet<T> {
	added: T[]
	removed: T[]
}

export class TwoPSet<T=unknown> implements CRDT {
	private added = new Set<T>();
	private removed = new Set<T>();

	remove (item: T): void {
		this.added.delete(item);
		this.removed.add(item);
	}

	add (item: T): void {
		if (!this.removed.has(item)) {
			this.added.add(item);
		}
	}

	sync (data?: Serialized2PSet<T>) {
		if (!data) {
			return {
				added: [...this.added.values()],
				removed: [...this.removed.values()]
			};
		}

		for (const added of data.added) {
			this.add(added);
		}

		for (const removed of data.removed) {
			this.remove(removed);
		}
	}

	get value (): T[] {
		return [...this.added.values()];
	}
}
