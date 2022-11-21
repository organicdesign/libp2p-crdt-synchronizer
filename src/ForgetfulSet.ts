import type { CRDT, CRDTConfig } from "./interfaces.js";

interface TimestampedItem<T=unknown> {
	timestamp: number
	value: T
}

export class ForgetfulSet<T=unknown> implements CRDT {
	private readonly data: TimestampedItem<T>[] = [];
	private readonly timeout = 1000 * 60;

	constructor (_? :CRDTConfig, config?: { timeout?: number }) {
		if (config?.timeout) {
			this.timeout = config.timeout;
		}
	}

	add (value: T): void {
		if (!this.data.find(i => i.value === value)) {
			const timestamp = Date.now();

			this.data.push({ timestamp, value });
		}
	}

	sync (data?: TimestampedItem<T>[]): TimestampedItem<T>[] | null {
		if (data != null) {
			const timestamp = Date.now();

			// Forget items...
			for (const [index, item] of this.data.entries()) {
				if (item.timestamp + this.timeout < timestamp) {
					this.data.splice(index, 1);
				}
			}

			for (const item of data) {
				if (!this.data.find(i => i.value === item.value)) {
					this.data.push(item);
				}
			}

			return null;
		}

		return [...this.data];
	}

	get value (): TimestampedItem<T>[] {
		return [...this.data].sort();
	}
}
