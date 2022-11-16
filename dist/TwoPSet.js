export class TwoPSet {
    constructor() {
        this.added = new Set();
        this.removed = new Set();
    }
    remove(item) {
        this.added.delete(item);
        this.removed.add(item);
    }
    add(item) {
        if (!this.removed.has(item)) {
            this.added.add(item);
        }
    }
    sync(data) {
        if (!data) {
            return {
                added: [...this.added.values()],
                removed: [...this.removed.values()]
            };
        }
        for (const added of data.added) {
            this.add(added);
        }
        for (const removed of data.removed) {
            this.remove(removed);
        }
    }
    get value() {
        return [...this.added.values()];
    }
}
