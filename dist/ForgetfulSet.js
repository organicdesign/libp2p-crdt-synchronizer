export class ForgetfulSet {
    constructor(_, config) {
        this.added = new Set();
        this.timeout = 1000 * 60;
        if (config === null || config === void 0 ? void 0 : config.timeout) {
            this.timeout = config.timeout;
        }
    }
    add(item) {
        const timestamp = Date.now();
        this.added.add({ timestamp, value: item });
    }
    sync(data) {
        if (data != null) {
            const timestamp = Date.now();
            // Forget items...
            for (const item of this.added) {
                if (item.timestamp + this.timeout < timestamp) {
                    this.added.delete(item);
                }
            }
            for (const added of data) {
                this.added.add(added);
            }
            return null;
        }
        return [...this.added.values()];
    }
    get value() {
        return [...this.added.values()].sort();
    }
}
