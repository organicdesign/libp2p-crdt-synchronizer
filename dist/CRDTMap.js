// NOTE: this only works if the key maps to the same type of CRDT.
export class CRDTMap {
    constructor({ resolver }) {
        this.data = {};
        this.resolver = resolver;
    }
    get value() {
        const output = {};
        for (const key of Object.keys(this.data)) {
            output[key] = this.data[key].crdt.value;
        }
        return output;
    }
    set(key, value, protocol) {
        this.data[key] = { crdt: value, protocol };
    }
    get(key) {
        var _a;
        return (_a = this.data[key]) === null || _a === void 0 ? void 0 : _a.crdt;
    }
    keys() {
        return Object.keys(this.data);
    }
    sync(data) {
        const response = {};
        if (data == null) {
            for (const key of Object.keys(this.data)) {
                response[key] = { sync: this.data[key].crdt.sync(), protocol: this.data[key].protocol };
            }
            return response;
        }
        for (const key of Object.keys(data)) {
            if (!this.data[key] || this.data[key].protocol < data[key].protocol) {
                // Need to overwrite the local datatype with the remote...
                const crdt = this.resolver(data[key].protocol);
                if (!crdt) {
                    console.warn(`Could not resolve CRDT ${data[key].protocol}`);
                    continue;
                }
                this.data[key] = { crdt, protocol: data[key].protocol };
            }
            if (this.data[key].protocol > data[key].protocol) {
                continue;
            }
            const subResponse = this.data[key].crdt.sync(data[key].sync);
            if (subResponse != null) {
                response[key] = { sync: subResponse, protocol: this.data[key].protocol };
            }
        }
        if (Object.keys(response).length !== 0) {
            return response;
        }
    }
}
