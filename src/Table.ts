import type { CRDT } from "./interfaces.js";
import { CRDTMap } from "./CRDTMap.js";
import { LWWMap } from "./LWWMap.js";

export class Table implements CRDT {
	private rows = new CRDTMap();

	create (id: string, data: { [key: string]: unknown }) {
		if (this.rows.get(id) != null) {
			throw new Error("row already exists");
		}

		const map = new LWWMap();

		for (const key of Object.keys(data)) {
			map.set(key, data[key]);
		}

		this.rows.set(id, map);
	}

	sync (data?) {
		return this.rows.sync(data, LWWMap);
	}
}
