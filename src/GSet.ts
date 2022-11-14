import type { CRDT, CRDTSync } from "./interfaces.js";

export class GSet<T=unknown> implements CRDT {
	private added = new Set<T>();

	constructor (data?: Iterable<T>) {
		if (data) {
			this.added = new Set<T>(data);
		}
	}

	add (item: T): void {
		this.added.add(item);
	}

	sync (message?: CRDTSync<T[]>): CRDTSync<T[]> {
		if (message?.data != null) {
			for (const added of message.data) {
				this.add(added);
			}

			return { done: true };
		}

		return {
			done: false,
			data: [...this.added.values()]
		};
	}

	toValue (): T[] {
		return [...this.added.values()];
	}
}
