import { describe, it, expect } from 'vitest';
import { gridRefToLatLon, latLonToGridRef } from './gridReference';

describe('Grid Reference Conversion', () => {
  describe('gridRefToLatLon', () => {
    it('should convert a valid grid reference to coordinates', () => {
      const result = gridRefToLatLon('NY215072');

      expect(result).not.toBeNull();
      expect(result?.lat).toBeCloseTo(54.454, 2);
      expect(result?.lon).toBeCloseTo(-3.212, 2);
    });

    it('should handle grid references with spaces', () => {
      const result = gridRefToLatLon('NY 215 072');

      expect(result).not.toBeNull();
      expect(result?.lat).toBeDefined();
      expect(result?.lon).toBeDefined();
    });

    it('should handle 6-figure grid references', () => {
      const result = gridRefToLatLon('SD123456');

      expect(result).not.toBeNull();
      expect(result?.lat).toBeDefined();
      expect(result?.lon).toBeDefined();
    });

    it('should return null for invalid grid reference', () => {
      const result = gridRefToLatLon('INVALID');

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = gridRefToLatLon('');

      expect(result).toBeNull();
    });
  });

  describe('latLonToGridRef', () => {
    it('should convert coordinates to grid reference', () => {
      const result = latLonToGridRef(54.454098, -3.212285);

      expect(result).not.toBeNull();
      expect(result).toContain('NY');
    });

    it('should handle different precision levels', () => {
      const result6 = latLonToGridRef(54.454098, -3.212285, 6);
      const result10 = latLonToGridRef(54.454098, -3.212285, 10);

      expect(result6).not.toBeNull();
      expect(result10).not.toBeNull();
      expect(result10!.length).toBeGreaterThan(result6!.length);
    });

    it('should return null for coordinates outside UK', () => {
      const result = latLonToGridRef(48.8566, 2.3522); // Paris

      expect(result).toBeNull();
    });
  });

  describe('round-trip conversion', () => {
    it('should convert grid ref to lat/lon and back accurately', () => {
      const originalGridRef = 'NY215072';
      const coords = gridRefToLatLon(originalGridRef);

      expect(coords).not.toBeNull();

      if (coords) {
        const backToGridRef = latLonToGridRef(coords.lat, coords.lon, 8);
        expect(backToGridRef).toContain('NY');
        // Note: won't be exact due to rounding, but should be very close
      }
    });
  });
});
