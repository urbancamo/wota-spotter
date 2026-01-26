/**
 * Calculate the Worked All Britain (WAB) square from an OS grid reference.
 * WAB squares are 10km x 10km areas identified by the 100km grid letters
 * plus the first digit of the easting and northing.
 *
 * @param gridRef - UK grid reference (e.g., "NY215072", "SD 123 456")
 * @returns WAB square (e.g., "NY20") or null if invalid
 * @example
 * toWABSquare('NY215072') // Returns: "NY20"
 * toWABSquare('SD 123 456') // Returns: "SD14"
 */
export function toWABSquare(gridRef: string): string | null {
  if (!gridRef) return null

  // Remove spaces and convert to uppercase
  const cleaned = gridRef.replace(/\s/g, '').toUpperCase()

  // Must start with two letters
  if (!/^[A-Z]{2}/.test(cleaned)) return null

  const letters = cleaned.substring(0, 2)
  const numbers = cleaned.substring(2)

  // Must have even number of digits (equal easting/northing)
  if (numbers.length === 0 || numbers.length % 2 !== 0) return null
  if (!/^\d+$/.test(numbers)) return null

  const halfLength = numbers.length / 2
  const eastingFirstDigit = numbers[0]
  const northingFirstDigit = numbers[halfLength]

  return `${letters}${eastingFirstDigit}${northingFirstDigit}`
}