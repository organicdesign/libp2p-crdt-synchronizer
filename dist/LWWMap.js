export class LWWMap {
    constructor() {
        this.data = {};
        this.timestamps = {};
    }
    get value() {
        return Object.assign({}, this.data);
    }
    set(key, data) {
        this.timestamps[key] = Date.now().toString(16);
        this.data[key] = data;
    }
    get(key) {
        return this.data[key];
    }
    sync(data) {
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
