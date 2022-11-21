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
            for (const item of data) {
                if (!this.data.find(i => i.value === item.value)) {
                    this.data.push(item);
                }
            }
            return null;
        }
        // Forget items...
        const timestamp = Date.now();
        this.data = this.data.filter(item => item.timestamp + this.timeout > timestamp);
        return [...this.data];
    }
    get value() {
        return [...this.data].sort();
    }
}
