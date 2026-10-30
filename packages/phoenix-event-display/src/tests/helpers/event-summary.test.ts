import {
  summarizeEvent,
  buildEventSummaries,
  getAvailableColumns,
  EventSummary,
} from '../../helpers/event-summary';
import type {
  PhoenixEventData,
  PhoenixEventsData,
} from '../../lib/types/event-data';

describe('EventSummary Helper', () => {
  describe('summarizeEvent', () => {
    it('should correctly extract metadata using event number and run number', () => {
      const eventData = {
        'event number': 1001,
        'run number': 2001,
      } as PhoenixEventData;

      const summary = summarizeEvent('event_1', eventData);

      expect(summary.eventKey).toBe('event_1');
      expect(summary.eventNumber).toBe(1001);
      expect(summary.runNumber).toBe(2001);
    });

    it('should fallback to eventNumber and runNumber camelCase properties', () => {
      const eventData = {
        eventNumber: '1002',
        runNumber: '2002',
      } as PhoenixEventData;

      const summary = summarizeEvent('event_2', eventData);

      expect(summary.eventNumber).toBe('1002');
      expect(summary.runNumber).toBe('2002');
    });

    it('should return undefined metadata if event/run numbers are missing', () => {
      const eventData: PhoenixEventData = {};

      const summary = summarizeEvent('event_3', eventData);

      expect(summary.eventNumber).toBeUndefined();
      expect(summary.runNumber).toBeUndefined();
    });

    it('should count standard physics collections and calculate total objects', () => {
      const eventData = {
        Tracks: {
          InnerTracks: [{}, {}], // 2
          OuterTracks: [{}], // 1
        },
        Jets: {
          AntiKt4Jets: [{}, {}, {}, {}], // 4
        },
        Hits: {
          PixelHits: [], // 0
        },
      } as unknown as PhoenixEventData;

      const summary = summarizeEvent('event_counts', eventData);

      expect(summary.totalObjects).toBe(7);
      expect(summary.collectionCounts).toEqual({
        Tracks: 3,
        Jets: 4,
      });
      expect(summary.collectionCounts['Hits']).toBeUndefined();
    });

    it('should handle non-object or non-array collection data gracefully', () => {
      const eventData = {
        Tracks: 'not an object' as any,
        Jets: {
          InvalidColl: 'not an array' as any,
          ValidColl: [{}, {}],
        },
      } as unknown as PhoenixEventData;

      const summary = summarizeEvent('event_invalid', eventData);

      expect(summary.totalObjects).toBe(2);
      expect(summary.collectionCounts).toEqual({
        Jets: 2,
      });
    });

    it('should count PlanarCaloCells special structure', () => {
      const eventData = {
        PlanarCaloCells: {
          CaloPlane1: {
            plane: [1, 2, 3],
            cells: [{}, {}, {}], // 3
          },
          CaloPlane2: {
            cells: [{}], // 1
          },
          CaloPlaneInvalid: {
            cells: 'not an array' as any,
          },
          CaloPlaneEmpty: null as any,
        },
      } as unknown as PhoenixEventData;

      const summary = summarizeEvent('event_planar', eventData);

      expect(summary.totalObjects).toBe(4);
      expect(summary.collectionCounts).toEqual({
        PlanarCaloCells: 4,
      });
    });

    it('should compute MET when valid MissingEnergy is present', () => {
      const eventData = {
        MissingEnergy: {
          MET_RefFinal: [
            {
              etx: 3000,
              ety: 4000,
            },
          ],
        },
      } as unknown as PhoenixEventData;

      const summary = summarizeEvent('event_met', eventData);

      expect(summary.met).toBe(5000); // sqrt(3000^2 + 4000^2) = 5000
    });

    it('should return NaN for MET when MissingEnergy lacks etx/ety or is invalid', () => {
      const eventDataNoMET: PhoenixEventData = {};
      expect(Number.isNaN(summarizeEvent('e1', eventDataNoMET).met)).toBe(true);

      const eventDataEmptyMET = {
        MissingEnergy: {
          MET_Coll: [],
        },
      } as unknown as PhoenixEventData;
      expect(Number.isNaN(summarizeEvent('e2', eventDataEmptyMET).met)).toBe(
        true,
      );

      const eventDataMissingParams = {
        MissingEnergy: {
          MET_Coll: [{}],
        },
      } as unknown as PhoenixEventData;
      expect(
        Number.isNaN(summarizeEvent('e3', eventDataMissingParams).met),
      ).toBe(true);
    });
  });

  describe('buildEventSummaries', () => {
    it('should build summaries for all valid events in eventsData', () => {
      const eventsData = {
        Event1: {
          'event number': 1,
          Tracks: { Coll1: [{}] },
        },
        Event2: {
          'event number': 2,
          Jets: { Coll1: [{}, {}] },
        },
        InvalidEvent: null,
      } as unknown as PhoenixEventsData;

      const summaries = buildEventSummaries(eventsData);

      expect(summaries).toHaveLength(2);
      expect(summaries[0].eventKey).toBe('Event1');
      expect(summaries[0].eventNumber).toBe(1);
      expect(summaries[0].totalObjects).toBe(1);
      expect(summaries[1].eventKey).toBe('Event2');
      expect(summaries[1].eventNumber).toBe(2);
      expect(summaries[1].totalObjects).toBe(2);
    });

    it('should return an empty array if eventsData is empty', () => {
      expect(buildEventSummaries({})).toEqual([]);
    });
  });

  describe('getAvailableColumns', () => {
    it('should extract unique collection types and sort reco types first, then detector types', () => {
      const summaries: EventSummary[] = [
        {
          eventKey: 'e1',
          eventNumber: 1,
          runNumber: 1,
          totalObjects: 10,
          collectionCounts: {
            Tracks: 5,
            Hits: 2, // Detector level
            Jets: 3,
          },
          met: 100,
        },
        {
          eventKey: 'e2',
          eventNumber: 2,
          runNumber: 1,
          totalObjects: 15,
          collectionCounts: {
            Muons: 4,
            CaloCells: 10, // Detector level
            Jets: 1,
          },
          met: 200,
        },
      ];

      const columns = getAvailableColumns(summaries);

      // Reco types sorted alphabetically: Jets, Muons, Tracks
      // Detector types sorted alphabetically: CaloCells, Hits
      expect(columns).toEqual(['Jets', 'Muons', 'Tracks', 'CaloCells', 'Hits']);
    });

    it('should return empty array if summaries are empty or have no collection counts', () => {
      expect(getAvailableColumns([])).toEqual([]);

      const emptySummaries: EventSummary[] = [
        {
          eventKey: 'e1',
          eventNumber: 1,
          runNumber: 1,
          totalObjects: 0,
          collectionCounts: {},
          met: NaN,
        },
      ];
      expect(getAvailableColumns(emptySummaries)).toEqual([]);
    });
  });
});
