import type { CRDT, CRDTConfig } from "./interfaces.js";

export class GSet<T=unknown> implements CRDT, Iterable<T> {
	public readonly protocol: string;
	private added = new Set<T>();

	constructor ({ protocol }: CRDTConfig) {
		this.protocol = protocol;
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

	get value (): T[] {
		return [...this.added.values()].sort();
	}

	[Symbol.iterator] () {
		return this.added[Symbol.iterator]();
	}
}
