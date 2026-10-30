import {
  fourMomentumFromCluster,
  fourMomentumFromTrack,
  invariantMass,
  atlasClassifyEvent,
  ATLAS_MASTERCLASS_CONFIG,
} from '../../helpers/invariant-mass';

describe('invariant-mass helper functions', () => {
  describe('fourMomentumFromCluster', () => {
    it('should return null if energy, eta, or phi is missing or null', () => {
      expect(fourMomentumFromCluster({})).toBeNull();
      expect(fourMomentumFromCluster({ energy: 1000 })).toBeNull();
      expect(fourMomentumFromCluster({ energy: 1000, eta: 0 })).toBeNull();
      expect(fourMomentumFromCluster({ energy: 1000, phi: 0 })).toBeNull();
      expect(
        fourMomentumFromCluster({ energy: null, eta: 0, phi: 0 }),
      ).toBeNull();
      expect(
        fourMomentumFromCluster({ energy: 1000, eta: null, phi: 0 }),
      ).toBeNull();
      expect(
        fourMomentumFromCluster({ energy: 1000, eta: 0, phi: null }),
      ).toBeNull();
    });

    it('should correctly calculate 4-momentum for eta = 0, phi = 0', () => {
      // theta = 2 * atan(exp(0)) = 2 * atan(1) = pi/2
      // sin(pi/2) = 1, cos(pi/2) = 0
      // px = energy * 1 * cos(0) = energy
      // py = energy * 1 * sin(0) = 0
      // pz = energy * cos(pi/2) = 0
      const userData = { energy: 1000, eta: 0, phi: 0 };
      const momentum = fourMomentumFromCluster(userData);

      expect(momentum).not.toBeNull();
      expect(momentum?.E).toBe(1000);
      expect(momentum?.px).toBeCloseTo(1000);
      expect(momentum?.py).toBeCloseTo(0);
      expect(momentum?.pz).toBeCloseTo(0);
    });

    it('should correctly calculate 4-momentum for non-zero eta and phi', () => {
      const energy = 5000;
      const eta = 1.0;
      const phi = Math.PI / 4; // 45 degrees

      const theta = 2 * Math.atan(Math.exp(-eta));
      const expectedPx = energy * Math.sin(theta) * Math.cos(phi);
      const expectedPy = energy * Math.sin(theta) * Math.sin(phi);
      const expectedPz = energy * Math.cos(theta);

      const momentum = fourMomentumFromCluster({ energy, eta, phi });

      expect(momentum).not.toBeNull();
      expect(momentum?.E).toBe(energy);
      expect(momentum?.px).toBeCloseTo(expectedPx);
      expect(momentum?.py).toBeCloseTo(expectedPy);
      expect(momentum?.pz).toBeCloseTo(expectedPz);
    });

    it('should handle negative eta values', () => {
      const energy = 2000;
      const eta = -1.5;
      const phi = -Math.PI / 2;

      const theta = 2 * Math.atan(Math.exp(-eta));
      const expectedPx = energy * Math.sin(theta) * Math.cos(phi);
      const expectedPy = energy * Math.sin(theta) * Math.sin(phi);
      const expectedPz = energy * Math.cos(theta);

      const momentum = fourMomentumFromCluster({ energy, eta, phi });

      expect(momentum).not.toBeNull();
      expect(momentum?.E).toBe(energy);
      expect(momentum?.px).toBeCloseTo(expectedPx);
      expect(momentum?.py).toBeCloseTo(expectedPy);
      expect(momentum?.pz).toBeCloseTo(expectedPz);
    });

    it('should handle zero energy cluster', () => {
      const momentum = fourMomentumFromCluster({
        energy: 0,
        eta: 0.5,
        phi: 1.0,
      });

      expect(momentum).not.toBeNull();
      expect(momentum?.E).toBe(0);
      expect(momentum?.px).toBeCloseTo(0);
      expect(momentum?.py).toBeCloseTo(0);
      expect(momentum?.pz).toBeCloseTo(0);
    });
  });

  describe('fourMomentumFromTrack', () => {
    it('should return null if pT or orientation (phi/theta) is missing', () => {
      expect(fourMomentumFromTrack({}, 0.511)).toBeNull();
      expect(fourMomentumFromTrack({ pT: 1000 }, 0.511)).toBeNull();
      expect(fourMomentumFromTrack({ pT: 1000, eta: 0 }, 0.511)).toBeNull();
    });

    it('should calculate 4-momentum using eta when theta is not provided', () => {
      const pT = 1000;
      const eta = 0; // theta = pi/2
      const phi = 0;
      const mass = 105.658; // muon mass

      const momentum = fourMomentumFromTrack({ pT, eta, phi }, mass);

      expect(momentum).not.toBeNull();
      expect(momentum?.px).toBeCloseTo(1000);
      expect(momentum?.py).toBeCloseTo(0);
      expect(momentum?.pz).toBeCloseTo(0);
      // E = sqrt(p2 + mass^2) = sqrt(1000^2 + 105.658^2)
      const expectedE = Math.sqrt(1000 * 1000 + mass * mass);
      expect(momentum?.E).toBeCloseTo(expectedE);
    });

    it('should calculate 4-momentum using dparams for phi and theta', () => {
      const pT = 2000;
      const dparams = [0, 0, Math.PI / 2, Math.PI / 4]; // d0, z0, phi, theta
      const mass = 0.511;

      const momentum = fourMomentumFromTrack({ pT, dparams }, mass);

      expect(momentum).not.toBeNull();
      // phi = pi/2 => cos(phi) = 0, sin(phi) = 1 => px = 0, py = 2000
      expect(momentum?.px).toBeCloseTo(0);
      expect(momentum?.py).toBeCloseTo(2000);
      // theta = pi/4 => pz = pT / tan(pi/4) = 2000
      expect(momentum?.pz).toBeCloseTo(2000);
    });
  });

  describe('invariantMass', () => {
    it('should return 0 for fewer than 2 4-momenta', () => {
      expect(invariantMass([])).toBe(0);
      expect(invariantMass([{ E: 1000, px: 500, py: 500, pz: 707 }])).toBe(0);
    });

    it('should correctly compute invariant mass for two back-to-back massless particles', () => {
      // E.g. two photons with E = 50 GeV going in opposite directions along x
      const p1 = { E: 50000, px: 50000, py: 0, pz: 0 };
      const p2 = { E: 50000, px: -50000, py: 0, pz: 0 };

      // sumE = 100000, sumPx = 0, sumPy = 0, sumPz = 0
      // M = sqrt(100000^2 - 0) = 100000 MeV = 100 GeV
      expect(invariantMass([p1, p2])).toBeCloseTo(100000);
    });

    it('should return 0 when m^2 <= 0', () => {
      // Physically unphysical or collinear zero mass
      const p1 = { E: 100, px: 100, py: 0, pz: 0 };
      const p2 = { E: 100, px: 100, py: 0, pz: 0 };

      // sumE = 200, sumPx = 200, sumPy = 0, sumPz = 0 -> m2 = 0
      expect(invariantMass([p1, p2])).toBe(0);
    });
  });

  describe('atlasClassifyEvent', () => {
    it('should classify standard ATLAS events correctly', () => {
      expect(atlasClassifyEvent({ electron: 2 })).toBe('e');
      expect(atlasClassifyEvent({ muon: 2 })).toBe('m');
      expect(atlasClassifyEvent({ photon: 2 })).toBe('g');
      expect(atlasClassifyEvent({ electron: 4 })).toBe('4e');
      expect(atlasClassifyEvent({ electron: 2, muon: 2 })).toBe('2e2m');
      expect(atlasClassifyEvent({ muon: 4 })).toBe('4m');
    });

    it('should combine non-standard counts into string', () => {
      expect(atlasClassifyEvent({ electron: 1, muon: 1 })).toBe('1e1m');
      expect(atlasClassifyEvent({ electron: 3, photon: 1 })).toBe('3e1g');
    });

    it('should return "?" when no relevant particles are tagged', () => {
      expect(atlasClassifyEvent({})).toBe('?');
      expect(atlasClassifyEvent({ kaon: 2 })).toBe('?');
    });
  });

  describe('ATLAS_MASTERCLASS_CONFIG', () => {
    it('should have valid ATLAS masterclass configuration', () => {
      expect(ATLAS_MASTERCLASS_CONFIG.title).toBeDefined();
      expect(ATLAS_MASTERCLASS_CONFIG.particleTags.length).toBeGreaterThan(0);
      expect(ATLAS_MASTERCLASS_CONFIG.classifyEvent).toBe(atlasClassifyEvent);
    });
  });
});
