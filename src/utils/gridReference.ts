import OsGridRef, { LatLon } from 'geodesy/osgridref.js';

/**
 * Coordinates in WGS84 (standard lat/lon)
 */
export interface Coordinates {
  lat: number;
  lon: number;
}

/**
 * Convert UK Ordnance Survey grid reference to WGS84 coordinates
 * @param gridRef - UK grid reference (e.g., "NY215072", "SD 123 456")
 * @returns Object with lat/lon coordinates, or null if invalid
 * @example
 * const coords = gridRefToLatLon('NY215072');
 * // Returns: { lat: 54.454098, lon: -3.212285 }
 */
export function gridRefToLatLon(gridRef: string): Coordinates | null {
  try {
    const parsed = OsGridRef.parse(gridRef);
    const latLon = parsed.toLatLon();

    return {
      lat: latLon.lat,
      lon: latLon.lon
    };
  } catch (error) {
    console.error(`Invalid grid reference: ${gridRef}`, error);
    return null;
  }
}

/**
 * Convert WGS84 coordinates to UK Ordnance Survey grid reference
 * @param lat - Latitude
 * @param lon - Longitude
 * @param digits - Number of digits for easting/northing (default: 10 for 1m precision)
 * @returns Grid reference string, or null if coordinates are outside UK
 * @example
 * const gridRef = latLonToGridRef(54.454098, -3.212285);
 * // Returns: "NY21500720"
 */
export function latLonToGridRef(lat: number, lon: number, digits: number = 10): string | null {
  try {
    const latLon = new LatLon(lat, lon);
    const gridRef = latLon.toOsGrid();
    return gridRef.toString(digits);
  } catch (error) {
    console.error(`Invalid coordinates: ${lat}, ${lon}`, error);
    return null;
  }
}
