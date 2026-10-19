export class JuiceController {
  private _trauma: number = 0;
  private _maxOffset: number = 16.0;
  private _traumaDecay: number = 1.0;
  private _freezeTimeRemaining: number = 0;
  private _time: number = 0;

  public addTrauma(amount: number): void {
    this._trauma = Math.min(1.0, Math.max(0, this._trauma + amount));
  }

  public triggerHitStop(durationMs: number = 80): void {
    this._freezeTimeRemaining = Math.max(this._freezeTimeRemaining, durationMs / 1000);
  }

  public get trauma(): number {
    return this._trauma;
  }

  public update(dt: number): { offsetX: number; offsetY: number; isFrozen: boolean } {
    let isFrozen = false;
    if (this._freezeTimeRemaining > 0) {
      this._freezeTimeRemaining -= dt;
      isFrozen = true;
    }

    const shake = this._trauma * this._trauma;
    let offsetX = 0;
    let offsetY = 0;

    if (shake > 1e-4) {
      this._time += dt;
      // High-frequency non-linear oscillating shake
      offsetX = Math.sin(this._time * 53) * this._maxOffset * shake;
      offsetY = Math.cos(this._time * 61) * this._maxOffset * shake;
      this._trauma = Math.max(0, this._trauma - this._traumaDecay * dt);
    } else {
      this._trauma = 0;
    }

    return { offsetX, offsetY, isFrozen };
  }
}
