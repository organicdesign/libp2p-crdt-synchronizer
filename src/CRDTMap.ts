import { CRDT } from "./interfaces.js";

// NOTE: this only works if the key maps to the same type of CRDT.
export class CRDTMap implements CRDT {
	public readonly protocol = "/map/crdt";
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

	sync (data?: { [key: string]: { sync: unknown, protocol: string } }) {
		const response: { [key: string]: { sync: unknown, protocol: string } } = {};

		if (data == null) {
			for (const key of Object.keys(this.data)) {
				response[key] = { sync: this.data[key].sync(), protocol: this.data[key].protocol };
			}

			return response;
		}

		for (const key of Object.keys(data)) {
			if (!this.data[key] || this.data[key].protocol < data[key].protocol) {
				// Need to overwrite the local datatype with the remote...
				console.warn("dynamic datatype not yet supported");
				continue;
			}

			if (this.data[key].protocol > data[key].protocol) {
				continue;
			}

			const subResponse = this.data[key].sync(data[key].sync);

			if (subResponse != null) {
				response[key] = { sync: subResponse, protocol: this.data[key].protocol };
			}
		}

		if (Object.keys(response).length !== 0) {
			return response;
		}
	}
}
