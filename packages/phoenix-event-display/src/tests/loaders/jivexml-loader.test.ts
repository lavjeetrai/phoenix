/**
 * @jest-environment jsdom
 */
import { JiveXMLLoader } from '../../loaders/jivexml-loader';

describe('JiveXMLLoader phi normalization', () => {
  let loader: JiveXMLLoader;

  beforeEach(() => {
    loader = new JiveXMLLoader();
  });

  const createJiveXMLWithPhi = (phiValues: number[]) => {
    const count = phiValues.length;
    const ptStr = Array(count).fill('10.0').join(' ');
    const d0Str = Array(count).fill('0.0').join(' ');
    const z0Str = Array(count).fill('0.0').join(' ');
    const cotThetaStr = Array(count).fill('1.0').join(' '); // theta = atan(1/1) = pi/4
    const phi0Str = phiValues.join(' ');

    return `
      <Event eventNumber="1" runNumber="1">
        <Track storeGateKey="Tracks" count="${count}">
          <pt>${ptStr}</pt>
          <d0>${d0Str}</d0>
          <z0>${z0Str}</z0>
          <cotTheta>${cotThetaStr}</cotTheta>
          <phi0>${phi0Str}</phi0>
        </Track>
      </Event>
    `;
  };

  it('should normalize out-of-bounds phi values into [-PI, PI]', () => {
    const testPhis = [
      0.5,
      4 * Math.PI + 0.5,
      -4 * Math.PI - 0.5,
      2 * Math.PI + 1.2,
      -2 * Math.PI - 1.2,
    ];

    const xmlData = createJiveXMLWithPhi(testPhis);
    loader.process(xmlData);
    const eventData = loader.getEventData();

    const tracks = eventData.Tracks['Tracks_'];
    expect(tracks).toBeDefined();
    expect(tracks.length).toBe(5);

    expect(tracks[0].phi).toBeCloseTo(0.5);
    expect(tracks[1].phi).toBeCloseTo(0.5);
    expect(tracks[2].phi).toBeCloseTo(-0.5);
    expect(tracks[3].phi).toBeCloseTo(1.2);
    expect(tracks[4].phi).toBeCloseTo(-1.2);

    tracks.forEach((track: any) => {
      expect(track.phi).toBeGreaterThanOrEqual(-Math.PI);
      expect(track.phi).toBeLessThanOrEqual(Math.PI);
    });
  });
});
