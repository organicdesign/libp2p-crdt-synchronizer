import type { CRDT } from "./interfaces.js";

interface Operation {
	value: number
	id: number
}

export class Counter implements CRDT {
	private cachedValue = 0;
	private operations: Operation[] = [];
	private ids = new Set<number>();

	get value (): number {
		return this.cachedValue;
	}

	increment (value: number): void {
		const id = Math.random();
		this.operations.push({ value, id });
		this.ids.add(id);
		this.cachedValue += value;
	}

	decrement (value: number): void {
		this.increment(-value);
	}

	sync (operations?: Operation[]) {
		if (operations == null) {
			return [...this.operations];
		}

		for (const operation of operations) {
			if (!this.ids.has(operation.id)) {
				this.ids.add(operation.id);
				this.operations.push(operation);
				this.cachedValue += operation.value;
			}
		}
	}
}
