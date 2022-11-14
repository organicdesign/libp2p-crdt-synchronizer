export interface ORObject<T> {
	added: T[]
	removed: T[]
}

export class ORSet<T=unknown> {
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

	serialize (): ORObject<T> {
		return {
			added: [...this.added.values()],
			removed: [...this.removed.values()]
		};
	}

	merge (data: ORObject<T>): void {
		for (const removed of data.added) {
			this.remove(removed);
		}

		for (const removed of data.removed) {
			this.remove(removed);
		}
	}
}
