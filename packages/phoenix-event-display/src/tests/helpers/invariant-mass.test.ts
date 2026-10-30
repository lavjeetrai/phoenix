import {
  fourMomentumFromTrack,
  fourMomentumFromCluster,
  invariantMass,
  atlasClassifyEvent,
  ATLAS_MASTERCLASS_CONFIG,
} from '../../helpers/invariant-mass';

describe('invariant-mass helper', () => {
  describe('fourMomentumFromTrack', () => {
    it('should return null if pT is missing', () => {
      expect(fourMomentumFromTrack({}, 0.511)).toBeNull();
      expect(fourMomentumFromTrack({ phi: 0, eta: 0 }, 0.511)).toBeNull();
    });

    it('should return null if phi and dparams[2] are missing', () => {
      expect(fourMomentumFromTrack({ pT: 1000, eta: 0 }, 0.511)).toBeNull();
      expect(
        fourMomentumFromTrack({ pT: 1000, dparams: [0, 0, undefined, 1.0] }, 0.511),
      ).toBeNull();
    });

    it('should return null if theta and eta are missing', () => {
      expect(fourMomentumFromTrack({ pT: 1000, phi: 0 }, 0.511)).toBeNull();
      expect(
        fourMomentumFromTrack({ pT: 1000, dparams: [0, 0, 0, undefined] }, 0.511),
      ).toBeNull();
    });

    it('should calculate fourMomentum from pT, phi, and eta', () => {
      const pT = 1000;
      const phi = Math.PI / 4;
      const eta = 0.5;
      const mass = 0.511;

      const res = fourMomentumFromTrack({ pT, phi, eta }, mass);
      expect(res).not.toBeNull();

      if (res) {
        const expectedPx = pT * Math.cos(phi);
        const expectedPy = pT * Math.sin(phi);
        const theta = 2 * Math.atan(Math.exp(-eta));
        const expectedPz = pT / Math.tan(theta);
        const expectedP2 =
          expectedPx * expectedPx + expectedPy * expectedPy + expectedPz * expectedPz;
        const expectedE = Math.sqrt(expectedP2 + mass * mass);

        expect(res.px).toBeCloseTo(expectedPx);
        expect(res.py).toBeCloseTo(expectedPy);
        expect(res.pz).toBeCloseTo(expectedPz);
        expect(res.E).toBeCloseTo(expectedE);
      }
    });

    it('should calculate fourMomentum from pT and dparams', () => {
      const pT = 2000;
      const phi = 1.0;
      const theta = 1.2;
      const mass = 105.658;

      const res = fourMomentumFromTrack(
        { pT, dparams: [0, 0, phi, theta] },
        mass,
      );
      expect(res).not.toBeNull();

      if (res) {
        const expectedPx = pT * Math.cos(phi);
        const expectedPy = pT * Math.sin(phi);
        const expectedPz = pT / Math.tan(theta);
        const expectedP2 =
          expectedPx * expectedPx + expectedPy * expectedPy + expectedPz * expectedPz;
        const expectedE = Math.sqrt(expectedP2 + mass * mass);

        expect(res.px).toBeCloseTo(expectedPx);
        expect(res.py).toBeCloseTo(expectedPy);
        expect(res.pz).toBeCloseTo(expectedPz);
        expect(res.E).toBeCloseTo(expectedE);
      }
    });

    it('should prioritize explicit phi over dparams[2] and dparams[3] over eta', () => {
      const pT = 1000;
      const phi = 0.5;
      const dparamsPhi = 1.5;
      const eta = 1.0;
      const dparamsTheta = 0.8;
      const mass = 0;

      const res = fourMomentumFromTrack(
        {
          pT,
          phi,
          eta,
          dparams: [0, 0, dparamsPhi, dparamsTheta],
        },
        mass,
      );

      expect(res).not.toBeNull();

      if (res) {
        const expectedPx = pT * Math.cos(phi);
        const expectedPy = pT * Math.sin(phi);
        const expectedPz = pT / Math.tan(dparamsTheta);

        expect(res.px).toBeCloseTo(expectedPx);
        expect(res.py).toBeCloseTo(expectedPy);
        expect(res.pz).toBeCloseTo(expectedPz);
      }
    });
  });

  describe('fourMomentumFromCluster', () => {
    it('should return null if required parameters are missing', () => {
      expect(fourMomentumFromCluster({})).toBeNull();
      expect(fourMomentumFromCluster({ energy: 100, eta: 0 })).toBeNull();
      expect(fourMomentumFromCluster({ energy: 100, phi: 0 })).toBeNull();
      expect(fourMomentumFromCluster({ eta: 0, phi: 0 })).toBeNull();
    });

    it('should calculate fourMomentum from energy, eta, and phi', () => {
      const energy = 5000;
      const eta = 0.8;
      const phi = 1.2;

      const res = fourMomentumFromCluster({ energy, eta, phi });
      expect(res).not.toBeNull();

      if (res) {
        const theta = 2 * Math.atan(Math.exp(-eta));
        const expectedPx = energy * Math.sin(theta) * Math.cos(phi);
        const expectedPy = energy * Math.sin(theta) * Math.sin(phi);
        const expectedPz = energy * Math.cos(theta);

        expect(res.E).toBe(energy);
        expect(res.px).toBeCloseTo(expectedPx);
        expect(res.py).toBeCloseTo(expectedPy);
        expect(res.pz).toBeCloseTo(expectedPz);
      }
    });
  });

  describe('invariantMass', () => {
    it('should return 0 when fewer than 2 momenta are provided', () => {
      expect(invariantMass([])).toBe(0);
      expect(invariantMass([{ E: 10, px: 1, py: 1, pz: 1 }])).toBe(0);
    });

    it('should compute invariant mass for multiple particles', () => {
      const p1 = { E: 500, px: 100, py: 200, pz: 300 };
      const p2 = { E: 600, px: -100, py: -200, pz: 100 };

      const sumE = p1.E + p2.E;
      const sumPx = p1.px + p2.px;
      const sumPy = p1.py + p2.py;
      const sumPz = p1.pz + p2.pz;

      const m2 = sumE * sumE - sumPx * sumPx - sumPy * sumPy - sumPz * sumPz;
      const expectedMass = Math.sqrt(m2);

      expect(invariantMass([p1, p2])).toBeCloseTo(expectedMass);
    });

    it('should return 0 when m2 <= 0', () => {
      const p1 = { E: 10, px: 20, py: 20, pz: 20 };
      expect(invariantMass([p1, p1])).toBe(0);
    });
  });

  describe('atlasClassifyEvent', () => {
    it('should classify standard ATLAS Z-path events', () => {
      expect(atlasClassifyEvent({ electron: 2, muon: 0, photon: 0 })).toBe('e');
      expect(atlasClassifyEvent({ electron: 0, muon: 2, photon: 0 })).toBe('m');
      expect(atlasClassifyEvent({ electron: 0, muon: 0, photon: 2 })).toBe('g');
      expect(atlasClassifyEvent({ electron: 4, muon: 0, photon: 0 })).toBe('4e');
      expect(atlasClassifyEvent({ electron: 2, muon: 2, photon: 0 })).toBe('2e2m');
      expect(atlasClassifyEvent({ electron: 0, muon: 4, photon: 0 })).toBe('4m');
    });

    it('should format non-standard particle combinations', () => {
      expect(atlasClassifyEvent({ electron: 1, muon: 1, photon: 0 })).toBe('1e1m');
      expect(atlasClassifyEvent({ electron: 0, muon: 0, photon: 3 })).toBe('3g');
    });

    it('should return ? when no particles are tagged', () => {
      expect(atlasClassifyEvent({})).toBe('?');
      expect(atlasClassifyEvent({ electron: 0, muon: 0, photon: 0 })).toBe('?');
    });
  });

  describe('ATLAS_MASTERCLASS_CONFIG', () => {
    it('should have expected configuration structure', () => {
      expect(ATLAS_MASTERCLASS_CONFIG.title).toBeDefined();
      expect(ATLAS_MASTERCLASS_CONFIG.particleTags.length).toBeGreaterThan(0);
      expect(typeof ATLAS_MASTERCLASS_CONFIG.classifyEvent).toBe('function');
    });
  });
});
