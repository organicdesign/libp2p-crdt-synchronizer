import { CRDT } from "./interfaces.js";

export class CRDTMap implements CRDT {
	private data: { [key: string]: CRDT } = {};

	set (key: string, value: CRDT) {
		this.data[key] = value;
	}

	get (key: string) {
		return this.data[key];
	}

	sync (data?) {
		if (data == null) {
			const data = {};

			for (const key of Object.keys(this.data)) {
				data[key] = this.data[key].sync();
			}

			return data;
		}

		for (const key of Object.keys(data)) {
			this.data[key].sync(data[key]);
		}
	}
}
