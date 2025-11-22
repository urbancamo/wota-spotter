import LatLon from 'geodesy/latlon-spherical.js'
import type { Summit } from '../services/api'

/**
 * Get current GPS position from browser
 * @returns Promise with current coordinates or null if unavailable
 */
export async function getCurrentPosition(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser')
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        })
      },
      (error) => {
        console.error('Error getting location:', error)
        resolve(null)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  })
}

/**
 * Find the closest summit to given coordinates
 * @param userLat - User's latitude
 * @param userLon - User's longitude
 * @param summits - Array of summits with computed lat/lon fields
 * @returns Closest summit or null if no valid summits
 */
export function findClosestSummit(
  userLat: number,
  userLon: number,
  summits: Summit[]
): Summit | null {
  if (summits.length === 0) {
    return null
  }

  const userLocation = new LatLon(userLat, userLon)
  let closestSummit: Summit | null = null
  let minDistance = Infinity

  for (const summit of summits) {
    // Skip summits without computed coordinates
    if (summit.lat === undefined || summit.lon === undefined) {
      continue
    }

    const summitLocation = new LatLon(summit.lat, summit.lon)
    const distance = userLocation.distanceTo(summitLocation)

    if (distance < minDistance) {
      minDistance = distance
      closestSummit = summit
    }
  }

  return closestSummit
}

/**
 * Format distance in meters to human-readable string
 * @param meters - Distance in meters
 * @returns Formatted string (e.g., "1.2 km" or "350 m")
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `${Math.round(meters)} m`
}