export class ForgetfulSet {
    constructor(_, config) {
        this.data = [];
        this.timeout = 1000 * 60;
        if (config === null || config === void 0 ? void 0 : config.timeout) {
            this.timeout = config.timeout;
        }
    }
    add(value) {
        if (!this.data.find(i => i.value === value)) {
            const timestamp = Date.now();
            this.data.push({ timestamp, value });
        }
    }
    sync(data) {
        if (data != null) {
            const timestamp = Date.now();
            // Forget items...
            for (const [index, item] of this.data.entries()) {
                if (item.timestamp + this.timeout < timestamp) {
                    this.data.splice(index, 1);
                }
            }
            for (const item of data) {
                if (!this.data.find(i => i.value === item.value)) {
                    this.data.push(item);
                }
            }
            return null;
        }
        return [...this.data];
    }
    get value() {
        return [...this.data].sort();
    }
}
