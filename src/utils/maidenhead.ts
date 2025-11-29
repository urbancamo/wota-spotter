/**
 * Convert latitude and longitude to Maidenhead locator (grid square)
 *
 * @param lat Latitude in decimal degrees (-90 to 90)
 * @param lon Longitude in decimal degrees (-180 to 180)
 * @param precision Number of character pairs to include (1-4, default 3 for 6 characters)
 * @returns Maidenhead locator string (e.g., "IO91vl")
 */
export function toMaidenhead(lat: number, lon: number, precision: number = 3): string {
  if (lat < -90 || lat > 90) {
    throw new Error('Latitude must be between -90 and 90')
  }
  if (lon < -180 || lon > 180) {
    throw new Error('Longitude must be between -180 and 180')
  }

  // Adjust longitude to 0-360 range
  const adjustedLon = lon + 180
  const adjustedLat = lat + 90

  let locator = ''

  // Field (first pair - letters A-R)
  const fieldLon = Math.floor(adjustedLon / 20)
  const fieldLat = Math.floor(adjustedLat / 10)
  locator += String.fromCharCode(65 + fieldLon) + String.fromCharCode(65 + fieldLat)

  if (precision < 2) return locator

  // Square (second pair - digits 0-9)
  const squareLon = Math.floor((adjustedLon % 20) / 2)
  const squareLat = Math.floor((adjustedLat % 10) / 1)
  locator += squareLon.toString() + squareLat.toString()

  if (precision < 3) return locator

  // Subsquare (third pair - letters a-x, lowercase)
  const subsquareLon = Math.floor((adjustedLon - Math.floor(adjustedLon / 2) * 2) * 12)
  const subsquareLat = Math.floor((adjustedLat - Math.floor(adjustedLat / 1) * 1) * 24)
  locator += String.fromCharCode(97 + subsquareLon) + String.fromCharCode(97 + subsquareLat)

  if (precision < 4) return locator

  // Extended square (fourth pair - digits 0-9)
  const extSquareLon = Math.floor((adjustedLon % (1/12)) / (1/120))
  const extSquareLat = Math.floor((adjustedLat % (1/24)) / (1/240))
  locator += extSquareLon.toString() + extSquareLat.toString()

  return locator
}
