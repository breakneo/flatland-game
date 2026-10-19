// assets/main/scripts/core/pool/NodePoolManager.ts
// 生产级泛型对象池管理器，强约束对象复用与 GC 防御

export interface IRecyclable {
    onSpawn(...args: any[]): void;
    onRecycle(): void;
}

export class NodePoolManager {
    private static _instance: NodePoolManager;
    private _pools: Map<string, any[]> = new Map();

    public static get instance(): NodePoolManager {
        if (!this._instance) {
            this._instance = new NodePoolManager();
        }
        return this._instance;
    }

    public initPool(poolName: string, prewarmCount: number, factory: () => any): void {
        if (!this._pools.has(poolName)) {
            this._pools.set(poolName, []);
        }
        const pool = this._pools.get(poolName)!;
        for (let i = 0; i < prewarmCount; i++) {
            const item = factory();
            pool.push(item);
        }
    }

    public spawn<T = any>(poolName: string, factory: () => T, ...args: any[]): T {
        const pool = this._pools.get(poolName);
        let item: any;
        if (pool && pool.length > 0) {
            item = pool.pop();
        } else {
            item = factory();
        }

        if (item && typeof (item as IRecyclable).onSpawn === 'function') {
            (item as IRecyclable).onSpawn(...args);
        }
        return item as T;
    }

    public recycle(poolName: string, item: any): void {
        if (!item) return;

        if (typeof (item as IRecyclable).onRecycle === 'function') {
            (item as IRecyclable).onRecycle();
        }

        let pool = this._pools.get(poolName);
        if (!pool) {
            pool = [];
            this._pools.set(poolName, pool);
        }
        pool.push(item);
    }

    public clear(poolName?: string): void {
        if (poolName) {
            this._pools.delete(poolName);
        } else {
            this._pools.clear();
        }
    }
}
