import { describe, it, expect } from 'vitest'
import { formatSotaId, formatWotaId, formatHeight, formatDate } from './formatters'

describe('Formatters', () => {
  describe('formatSotaId', () => {
    it('should format single digit SOTA IDs with zero padding', () => {
      expect(formatSotaId(1)).toBe('G/LD-001')
      expect(formatSotaId(5)).toBe('G/LD-005')
      expect(formatSotaId(9)).toBe('G/LD-009')
    })

    it('should format double digit SOTA IDs with zero padding', () => {
      expect(formatSotaId(10)).toBe('G/LD-010')
      expect(formatSotaId(42)).toBe('G/LD-042')
      expect(formatSotaId(99)).toBe('G/LD-099')
    })

    it('should format triple digit SOTA IDs without padding', () => {
      expect(formatSotaId(100)).toBe('G/LD-100')
      expect(formatSotaId(123)).toBe('G/LD-123')
      expect(formatSotaId(999)).toBe('G/LD-999')
    })

    it('should handle four digit SOTA IDs', () => {
      expect(formatSotaId(1000)).toBe('G/LD-1000')
      expect(formatSotaId(1234)).toBe('G/LD-1234')
    })

    it('should return null for null input', () => {
      expect(formatSotaId(null)).toBeNull()
    })
  })

  describe('formatWotaId', () => {
    it('should format WOTA IDs <= 214 with LDW prefix and zero padding', () => {
      expect(formatWotaId(0)).toBe('LDW-000')
      expect(formatWotaId(1)).toBe('LDW-001')
      expect(formatWotaId(42)).toBe('LDW-042')
      expect(formatWotaId(123)).toBe('LDW-123')
      expect(formatWotaId(214)).toBe('LDW-214')
    })

    it('should format WOTA IDs > 214 with LDO prefix after subtracting 214', () => {
      expect(formatWotaId(215)).toBe('LDO-001')  // 215 - 214 = 1
      expect(formatWotaId(216)).toBe('LDO-002')  // 216 - 214 = 2
      expect(formatWotaId(300)).toBe('LDO-086')  // 300 - 214 = 86
      expect(formatWotaId(428)).toBe('LDO-214')  // 428 - 214 = 214
      expect(formatWotaId(999)).toBe('LDO-785')  // 999 - 214 = 785
    })

    it('should handle four digit WOTA IDs with LDO prefix', () => {
      expect(formatWotaId(1000)).toBe('LDO-786')   // 1000 - 214 = 786
      expect(formatWotaId(1234)).toBe('LDO-1020')  // 1234 - 214 = 1020
    })
  })

  describe('formatHeight', () => {
    it('should format positive heights with meters suffix', () => {
      expect(formatHeight(100)).toBe('100m')
      expect(formatHeight(978)).toBe('978m')
      expect(formatHeight(1000)).toBe('1000m')
    })

    it('should return "Unknown" for zero height', () => {
      expect(formatHeight(0)).toBe('Unknown')
    })

    it('should return "Unknown" for negative height', () => {
      expect(formatHeight(-1)).toBe('Unknown')
    })
  })

  describe('formatDate', () => {
    it('should format valid dates', () => {
      const date = new Date('2023-11-22')
      const formatted = formatDate(date)
      expect(formatted).toBeDefined()
      expect(formatted).not.toBe('Never')
      // Format depends on locale, so just check it's not "Never"
    })

    it('should return "Never" for null dates', () => {
      expect(formatDate(null)).toBe('Never')
    })
  })
})
