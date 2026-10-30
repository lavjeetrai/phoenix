/**
 * @jest-environment jsdom
 */
import { ThreeManager } from '../../../managers/three-manager/index';
import { Vector3 } from 'three';

describe('ThreeManager security tests', () => {
  let three: any;

  beforeEach(() => {
    document.body.innerHTML = '<app-root></app-root>';

    three = Object.create(ThreeManager.prototype);
    three.origin = new Vector3(0, 0, 0);
    three.displayColor = 'black';
    three.show3DPointsCallback = null;
    three.filterRayIntersect = jest.fn();
  });

  afterEach(() => {
    if (three) {
      three.show3DMousePoints(false);
    }
    document.body.innerHTML = '';
  });

  describe('show3DMousePoints XSS prevention', () => {
    it('should safely render object names with HTML tags as plain text without parsing innerHTML', () => {
      const maliciousName = '<img src=x onerror=alert("XSS")>';
      three.getMainIntersect = jest.fn().mockReturnValue({
        object: { name: maliciousName },
        point: new Vector3(100, 200, 300),
      });

      three.show3DMousePoints(true);

      const event = new MouseEvent('click', {
        clientX: 50,
        clientY: 50,
      });
      window.dispatchEvent(event);

      const pElement = document.getElementById('3dcoordinates');
      expect(pElement).not.toBeNull();
      expect(pElement?.textContent).toContain(maliciousName);
      // Ensure no <img> or other HTML elements were created inside <p>
      expect(pElement?.getElementsByTagName('img').length).toBe(0);
      expect(pElement?.children.length).toBe(0);
      // innerHTML should have escaped HTML entities
      expect(pElement?.innerHTML).toContain(
        '&lt;img src=x onerror=alert("XSS")&gt;',
      );

      const divElement = document.getElementById('circledDot');
      expect(divElement).not.toBeNull();
      expect(divElement?.children.length).toBe(1);
    });

    it('should safely render compared grid coordinates when origin is non-zero', () => {
      three.origin = new Vector3(10, 20, 30);
      const maliciousName = '<script>alert(1)</script>';
      three.getMainIntersect = jest.fn().mockReturnValue({
        object: { name: maliciousName },
        point: new Vector3(100, 200, 300),
      });

      three.show3DMousePoints(true);

      const event = new MouseEvent('click', {
        clientX: 50,
        clientY: 50,
      });
      window.dispatchEvent(event);

      const pElement = document.getElementById('3dcoordinates');
      expect(pElement).not.toBeNull();
      expect(pElement?.textContent).toContain(maliciousName);
      expect(pElement?.textContent).toContain('Compared to grid (cm):');
      expect(pElement?.getElementsByTagName('script').length).toBe(0);
      expect(pElement?.children.length).toBe(0);
    });
  });
});
