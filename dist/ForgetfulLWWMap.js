export class ForgetfulLWWMap {
    constructor(_, config) {
        this.data = {};
        this.timestamps = {};
        this.timeout = 1000 * 60;
        if (config === null || config === void 0 ? void 0 : config.timeout) {
            this.timeout = config.timeout;
        }
    }
    get value() {
        return Object.assign({}, this.data);
    }
    set(key, data) {
        this.timestamps[key] = Date.now();
        this.data[key] = data;
    }
    get(key) {
        return this.data[key];
    }
    sync(data) {
        if (data == null) {
            // Forget items...
            const now = Date.now();
            for (const key of Object.keys(this.timestamps)) {
                const timestamp = this.timestamps[key];
                if (timestamp + this.timeout < now) {
                    delete this.timestamps[key];
                    delete this.data[key];
                }
            }
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
