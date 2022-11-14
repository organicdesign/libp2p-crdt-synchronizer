export interface ORSetData<T> {
	added: T[]
	removed: T[]
}

export class ORSet<T=unknown> {
	private added = new Set<T>();
	private removed = new Set<T>();

	constructor (data?: Iterable<T>) {
		if (data) {
			this.added = new Set<T>(data);
		}
	}

	remove (item: T): void {
		this.added.delete(item);
		this.removed.add(item);
	}

	add (item: T): void {
		if (!this.removed.has(item)) {
			this.added.add(item);
		}
	}

	serialize (): ORSetData<T> {
		return {
			added: [...this.added.values()],
			removed: [...this.removed.values()]
		};
	}

	merge (data: ORSetData<T>): void {
		for (const added of data.added) {
			this.add(added);
		}

		for (const removed of data.removed) {
			this.remove(removed);
		}
	}

	values (): T[] {
		return [...this.added.values()];
	}
}
