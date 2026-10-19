// assets/main/scripts/core/event/EventBus.ts
// 全局强类型事件中心，支持安全注销与作用域绑定

type EventCallback = (...args: any[]) => void;

interface EventListenerItem {
    callback: EventCallback;
    target?: any;
    once?: boolean;
}

export class EventBus {
    private static _instance: EventBus;
    private _listeners: Map<string, EventListenerItem[]> = new Map();

    public static get instance(): EventBus {
        if (!this._instance) {
            this._instance = new EventBus();
        }
        return this._instance;
    }

    public on(eventName: string, callback: EventCallback, target?: any, once: boolean = false): void {
        let list = this._listeners.get(eventName);
        if (!list) {
            list = [];
            this._listeners.set(eventName, list);
        }
        list.push({ callback, target, once });
    }

    public once(eventName: string, callback: EventCallback, target?: any): void {
        this.on(eventName, callback, target, true);
    }

    public off(eventName: string, callback: EventCallback, target?: any): void {
        const list = this._listeners.get(eventName);
        if (!list) return;

        this._listeners.set(
            eventName,
            list.filter(item => {
                const matchCb = item.callback === callback;
                const matchTarget = target ? item.target === target : true;
                return !(matchCb && matchTarget);
            })
        );
    }

    public offTarget(target: any): void {
        if (!target) return;
        this._listeners.forEach((list, key) => {
            this._listeners.set(
                key,
                list.filter(item => item.target !== target)
            );
        });
    }

    public emit(eventName: string, ...args: any[]): void {
        const list = this._listeners.get(eventName);
        if (!list || list.length === 0) return;

        const copy = [...list];
        for (const item of copy) {
            if (item.target) {
                item.callback.apply(item.target, args);
            } else {
                item.callback(...args);
            }
            if (item.once) {
                this.off(eventName, item.callback, item.target);
            }
        }
    }

    public clear(): void {
        this._listeners.clear();
    }
}
