import {
  buildEventSummaries,
  summarizeEvent,
  getAvailableColumns,
  EventSummary,
} from '../../helpers/event-summary';
import type {
  PhoenixEventsData,
  PhoenixEventData,
} from '../../lib/types/event-data';

describe('event-summary', () => {
  describe('buildEventSummaries', () => {
    it('should return empty array when eventsData is empty', () => {
      const eventsData: PhoenixEventsData = {};
      const result = buildEventSummaries(eventsData);
      expect(result).toEqual([]);
    });

    it('should summarize multiple events correctly', () => {
      const eventsData: PhoenixEventsData = {
        Event1: {
          'event number': 1001,
          'run number': 2001,
          Tracks: {
            TrackColl1: [{}, {}],
          },
        },
        Event2: {
          eventNumber: 1002,
          runNumber: 2002,
          Jets: {
            JetColl1: [{ eta: 0.1, phi: 0.2 }],
          },
        },
      };

      const result = buildEventSummaries(eventsData);
      expect(result).toHaveLength(2);

      expect(result[0]).toEqual({
        eventKey: 'Event1',
        eventNumber: 1001,
        runNumber: 2001,
        totalObjects: 2,
        collectionCounts: { Tracks: 2 },
        met: NaN,
      });

      expect(result[1]).toEqual({
        eventKey: 'Event2',
        eventNumber: 1002,
        runNumber: 2002,
        totalObjects: 1,
        collectionCounts: { Jets: 1 },
        met: NaN,
      });
    });

    it('should filter out invalid or non-object event entries', () => {
      const eventsData: PhoenixEventsData = {
        Event1: {
          'event number': 1,
        },
        EventInvalidNull: null as unknown as PhoenixEventData,
        EventInvalidNumber: 123 as unknown as PhoenixEventData,
        EventInvalidString: 'invalid' as unknown as PhoenixEventData,
      };

      const result = buildEventSummaries(eventsData);
      expect(result).toHaveLength(1);
      expect(result[0].eventKey).toBe('Event1');
    });
  });

  describe('summarizeEvent', () => {
    it('should fall back to undefined eventNumber and runNumber if missing', () => {
      const eventData: PhoenixEventData = {};
      const summary = summarizeEvent('EventNoMeta', eventData);

      expect(summary.eventKey).toBe('EventNoMeta');
      expect(summary.eventNumber).toBeUndefined();
      expect(summary.runNumber).toBeUndefined();
      expect(summary.totalObjects).toBe(0);
      expect(summary.collectionCounts).toEqual({});
      expect(summary.met).toBeNaN();
    });

    it('should count standard collections correctly', () => {
      const eventData: PhoenixEventData = {
        Tracks: {
          InnerTracks: [{}, {}],
          OuterTracks: [{}],
        },
        Jets: {
          MainJets: [
            { eta: 0.1, phi: 0.2 },
            { eta: 0.3, phi: 0.4 },
            { eta: 0.5, phi: 0.6 },
            { eta: 0.7, phi: 0.8 },
          ],
        },
        Muons: {
          MuonColl: [],
        },
      };

      const summary = summarizeEvent('Event1', eventData);
      expect(summary.totalObjects).toBe(7);
      expect(summary.collectionCounts).toEqual({
        Tracks: 3,
        Jets: 4,
      });
      // Muons count is 0, so it should not be in collectionCounts
      expect(summary.collectionCounts.Muons).toBeUndefined();
    });

    it('should handle PlanarCaloCells collection structure', () => {
      const eventData: PhoenixEventData = {
        PlanarCaloCells: {
          Calo1: {
            plane: [1, 2],
            cells: [{ energy: 10 }, { energy: 20 }, { energy: 30 }],
          },
          Calo2: {
            plane: [0, 1],
            cells: [{ energy: 40 }],
          },
          CaloInvalid: {
            cells: 'not an array',
          } as any,
        },
      };

      const summary = summarizeEvent('EventPlanar', eventData);
      expect(summary.collectionCounts).toEqual({
        PlanarCaloCells: 4,
      });
      expect(summary.totalObjects).toBe(4);
    });

    it('should ignore non-object collection types or non-array subcollections', () => {
      const eventData: PhoenixEventData = {
        Tracks: 'not-an-object' as any,
        Jets: {
          Coll1: 'not-an-array' as any,
          Coll2: [{ eta: 0, phi: 0 }],
        },
      };

      const summary = summarizeEvent('EventIgnore', eventData);
      expect(summary.collectionCounts).toEqual({
        Jets: 1,
      });
      expect(summary.totalObjects).toBe(1);
    });

    it('should calculate MET correctly when MissingEnergy collection is present', () => {
      const eventData: PhoenixEventData = {
        MissingEnergy: {
          MET_RefFinal: [
            {
              etx: 30000,
              ety: 40000,
            },
          ],
        },
      };

      const summary = summarizeEvent('EventMET', eventData);
      // Math.sqrt(30000^2 + 40000^2) = 50000
      expect(summary.met).toBe(50000);
      expect(summary.collectionCounts.MissingEnergy).toBe(1);
    });

    it('should return NaN for MET if MissingEnergy collection is invalid or missing etx/ety', () => {
      const eventData1: PhoenixEventData = {
        MissingEnergy: 'invalid' as any,
      };

      const eventData2: PhoenixEventData = {
        MissingEnergy: {
          MET_Coll: [],
        },
      };

      const eventData3: PhoenixEventData = {
        MissingEnergy: {
          MET_Coll: [{} as any],
        },
      };

      expect(summarizeEvent('E1', eventData1).met).toBeNaN();
      expect(summarizeEvent('E2', eventData2).met).toBeNaN();
      expect(summarizeEvent('E3', eventData3).met).toBeNaN();
    });
  });

  describe('getAvailableColumns', () => {
    it('should return empty array for empty summaries', () => {
      expect(getAvailableColumns([])).toEqual([]);
    });

    it('should return unique collection names sorted with reco first, then detector-level', () => {
      const summaries: EventSummary[] = [
        {
          eventKey: 'E1',
          eventNumber: 1,
          runNumber: 1,
          totalObjects: 10,
          collectionCounts: {
            Tracks: 5,
            Hits: 3, // Detector level
            Photons: 2,
          },
          met: 100,
        },
        {
          eventKey: 'E2',
          eventNumber: 2,
          runNumber: 1,
          totalObjects: 8,
          collectionCounts: {
            Jets: 4,
            CaloCells: 2, // Detector level
            PlanarCaloCells: 2, // Detector level
            Photons: 1, // Duplicate across summaries
          },
          met: NaN,
        },
      ];

      const columns = getAvailableColumns(summaries);

      // Unique reco types: Jets, Photons, Tracks (sorted alphabetically)
      // Unique detector types: CaloCells, Hits, PlanarCaloCells (sorted alphabetically)
      expect(columns).toEqual([
        'Jets',
        'Photons',
        'Tracks',
        'CaloCells',
        'Hits',
        'PlanarCaloCells',
      ]);
    });
  });
});
