import type { CRDT } from "./interfaces.js";

export class GSet<T=unknown> implements CRDT, Iterable<T> {
	public readonly protocol = "/set/g";
	private added = new Set<T>();

	constructor (data?: Iterable<T>) {
		if (data) {
			this.added = new Set<T>(data);
		}
	}

	add (item: T): void {
		this.added.add(item);
	}

	sync (data?: T[]): T[] | null {
		if (data != null) {
			for (const added of data) {
				this.add(added);
			}

			return null;
		}

		return [...this.added.values()];
	}

	value (): T[] {
		return [...this.added.values()];
	}

	[Symbol.iterator] () {
		return this.added[Symbol.iterator]();
	}
}
