import {
  FourMomentum,
  fourMomentumFromTrack,
  fourMomentumFromCluster,
  invariantMass,
  atlasClassifyEvent,
  ATLAS_MASTERCLASS_CONFIG,
} from '../../helpers/invariant-mass';

describe('invariant-mass helper', () => {
  describe('fourMomentumFromTrack', () => {
    it('should return null if pT is missing', () => {
      const userData = { eta: 0.5, phi: 1.0 };
      expect(fourMomentumFromTrack(userData, 100)).toBeNull();
    });

    it('should return null if phi and dparams[2] are missing', () => {
      const userData = { pT: 1000, eta: 0.5 };
      expect(fourMomentumFromTrack(userData, 100)).toBeNull();
    });

    it('should return null if theta and eta and dparams[3] are missing', () => {
      const userData = { pT: 1000, phi: 1.0 };
      expect(fourMomentumFromTrack(userData, 100)).toBeNull();
    });

    it('should compute four-momentum using eta and phi', () => {
      // eta = 0 => theta = pi/2, tan(theta) = infinity -> pz ~ 0
      // phi = 0 => px = pT, py = 0
      const userData = { pT: 1000, eta: 0, phi: 0 };
      const mass = 100;
      const res = fourMomentumFromTrack(userData, mass);

      expect(res).not.toBeNull();
      if (res) {
        expect(res.px).toBeCloseTo(1000);
        expect(res.py).toBeCloseTo(0);
        expect(res.pz).toBeCloseTo(0);
        expect(res.E).toBeCloseTo(Math.sqrt(1000 * 1000 + 100 * 100));
      }
    });

    it('should compute four-momentum using dparams for phi and theta', () => {
      // dparams: [d0, z0, phi, theta, qOverP]
      const theta = Math.PI / 4; // tan(theta) = 1 => pz = pT
      const userData = {
        pT: 1000,
        dparams: [0, 0, Math.PI / 2, theta],
      };
      const mass = 0;
      const res = fourMomentumFromTrack(userData, mass);

      expect(res).not.toBeNull();
      if (res) {
        expect(res.px).toBeCloseTo(0);
        expect(res.py).toBeCloseTo(1000);
        expect(res.pz).toBeCloseTo(1000);
        expect(res.E).toBeCloseTo(Math.sqrt(1000 * 1000 + 1000 * 1000));
      }
    });
  });

  describe('fourMomentumFromCluster', () => {
    it('should return null if energy is missing', () => {
      const userData = { eta: 0.5, phi: 1.0 };
      expect(fourMomentumFromCluster(userData)).toBeNull();
    });

    it('should return null if eta is missing', () => {
      const userData = { energy: 1000, phi: 1.0 };
      expect(fourMomentumFromCluster(userData)).toBeNull();
    });

    it('should return null if phi is missing', () => {
      const userData = { energy: 1000, eta: 0.5 };
      expect(fourMomentumFromCluster(userData)).toBeNull();
    });

    it('should compute four-momentum for cluster (massless)', () => {
      // eta = 0 => theta = pi/2 -> sin(theta) = 1, cos(theta) = 0
      // phi = 0 => px = E, py = 0, pz = 0
      const userData = { energy: 2000, eta: 0, phi: 0 };
      const res = fourMomentumFromCluster(userData);

      expect(res).not.toBeNull();
      if (res) {
        expect(res.E).toBe(2000);
        expect(res.px).toBeCloseTo(2000);
        expect(res.py).toBeCloseTo(0);
        expect(res.pz).toBeCloseTo(0);
      }
    });
  });

  describe('invariantMass', () => {
    it('should return 0 when momenta list has fewer than 2 items', () => {
      expect(invariantMass([])).toBe(0);

      const single: FourMomentum[] = [{ E: 100, px: 0, py: 0, pz: 100 }];
      expect(invariantMass(single)).toBe(0);
    });

    it('should calculate invariant mass of two back-to-back massless particles', () => {
      // Particle 1 moving along +z with E = 10 GeV (10,000 MeV)
      // Particle 2 moving along -z with E = 10 GeV (10,000 MeV)
      // Total E = 20,000 MeV, Total pz = 0
      // M^2 = E^2 - p^2 = 20,000^2 - 0 = 400,000,000
      // M = 20,000 MeV
      const p1: FourMomentum = { E: 10000, px: 0, py: 0, pz: 10000 };
      const p2: FourMomentum = { E: 10000, px: 0, py: 0, pz: -10000 };

      expect(invariantMass([p1, p2])).toBeCloseTo(20000);
    });

    it('should calculate invariant mass of decay products', () => {
      // e+ e- pair from Z decay at rest (M_Z = 91200 MeV)
      const p1: FourMomentum = { E: 45600, px: 30000, py: 0, pz: 34400 };
      const p2: FourMomentum = { E: 45600, px: -30000, py: 0, pz: -34400 };

      expect(invariantMass([p1, p2])).toBeCloseTo(91200);
    });

    it('should return 0 when m^2 <= 0 (unphysical/space-like)', () => {
      // Sum px = 100, Sum E = 10 => m2 = 100 - 10000 < 0
      const p1: FourMomentum = { E: 5, px: 50, py: 0, pz: 0 };
      const p2: FourMomentum = { E: 5, px: 50, py: 0, pz: 0 };

      expect(invariantMass([p1, p2])).toBe(0);
    });
  });

  describe('atlasClassifyEvent', () => {
    it('should classify specific standard combinations', () => {
      expect(atlasClassifyEvent({ electron: 2 })).toBe('e');
      expect(atlasClassifyEvent({ muon: 2 })).toBe('m');
      expect(atlasClassifyEvent({ photon: 2 })).toBe('g');
      expect(atlasClassifyEvent({ electron: 4 })).toBe('4e');
      expect(atlasClassifyEvent({ electron: 2, muon: 2 })).toBe('2e2m');
      expect(atlasClassifyEvent({ muon: 4 })).toBe('4m');
    });

    it('should classify non-standard particle combinations', () => {
      expect(atlasClassifyEvent({ electron: 1, muon: 1 })).toBe('1e1m');
      expect(atlasClassifyEvent({ electron: 3, photon: 2 })).toBe('3e2g');
    });

    it('should return "?" when tag counts are empty or all zero', () => {
      expect(atlasClassifyEvent({})).toBe('?');
      expect(atlasClassifyEvent({ electron: 0, muon: 0 })).toBe('?');
    });
  });

  describe('ATLAS_MASTERCLASS_CONFIG', () => {
    it('should have valid properties and classification callback', () => {
      expect(ATLAS_MASTERCLASS_CONFIG.title).toBe('Masterclass: Invariant Mass');
      expect(ATLAS_MASTERCLASS_CONFIG.particleTags.length).toBeGreaterThan(0);
      expect(ATLAS_MASTERCLASS_CONFIG.hints.length).toBeGreaterThan(0);
      expect(ATLAS_MASTERCLASS_CONFIG.classifyEvent({ electron: 2 })).toBe('e');
    });
  });
});
