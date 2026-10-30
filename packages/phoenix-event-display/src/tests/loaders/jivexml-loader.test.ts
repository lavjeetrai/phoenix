/**
 * @jest-environment jsdom
 */
import { JiveXMLLoader } from '../../loaders/jivexml-loader';

describe('JiveXMLLoader', () => {
  let loader: JiveXMLLoader;

  beforeEach(() => {
    loader = new JiveXMLLoader();
  });

  describe('Track phi normalization', () => {
    it('should correctly normalize phi angles exceeding [-PI, PI] by multiple 2PI rotations', () => {
      const phi1 = 4 * Math.PI + 0.5; // > PI by two full rotations
      const phi2 = -4 * Math.PI - 0.5; // < -PI by two full rotations
      const phi3 = 0.5; // already within [-PI, PI]

      const xml = `<Event eventNumber="1" runNumber="1" lumiBlock="1" dateTime="2026-01-01">
        <Track count="3" storeGateKey="Tracks">
          <chi2>1.0 1.0 1.0</chi2>
          <numDoF>3 3 3</numDoF>
          <pt>10.0 10.0 10.0</pt>
          <d0>0.1 0.1 0.1</d0>
          <z0>1.0 1.0 1.0</z0>
          <phi0>${phi1} ${phi2} ${phi3}</phi0>
          <cotTheta>1.0 1.0 1.0</cotTheta>
        </Track>
      </Event>`;

      loader.process(xml);
      const eventData = loader.getEventData();
      const tracks = eventData.Tracks.Tracks_;

      expect(tracks).toHaveLength(3);

      // Verify track 1 (phi = 4*PI + 0.5 -> 0.5)
      expect(tracks[0].phi).toBeCloseTo(0.5, 5);
      expect(tracks[0].dparams[2]).toBeCloseTo(0.5, 5);
      expect(tracks[0].badtrack).toHaveLength(0);

      // Verify track 2 (phi = -4*PI - 0.5 -> -0.5)
      expect(tracks[1].phi).toBeCloseTo(-0.5, 5);
      expect(tracks[1].dparams[2]).toBeCloseTo(-0.5, 5);
      expect(tracks[1].badtrack).toHaveLength(0);

      // Verify track 3 (phi = 0.5)
      expect(tracks[2].phi).toBeCloseTo(0.5, 5);
      expect(tracks[2].dparams[2]).toBeCloseTo(0.5, 5);
      expect(tracks[2].badtrack).toHaveLength(0);
    });
  });
});
