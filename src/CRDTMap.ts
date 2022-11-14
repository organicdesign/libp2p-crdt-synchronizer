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
		const response = {};

		if (data == null) {
			for (const key of Object.keys(this.data)) {
				response[key] = this.data[key].sync();
			}

			return response;
		}

		for (const key of Object.keys(data)) {
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
