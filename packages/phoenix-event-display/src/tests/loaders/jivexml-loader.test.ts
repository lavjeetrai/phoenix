/**
 * @jest-environment jsdom
 */
import { JiveXMLLoader } from '../../loaders/jivexml-loader';

describe('JiveXMLLoader', () => {
  let loader: JiveXMLLoader;

  beforeEach(() => {
    loader = new JiveXMLLoader();
  });

  it('should parse event data correctly', () => {
    const xmlData = `
      <Event eventNumber="123" runNumber="456" lumiBlock="789" dateTime="2023-01-01">
        <Track count="1" storeGateKey="Tracks">
          <numPolyline>2</numPolyline>
          <polylineX>1.0 2.0</polylineX>
          <polylineY>3.0 4.0</polylineY>
          <polylineZ>5.0 6.0</polylineZ>
          <chi2>1.5</chi2>
          <numDoF>10</numDoF>
          <pt>5.0</pt>
          <d0>0.1</d0>
          <z0>0.2</z0>
          <phi0>0.3</phi0>
          <cotTheta>1.0</cotTheta>
        </Track>
        <Electron count="1" storeGateKey="Electrons">
          <author>egamma</author>
          <energy>25.0</energy>
          <eta>1.1</eta>
          <phi>0.5</phi>
          <pt>20.0</pt>
          <pdgId>11</pdgId>
        </Electron>
      </Event>
    `;

    loader.process(xmlData);
    const eventData = loader.getEventData();

    expect(eventData.eventNumber).toBe('123');
    expect(eventData.runNumber).toBe('456');
    expect(eventData.Tracks['Tracks_']).toHaveLength(1);
    expect(eventData.Electrons['Electrons']).toHaveLength(1);
    expect(eventData.Electrons['Electrons'][0].author).toBe('egamma');
  });

  it('should treat HTML and script tags inside elements purely as text without executing or parsing HTML', () => {
    const xmlData = `
      <Event eventNumber="1" runNumber="1" lumiBlock="1" dateTime="2023-01-01">
        <Electron count="1" storeGateKey="Electrons">
          <author>&lt;script&gt;alert('xss')&lt;/script&gt;SafeAuthor</author>
          <energy>10.0</energy>
          <eta>0.0</eta>
          <phi>0.0</phi>
          <pt>10.0</pt>
          <pdgId>11</pdgId>
        </Electron>
      </Event>
    `;

    loader.process(xmlData);
    const eventData = loader.getEventData();

    expect(eventData.Electrons['Electrons'][0].author).toBe(
      "<script>alert('xss')</script>SafeAuthor",
    );
  });
});
