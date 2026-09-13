import {
  fourMomentumFromTrack,
  fourMomentumFromCluster,
  invariantMass,
  atlasClassifyEvent,
} from '../../helpers/invariant-mass';

describe('Invariant Mass Helpers', () => {
  describe('fourMomentumFromTrack', () => {
    it('should return null if pT is missing', () => {
      expect(fourMomentumFromTrack({}, 0.511)).toBeNull();
    });

    it('should return null if phi and theta cannot be determined', () => {
      expect(fourMomentumFromTrack({ pT: 10 }, 0.511)).toBeNull();
    });

    it('should calculate 4-momentum using phi and dparams for theta', () => {
      const userData = {
        pT: 1000,
        phi: Math.PI / 4,
        dparams: [0, 0, 0, Math.PI / 3],
      };
      const mass = 100;
      const momentum = fourMomentumFromTrack(userData, mass);

      expect(momentum).not.toBeNull();
      if (momentum) {
        expect(momentum.px).toBeCloseTo(1000 * Math.cos(Math.PI / 4));
        expect(momentum.py).toBeCloseTo(1000 * Math.sin(Math.PI / 4));
        expect(momentum.pz).toBeCloseTo(1000 / Math.tan(Math.PI / 3));

        const p2 = momentum.px ** 2 + momentum.py ** 2 + momentum.pz ** 2;
        expect(momentum.E).toBeCloseTo(Math.sqrt(p2 + mass ** 2));
      }
    });

    it('should fallback to dparams for phi', () => {
      const userData = {
        pT: 1000,
        dparams: [0, 0, Math.PI / 4, Math.PI / 3],
      };
      const mass = 100;
      const momentum = fourMomentumFromTrack(userData, mass);

      expect(momentum).not.toBeNull();
      if (momentum) {
        expect(momentum.px).toBeCloseTo(1000 * Math.cos(Math.PI / 4));
        expect(momentum.py).toBeCloseTo(1000 * Math.sin(Math.PI / 4));
      }
    });

    it('should compute theta from eta if dparams theta is missing', () => {
      const eta = 1.5;
      const expectedTheta = 2 * Math.atan(Math.exp(-eta));
      const userData = {
        pT: 1000,
        phi: Math.PI / 4,
        eta: eta,
      };
      const mass = 100;
      const momentum = fourMomentumFromTrack(userData, mass);

      expect(momentum).not.toBeNull();
      if (momentum) {
        expect(momentum.pz).toBeCloseTo(1000 / Math.tan(expectedTheta));
      }
    });
  });

  describe('fourMomentumFromCluster', () => {
    it('should return null if energy, eta, or phi is missing', () => {
      expect(fourMomentumFromCluster({})).toBeNull();
      expect(fourMomentumFromCluster({ energy: 10 })).toBeNull();
      expect(fourMomentumFromCluster({ energy: 10, eta: 1.5 })).toBeNull();
    });

    it('should calculate 4-momentum correctly', () => {
      const energy = 5000;
      const eta = 1.0;
      const phi = Math.PI / 2;
      const expectedTheta = 2 * Math.atan(Math.exp(-eta));

      const momentum = fourMomentumFromCluster({ energy, eta, phi });

      expect(momentum).not.toBeNull();
      if (momentum) {
        expect(momentum.E).toBe(energy);
        expect(momentum.px).toBeCloseTo(energy * Math.sin(expectedTheta) * Math.cos(phi));
        expect(momentum.py).toBeCloseTo(energy * Math.sin(expectedTheta) * Math.sin(phi));
        expect(momentum.pz).toBeCloseTo(energy * Math.cos(expectedTheta));
      }
    });
  });

  describe('invariantMass', () => {
    it('should return 0 for less than 2 momenta', () => {
      expect(invariantMass([])).toBe(0);
      expect(invariantMass([{ E: 100, px: 50, py: 50, pz: 50 }])).toBe(0);
    });

    it('should calculate invariant mass correctly for 2 or more momenta', () => {
      const p1 = { E: 100, px: 50, py: 50, pz: 50 }; // p2 = 7500
      const p2 = { E: 150, px: -50, py: 60, pz: -40 };

      const sumE = p1.E + p2.E; // 250
      const sumPx = p1.px + p2.px; // 0
      const sumPy = p1.py + p2.py; // 110
      const sumPz = p1.pz + p2.pz; // 10

      const expectedM2 = sumE * sumE - sumPx * sumPx - sumPy * sumPy - sumPz * sumPz; // 62500 - 0 - 12100 - 100 = 50300
      const expectedMass = Math.sqrt(expectedM2);

      expect(invariantMass([p1, p2])).toBeCloseTo(expectedMass);
    });

    it('should return 0 if calculated m2 is less than or equal to 0', () => {
       const p1 = { E: 10, px: 20, py: 0, pz: 0 };
       const p2 = { E: 10, px: 20, py: 0, pz: 0 };
       // sumE = 20, sumPx = 40. m2 = 400 - 1600 < 0
       expect(invariantMass([p1, p2])).toBe(0);
    });
  });

  describe('atlasClassifyEvent', () => {
    it('should classify typical specific events correctly', () => {
      expect(atlasClassifyEvent({ electron: 2, muon: 0, photon: 0 })).toBe('e');
      expect(atlasClassifyEvent({ electron: 0, muon: 2, photon: 0 })).toBe('m');
      expect(atlasClassifyEvent({ electron: 0, muon: 0, photon: 2 })).toBe('g');
      expect(atlasClassifyEvent({ electron: 4, muon: 0, photon: 0 })).toBe('4e');
      expect(atlasClassifyEvent({ electron: 2, muon: 2, photon: 0 })).toBe('2e2m');
      expect(atlasClassifyEvent({ electron: 0, muon: 4, photon: 0 })).toBe('4m');
    });

    it('should format fallback string correctly', () => {
      expect(atlasClassifyEvent({ electron: 1, muon: 0, photon: 0 })).toBe('1e');
      expect(atlasClassifyEvent({ electron: 0, muon: 1, photon: 0 })).toBe('1m');
      expect(atlasClassifyEvent({ electron: 0, muon: 0, photon: 1 })).toBe('1g');
      expect(atlasClassifyEvent({ electron: 1, muon: 1, photon: 1 })).toBe('1e1m1g');
      expect(atlasClassifyEvent({ electron: 3, muon: 1, photon: 0 })).toBe('3e1m');
    });

    it('should return ? if no identifiable tags', () => {
      expect(atlasClassifyEvent({})).toBe('?');
      expect(atlasClassifyEvent({ other: 5 })).toBe('?');
    });
  });
});
