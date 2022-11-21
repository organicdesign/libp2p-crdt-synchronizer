import { CRDT, CRDTConfig } from "./interfaces.js";

export class ForgetfulLWWMap implements CRDT {
	private data: { [key: string]: unknown } = {};
	private timestamps: { [key: string]: number } = {};
	private readonly timeout = 1000 * 60;

	constructor (_? :CRDTConfig, config?: { timeout?: number }) {
		if (config?.timeout) {
			this.timeout = config.timeout;
		}
	}

	get value () {
		return { ...this.data };
	}

	set (key: string, data: unknown) {
		this.timestamps[key] = Date.now();
		this.data[key] = data;
	}

	get (key: string): unknown {
		return this.data[key];
	}

	sync (data?) {
		if (data == null) {
			// Forget items...
			const now = Date.now();

			for (const key of Object.keys(this.timestamps)) {
				const timestamp = this.timestamps[key];

				if (timestamp + this.timeout < now) {
					delete this.timestamps[key];
					delete this.data[key];
				}
			}

			return { data: this.data, timestamps: this.timestamps };
		}

		for (const key of Object.keys(data.timestamps)) {
			if (!this.timestamps[key] || data.timestamps[key] > this.timestamps[key]) {
				this.timestamps[key] = data.timestamps[key];
				this.data[key] = data.data[key];
			}
		}
	}
}
