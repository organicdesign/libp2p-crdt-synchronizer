import { CRDT } from "./interfaces.js";

export class LWWMap implements CRDT {
	public readonly protocol = "/map/lww";
	private data: { [key: string]: unknown } = {};
	private timestamps: { [key: string]: string } = {};

	get value () {
		return { ...this.data };
	}

	set (key: string, data: unknown) {
		this.timestamps[key] = Date.now().toString(16);
		this.data[key] = data;
	}

	sync (data?) {
		if (data == null) {
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
