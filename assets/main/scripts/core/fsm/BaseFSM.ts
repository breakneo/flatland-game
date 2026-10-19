// assets/main/scripts/core/fsm/BaseFSM.ts
// 轻量级状态机基类，严禁状态交叉与时序竞争

export interface IState<TContext> {
    onEnter(context: TContext): void;
    onUpdate?(dt: number, context: TContext): void;
    onExit(context: TContext): void;
}

export class BaseFSM<TContext> {
    private _states: Map<string, IState<TContext>> = new Map();
    private _currentState: IState<TContext> | null = null;
    private _currentStateName: string = '';
    private _context: TContext;

    constructor(context: TContext) {
        this._context = context;
    }

    public register(name: string, state: IState<TContext>): this {
        this._states.set(name, state);
        return this;
    }

    public changeState(name: string): boolean {
        if (this._currentStateName === name) return false;

        const nextState = this._states.get(name);
        if (!nextState) {
            console.error(`[BaseFSM] 未知状态: ${name}`);
            return false;
        }

        if (this._currentState) {
            this._currentState.onExit(this._context);
        }

        this._currentStateName = name;
        this._currentState = nextState;
        this._currentState.onEnter(this._context);
        return true;
    }

    public update(dt: number): void {
        if (this._currentState && this._currentState.onUpdate) {
            this._currentState.onUpdate(dt, this._context);
        }
    }

    public get currentStateName(): string {
        return this._currentStateName;
    }
}
