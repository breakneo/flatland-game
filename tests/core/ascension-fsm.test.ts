import { describe, it, expect } from 'vitest';
import { AscensionFSM, AscensionState } from '../../assets/main/scripts/core/fsm/AscensionFSM';

describe('Ascension FSM (升维状态机: 向上，而不是向北)', () => {
  it('should initialize in PLANE_2D with zero Z elevation', () => {
    const fsm = new AscensionFSM();
    expect(fsm.currentState).toBe(AscensionState.PLANE_2D);
    expect(fsm.currentZ).toBe(0);
  });

  it('should deny ascension when energy is insufficient', () => {
    const fsm = new AscensionFSM();
    const success = fsm.triggerAscend(3);
    expect(success).toBe(false);
    expect(fsm.currentState).toBe(AscensionState.PLANE_2D);
  });

  it('should ascend to 3D and levitate Z when fully charged', () => {
    const fsm = new AscensionFSM();
    fsm.chargeEnergy(100);
    const success = fsm.triggerAscend(3);
    expect(success).toBe(true);
    expect(fsm.currentState).toBe(AscensionState.ASCENDING_3D);

    fsm.update(0.5);
    expect(fsm.currentZ).toBeGreaterThan(0); // Levitation in progress

    // After duration completes
    fsm.update(3.0);
    expect(fsm.currentState).toBe(AscensionState.PLANE_2D);
    expect(fsm.currentZ).toBe(0);
  });
});
