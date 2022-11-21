import type { CRDT, CRDTConfig } from "./interfaces.js";

interface TimestampedItem<T=unknown> {
	timestamp: number
	value: T
}

export class ForgetfulSet<T=unknown> implements CRDT {
	private readonly added = new Set<TimestampedItem<T>>();
	private readonly timeout = 1000 * 60;

	constructor (_? :CRDTConfig, config?: { timeout?: number }) {
		if (config?.timeout) {
			this.timeout = config.timeout;
		}
	}

	add (item: T): void {
		const timestamp = Date.now();
		this.added.add({ timestamp, value: item });
	}

	sync (data?: TimestampedItem<T>[]): TimestampedItem<T>[] | null {
		if (data != null) {
			const timestamp = Date.now();

			// Forget items...
			for (const item of this.added) {
				if (item.timestamp + this.timeout < timestamp) {
					this.added.delete(item);
				}
			}

			for (const added of data) {
				this.added.add(added);
			}

			return null;
		}

		return [...this.added.values()];
	}

	get value (): TimestampedItem<T>[] {
		return [...this.added.values()].sort();
	}
}
