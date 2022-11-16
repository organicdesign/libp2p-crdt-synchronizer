export class Table {
    constructor({ resolver }) {
        this.rows = resolver("/map/crdt");
        this.resolver = resolver;
    }
    get value() {
        return Object.keys(this.rows.value).sort().map(id => (Object.assign({ id }, this.rows.get(id).value)));
    }
    create(id, data) {
        if (this.rows.get(id) != null) {
            throw new Error("row already exists");
        }
        const map = this.resolver("/map/lww");
        for (const key of Object.keys(data)) {
            map.set(key, data[key]);
        }
        this.rows.set(id, map, "/map/lww");
    }
    sync(data) {
        return this.rows.sync(data);
    }
}
