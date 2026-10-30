/**
 * @jest-environment jsdom
 */
import { EventDisplay } from '../event-display';

describe('EventDisplay', () => {
  describe('cleanup', () => {
    let eventDisplay: any;

    beforeEach(() => {
      // `cleanup` is exercised on a bare instance so the test does not need a
      // WebGL context, a DOM host element or a loaded configuration.
      eventDisplay = Object.create(EventDisplay.prototype);
      eventDisplay.onEventsChange = [];
      eventDisplay.onDisplayedEventChange = [];
      eventDisplay.onStateChange = [];
      eventDisplay.eventBus = new Map();
      eventDisplay.eventBusWildcard = new Set();
      eventDisplay.stateChangeTimeout = null;
    });

    it('should not run pending state change callbacks after cleanup', () => {
      jest.useFakeTimers();

      const callback = jest.fn();
      eventDisplay.onStateChange.push(callback);

      // A state change is queued, then the display is torn down before the
      // debounced callbacks get a chance to run.
      eventDisplay.triggerStateChange();
      eventDisplay.cleanup();

      jest.runAllTimers();

      expect(callback).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should clear the state change callbacks', () => {
      eventDisplay.onStateChange.push(jest.fn());

      eventDisplay.cleanup();

      expect(eventDisplay.onStateChange).toEqual([]);
    });
  });

  describe('buildSessionHost', () => {
    let eventDisplay: any;
    let sessionHost: any;

    beforeEach(() => {
      eventDisplay = Object.create(EventDisplay.prototype);
      sessionHost = eventDisplay['buildSessionHost']();
    });

    describe('getStateSnapshot', () => {
      it('should return state JSON when getStateManager succeeds', () => {
        const mockState = { eventDisplay: { phoenixMenu: {} } };
        eventDisplay.getStateManager = jest.fn().mockReturnValue({
          getStateAsJSON: jest.fn().mockReturnValue(mockState),
        });

        expect(sessionHost.getStateSnapshot()).toEqual(mockState);
      });

      it('should return empty object when getStateManager throws an error', () => {
        eventDisplay.getStateManager = jest.fn().mockImplementation(() => {
          throw new Error('StateManager failed');
        });

        expect(sessionHost.getStateSnapshot()).toEqual({});
      });

      it('should return empty object when getStateAsJSON throws an error', () => {
        eventDisplay.getStateManager = jest.fn().mockReturnValue({
          getStateAsJSON: jest.fn().mockImplementation(() => {
            throw new Error('getStateAsJSON failed');
          }),
        });

        expect(sessionHost.getStateSnapshot()).toEqual({});
      });
    });
  });
});
