import { KinematicsPanelOverlayComponent } from './kinematics-panel-overlay.component';
import { ActiveVariable } from 'phoenix-event-display';

describe('KinematicsPanelOverlayComponent', () => {
  let component: KinematicsPanelOverlayComponent;
  let eventDisplay: any;
  let activeVariable: ActiveVariable<string>;

  beforeEach(() => {
    activeVariable = new ActiveVariable<string>('');
    eventDisplay = {
      getCollections: jest.fn(() => ({})),
      getCollection: jest.fn(() => []),
      listenToDisplayedEventChange: jest.fn(() => jest.fn()),
      getActiveObjectId: jest.fn(() => activeVariable),
      highlightObject: jest.fn(),
      emit: jest.fn(),
    };
    const cdr: any = { detectChanges: jest.fn() };
    component = new KinematicsPanelOverlayComponent(eventDisplay, cdr);
  });

  describe('selectTrack', () => {
    it('should do nothing if row has no uuid', () => {
      const row = { uuid: '', values: {}, isCut: false };
      component.selectTrack(row);

      expect(eventDisplay.highlightObject).not.toHaveBeenCalled();
      expect(eventDisplay.emit).not.toHaveBeenCalled();
    });

    it('should update active row uuid, active object, highlight object, and emit track:inspected event', () => {
      component.activeObject = activeVariable;
      const row = {
        uuid: 'test-track-uuid-123',
        values: { pT: 10.5, eta: 0.5, phi: 1.2 },
        isCut: false,
      };

      component.selectTrack(row);

      expect(component.activeRowUuid).toBe('test-track-uuid-123');
      expect(component.activeObject.value).toBe('test-track-uuid-123');
      expect(eventDisplay.highlightObject).toHaveBeenCalledWith(
        'test-track-uuid-123',
      );
      expect(eventDisplay.emit).toHaveBeenCalledWith('track:inspected', row);
    });
  });
});
