import { CRDT } from "./interfaces.js";

// NOTE: this only works if the key maps to the same type of CRDT.
export class CRDTMap implements CRDT {
	private data: { [key: string]: CRDT } = {};

	get value () {
		const output = {};

		for (const key of Object.keys(this.data)) {
			output[key] = this.data[key].value;
		}

		return output;
	}

	set (key: string, value: CRDT) {
		this.data[key] = value;
	}

	get (key: string) {
		return this.data[key];
	}

	sync (data?: { [key: string]: unknown }, obj?) {
		const response: { [key: string]: unknown } = {};

		if (data == null) {
			for (const key of Object.keys(this.data)) {
				response[key] = this.data[key].sync();
			}

			return response;
		}

		for (const key of Object.keys(data)) {
			if (!this.data[key]) {
				// We have no Idea what this data type is...
				if (!obj) {
					continue;
				}

				this.data[key] = new obj;
			}

			const subResponse = this.data[key].sync(data[key]);

			if (subResponse != null) {
				response[key] = subResponse;
			}
		}

		if (Object.keys(response).length !== 0) {
			return response;
		}
	}
}
