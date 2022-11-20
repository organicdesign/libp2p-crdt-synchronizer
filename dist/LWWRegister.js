export class LWWRegister {
    get value() {
        return this.data;
    }
    set(data) {
        this.timestamp = Date.now().toString(16);
        this.data = data;
    }
    get() {
        return this.data;
    }
    sync(data) {
        if (data == null) {
            return { data: this.data, timestamp: this.timestamp };
        }
        if (!this.timestamp || data.timestamp > this.timestamp) {
            this.timestamp = data.timestamp;
            this.data = data.data;
        }
    }
}
