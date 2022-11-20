import { CRDT } from "./interfaces.js";

export class LWWRegister implements CRDT {
	private data: unknown;
	private timestamp: string;

	get value () {
		return this.data;
	}

	set (data: unknown) {
		this.timestamp = Date.now().toString(16);
		this.data = data;
	}

	get (): unknown {
		return this.data;
	}

	sync (data?) {
		if (data == null) {
			return { data: this.data, timestamp: this.timestamp };
		}

		if (!this.timestamp || data.timestamp > this.timestamp) {
			this.timestamp = data.timestamp;
			this.data = data.data;
		}
	}
}
