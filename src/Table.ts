import type { CRDT, CRDTConfig, CRDTResolver } from "./interfaces.js";
import type { CRDTMap } from "./CRDTMap.js";
import type { LWWMap } from "./LWWMap.js";

export class Table implements CRDT {
	public readonly protocol = "/map/table";
	private readonly rows: CRDTMap;
	private readonly resolver: CRDTResolver;

	constructor ({ resolver }: CRDTConfig) {
		this.rows = resolver("/map/crdt") as CRDTMap;
		this.resolver = resolver;
	}

	get value () {
		return Object.keys(this.rows.value).map(id => ({
			id,
			...(this.rows.get(id).value as object)
		}));
	}

	create (id: string, data: { [key: string]: unknown }) {
		if (this.rows.get(id) != null) {
			throw new Error("row already exists");
		}

		const map = this.resolver("/map/lww") as LWWMap;

		for (const key of Object.keys(data)) {
			map.set(key, data[key]);
		}

		this.rows.set(id, map);
	}

	sync (data?) {
		return this.rows.sync(data);
	}
}
