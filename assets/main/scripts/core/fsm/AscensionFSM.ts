import { BaseFSM, IState } from './BaseFSM';

export enum AscensionState {
  PLANE_2D = 'PLANE_2D',
  ASCENDING_3D = 'ASCENDING_3D',
  POINT_0D = 'POINT_0D',
}

class Plane2DState implements IState<AscensionFSM> {
  onEnter(fsm: AscensionFSM): void {
    fsm._setZ(0);
  }
  onExit(): void {}
}

class Ascending3DState implements IState<AscensionFSM> {
  onEnter(fsm: AscensionFSM): void {
    fsm._resetElapsed();
  }
  onUpdate(dt: number, fsm: AscensionFSM): void {
    fsm._addElapsed(dt);
    if (fsm.elapsed >= fsm.duration) {
      fsm._setZ(0);
      fsm.changeState(AscensionState.PLANE_2D);
      return;
    }
    // Smooth sine curve levitation peaking at Z = 5.0
    const progress = fsm.elapsed / fsm.duration;
    const z = Math.sin(progress * Math.PI) * 5.0;
    fsm._setZ(z);
  }
  onExit(fsm: AscensionFSM): void {
    fsm._setZ(0);
  }
}

class Point0DState implements IState<AscensionFSM> {
  onEnter(fsm: AscensionFSM): void {
    fsm._setZ(0);
  }
  onExit(): void {}
}

export class AscensionFSM extends BaseFSM<AscensionFSM> {
  private _energy: number = 0;
  private _currentZ: number = 0;
  private _duration: number = 3;
  private _elapsed: number = 0;

  constructor() {
    super(null as any);
    (this as any)._context = this;

    this.register(AscensionState.PLANE_2D, new Plane2DState());
    this.register(AscensionState.ASCENDING_3D, new Ascending3DState());
    this.register(AscensionState.POINT_0D, new Point0DState());

    this.changeState(AscensionState.PLANE_2D);
  }

  public get currentState(): AscensionState {
    return this.currentStateName as AscensionState;
  }

  public get currentZ(): number {
    return this._currentZ;
  }

  public get energy(): number {
    return this._energy;
  }

  public get duration(): number {
    return this._duration;
  }

  public get elapsed(): number {
    return this._elapsed;
  }

  public chargeEnergy(amount: number): void {
    this._energy = Math.min(100, Math.max(0, this._energy + amount));
  }

  public triggerAscend(durationSeconds: number = 3): boolean {
    if (this._energy < 100 || this.currentState !== AscensionState.PLANE_2D) {
      return false;
    }
    this._energy = 0;
    this._duration = durationSeconds;
    this._elapsed = 0;
    return this.changeState(AscensionState.ASCENDING_3D);
  }

  public triggerAscension(durationSeconds: number = 3): boolean {
    return this.triggerAscend(durationSeconds);
  }

  // Internal state mutators
  public _setZ(z: number): void {
    this._currentZ = z;
  }

  public _resetElapsed(): void {
    this._elapsed = 0;
  }

  public _addElapsed(dt: number): void {
    this._elapsed += dt;
  }
}
