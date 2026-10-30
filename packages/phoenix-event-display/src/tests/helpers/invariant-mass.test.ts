import {
  atlasClassifyEvent,
  fourMomentumFromTrack,
  fourMomentumFromCluster,
  invariantMass,
  ATLAS_MASTERCLASS_CONFIG,
  FourMomentum,
} from '../../helpers/invariant-mass';

describe('InvariantMass Helper', () => {
  describe('atlasClassifyEvent', () => {
    it('should classify exact two-body and four-body Z/Higgs masterclass event types', () => {
      expect(atlasClassifyEvent({ electron: 2, muon: 0, photon: 0 })).toBe('e');
      expect(atlasClassifyEvent({ electron: 0, muon: 2, photon: 0 })).toBe('m');
      expect(atlasClassifyEvent({ electron: 0, muon: 0, photon: 2 })).toBe('g');
      expect(atlasClassifyEvent({ electron: 4, muon: 0, photon: 0 })).toBe(
        '4e',
      );
      expect(atlasClassifyEvent({ electron: 2, muon: 2, photon: 0 })).toBe(
        '2e2m',
      );
      expect(atlasClassifyEvent({ electron: 0, muon: 4, photon: 0 })).toBe(
        '4m',
      );
    });

    it('should fall back to generic classification when exact pattern is not matched', () => {
      expect(atlasClassifyEvent({ electron: 1, muon: 0, photon: 0 })).toBe(
        '1e',
      );
      expect(atlasClassifyEvent({ electron: 1, muon: 2, photon: 3 })).toBe(
        '1e2m3g',
      );
      expect(atlasClassifyEvent({ electron: 3, muon: 0, photon: 0 })).toBe(
        '3e',
      );
      expect(atlasClassifyEvent({ electron: 0, muon: 1, photon: 0 })).toBe(
        '1m',
      );
      expect(atlasClassifyEvent({ electron: 0, muon: 0, photon: 1 })).toBe(
        '1g',
      );
    });

    it('should handle missing keys and default undefined counts to 0', () => {
      expect(atlasClassifyEvent({ electron: 2 })).toBe('e');
      expect(atlasClassifyEvent({ muon: 2 })).toBe('m');
      expect(atlasClassifyEvent({ photon: 2 })).toBe('g');
    });

    it('should return "?" when tag counts are empty or all zero', () => {
      expect(atlasClassifyEvent({})).toBe('?');
      expect(atlasClassifyEvent({ electron: 0, muon: 0, photon: 0 })).toBe('?');
    });
  });

  describe('fourMomentumFromTrack', () => {
    it('should calculate 4-momentum from pT, phi, and eta', () => {
      const userData = { pT: 100, phi: 0, eta: 0 };
      const mass = 0.511; // MeV (electron)
      const momentum = fourMomentumFromTrack(userData, mass);

      expect(momentum).not.toBeNull();
      expect(momentum?.px).toBeCloseTo(100);
      expect(momentum?.py).toBeCloseTo(0);
      expect(momentum?.pz).toBeCloseTo(0);
      expect(momentum?.E).toBeCloseTo(Math.sqrt(100 * 100 + mass * mass));
    });

    it('should compute phi and theta from dparams if direct properties are missing', () => {
      const userData = {
        pT: 100,
        dparams: [0, 0, Math.PI / 4, Math.PI / 3],
      };
      const mass = 105.658; // MeV (muon)
      const momentum = fourMomentumFromTrack(userData, mass);

      expect(momentum).not.toBeNull();
      const expectedPx = 100 * Math.cos(Math.PI / 4);
      const expectedPy = 100 * Math.sin(Math.PI / 4);
      const expectedPz = 100 / Math.tan(Math.PI / 3);
      expect(momentum?.px).toBeCloseTo(expectedPx);
      expect(momentum?.py).toBeCloseTo(expectedPy);
      expect(momentum?.pz).toBeCloseTo(expectedPz);
    });

    it('should return null if pT is missing', () => {
      const userData = { phi: 0, eta: 0 };
      expect(fourMomentumFromTrack(userData, 0)).toBeNull();
    });

    it('should return null if phi or theta cannot be determined', () => {
      expect(fourMomentumFromTrack({ pT: 100 }, 0)).toBeNull();
      expect(fourMomentumFromTrack({ pT: 100, phi: 0 }, 0)).toBeNull();
      expect(fourMomentumFromTrack({ pT: 100, eta: 0 }, 0)).toBeNull();
    });
  });

  describe('fourMomentumFromCluster', () => {
    it('should calculate 4-momentum from energy, eta, and phi', () => {
      const userData = { energy: 200, eta: 0, phi: 0 };
      const momentum = fourMomentumFromCluster(userData);

      expect(momentum).not.toBeNull();
      expect(momentum?.E).toBe(200);
      expect(momentum?.px).toBeCloseTo(200);
      expect(momentum?.py).toBeCloseTo(0);
      expect(momentum?.pz).toBeCloseTo(0);
    });

    it('should return null if any required property is missing', () => {
      expect(fourMomentumFromCluster({ eta: 0, phi: 0 })).toBeNull();
      expect(fourMomentumFromCluster({ energy: 200, phi: 0 })).toBeNull();
      expect(fourMomentumFromCluster({ energy: 200, eta: 0 })).toBeNull();
    });
  });

  describe('invariantMass', () => {
    it('should return 0 if fewer than 2 momenta are provided', () => {
      expect(invariantMass([])).toBe(0);

      const singleParticle: FourMomentum = { E: 100, px: 100, py: 0, pz: 0 };
      expect(invariantMass([singleParticle])).toBe(0);
    });

    it('should calculate invariant mass correctly for two opposite particles', () => {
      const p1: FourMomentum = { E: 100, px: 100, py: 0, pz: 0 };
      const p2: FourMomentum = { E: 100, px: -100, py: 0, pz: 0 };

      // Total E = 200, px = 0, py = 0, pz = 0
      // M^2 = 200^2 - 0 = 40000 -> M = 200
      expect(invariantMass([p1, p2])).toBeCloseTo(200);
    });

    it('should return 0 if calculated m^2 is non-positive', () => {
      const p1: FourMomentum = { E: 10, px: 20, py: 0, pz: 0 };
      const p2: FourMomentum = { E: 10, px: 20, py: 0, pz: 0 };

      // Total E = 20, Total px = 40 -> m2 = 400 - 1600 = -1200 <= 0
      expect(invariantMass([p1, p2])).toBe(0);
    });
  });

  describe('ATLAS_MASTERCLASS_CONFIG', () => {
    it('should have correct configuration settings and reference classifyEvent', () => {
      expect(ATLAS_MASTERCLASS_CONFIG.title).toBe(
        'Masterclass: Invariant Mass',
      );
      expect(ATLAS_MASTERCLASS_CONFIG.particleTags.length).toBe(3);
      expect(ATLAS_MASTERCLASS_CONFIG.hints).toBeDefined();
      expect(
        ATLAS_MASTERCLASS_CONFIG.classifyEvent({
          electron: 2,
          muon: 0,
          photon: 0,
        }),
      ).toBe('e');
    });
  });
});
