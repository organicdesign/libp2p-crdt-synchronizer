export class GSet {
    constructor() {
        this.added = new Set();
    }
    add(item) {
        this.added.add(item);
    }
    sync(data) {
        if (data != null) {
            for (const added of data) {
                this.add(added);
            }
            return null;
        }
        return [...this.added.values()];
    }
    get value() {
        return [...this.added.values()].sort();
    }
    [Symbol.iterator]() {
        return this.added[Symbol.iterator]();
    }
}
