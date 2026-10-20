import { describe, it, expect } from 'vitest';
import { project3DtoIso } from '../../assets/main/scripts/core/render/OmniscientProjection';

describe('Omniscient 3D View Natural Forward Projection', () => {
  it('should project spawn zone below exit so player moves upward on screen when pressing forward', () => {
    const spawnPt = project3DtoIso({ x: -4.8, y: 0, z: 0 });
    const exitPt = project3DtoIso({ x: 10, y: 0, z: 0 });

    // In screen coordinates, lower on screen means larger screenY, upper means smaller screenY
    expect(exitPt.screenY).toBeLessThan(spawnPt.screenY);
  });

  it('should elevate straight up into 3D when Z coordinate increases', () => {
    const ground = project3DtoIso({ x: 0, y: 0, z: 0 });
    const ascended = project3DtoIso({ x: 0, y: 0, z: 5 });

    expect(ascended.screenY).toBeLessThan(ground.screenY);
  });
});
