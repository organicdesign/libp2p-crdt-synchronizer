export class GSet<T=unknown> {
	private added = new Set<T>();

	constructor (data?: Iterable<T>) {
		if (data) {
			this.added = new Set<T>(data);
		}
	}

	add (item: T): void {
		this.added.add(item);
	}

	serialize (): T[] {
		return [...this.added.values()];
	}

	merge (data: Iterable<T>): void {
		for (const added of data) {
			this.add(added);
		}
	}

	values (): T[] {
		return [...this.added.values()];
	}
}
