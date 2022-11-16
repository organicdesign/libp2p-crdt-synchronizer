export class Counter {
    constructor() {
        this.cachedValue = 0;
        this.operations = [];
        this.ids = new Set();
    }
    get value() {
        return this.cachedValue;
    }
    increment(value) {
        const id = Math.random();
        this.operations.push({ value, id });
        this.ids.add(id);
        this.cachedValue += value;
    }
    decrement(value) {
        this.increment(-value);
    }
    sync(operations) {
        if (operations == null) {
            return [...this.operations];
        }
        for (const operation of operations) {
            if (!this.ids.has(operation.id)) {
                this.ids.add(operation.id);
                this.operations.push(operation);
                this.cachedValue += operation.value;
            }
        }
    }
}
