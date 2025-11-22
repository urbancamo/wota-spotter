/**
 * Format SOTA ID to G/LD-XXX format
 * @param sotaid - The SOTA ID number
 * @returns Formatted string like "G/LD-001"
 */
export function formatSotaId(sotaid: number | null): string | null {
  if (sotaid === null) return null
  const paddedNumber = String(sotaid).padStart(3, '0')
  return `G/LD-${paddedNumber}`
}

/**
 * Format WOTA ID to LDW-XXX or LDO-XXX format
 * @param wotaid - The WOTA ID number
 * @returns Formatted string like "LDW-001" (<=214) or "LDO-001" (215, after subtracting 214)
 */
export function formatWotaId(wotaid: number): string {
  if (wotaid <= 214) {
    const paddedNumber = String(wotaid).padStart(3, '0')
    return `LDW-${paddedNumber}`
  } else {
    const ldoNumber = wotaid - 214
    const paddedNumber = String(ldoNumber).padStart(3, '0')
    return `LDO-${paddedNumber}`
  }
}

/**
 * Format height in meters
 * @param height - Height in meters
 * @returns Formatted string like "978m" or "Unknown"
 */
export function formatHeight(height: number): string {
  return height > 0 ? `${height}m` : 'Unknown'
}

/**
 * Format date for display
 * @param date - Date to format
 * @returns Formatted date string or "Never"
 */
export function formatDate(date: Date | null): string {
  if (!date) return 'Never'
  return new Date(date).toLocaleDateString()
}

/**
 * Format datetime for display with both date and time
 * @param datetime - Datetime to format
 * @returns Formatted datetime string or "Unknown"
 */
export function formatDateTime(datetime: Date | null): string {
  if (!datetime) return 'Unknown'
  const d = new Date(datetime)
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
