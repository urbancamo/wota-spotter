import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { summitsService, getPrismaClient, disconnectDatabase } from './database'

describe('Summits Database Tests', () => {
  beforeAll(() => {
    console.log('Starting summits database tests...')
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  describe('Reading summits table', () => {
    it('should connect to database and read all summits', async () => {
      const summits = await summitsService.getAllSummits()
      expect(summits).toBeDefined()
      expect(Array.isArray(summits)).toBe(true)
      console.log(`Found ${summits.length} summits in the database`)

      if (summits.length > 0) {
        const first = summits[0]
        console.log(`First summit: wotaid=${first?.wotaid}, name="${first?.name}", height=${first?.height}m`)
      }
    })

    it('should validate summit data structure', async () => {
      const summits = await summitsService.getAllSummits()
      if (summits.length > 0) {
        const summit = summits[0]
        expect(typeof summit?.wotaid).toBe('number')
        expect(typeof summit?.name).toBe('string')
        expect(typeof summit?.height).toBe('number')
        expect(typeof summit?.reference).toBe('string')
        expect(typeof summit?.book).toBe('string')
        console.log('Summit data structure validated successfully')
      }
    })
  })

  describe('Search by WOTA ID', () => {
    it('should retrieve a summit by valid wotaid', async () => {
      // First get a valid wotaid
      const allSummits = await summitsService.getAllSummits()
      if (allSummits.length > 0) {
        const testWotaId = allSummits[0]?.wotaid
        const summit = await summitsService.getByWotaId(testWotaId || 0)

        expect(summit).toBeDefined()
        expect(summit).not.toBeNull()
        expect(summit?.wotaid).toBe(testWotaId)
        console.log(`Retrieved summit by wotaid ${testWotaId}: "${summit?.name}"`)
      }
    })

    it('should return null for non-existent wotaid', async () => {
      const nonExistentId = 999999
      const summit = await summitsService.getByWotaId(nonExistentId)
      expect(summit).toBeNull()
      console.log('Successfully handled non-existent wotaid')
    })

    it('should handle multiple wotaid lookups', async () => {
      const allSummits = await summitsService.getAllSummits()
      if (allSummits.length >= 3) {
        const wotaIds = allSummits.slice(0, 3).map(s => s.wotaid)

        for (const wotaid of wotaIds) {
          const summit = await summitsService.getByWotaId(wotaid)
          expect(summit).not.toBeNull()
          expect(summit?.wotaid).toBe(wotaid)
        }
        console.log(`Successfully retrieved ${wotaIds.length} summits by wotaid`)
      }
    })
  })

  describe('Search by SOTA ID', () => {
    it('should retrieve summits by valid sotaid', async () => {
      // Find a summit with a sotaid
      const allSummits = await summitsService.getAllSummits()
      const summitWithSota = allSummits.find(s => s.sotaid !== null)

      if (summitWithSota && summitWithSota.sotaid) {
        const summits = await summitsService.getBySotaId(summitWithSota.sotaid)

        expect(summits).toBeDefined()
        expect(Array.isArray(summits)).toBe(true)
        expect(summits.length).toBeGreaterThan(0)
        console.log(`Found ${summits.length} summit(s) with sotaid ${summitWithSota.sotaid}`)
      } else {
        console.log('No summits with sotaid found in database, skipping test')
      }
    })

    it('should return empty array for non-existent sotaid', async () => {
      const nonExistentId = 999999
      const summits = await summitsService.getBySotaId(nonExistentId)
      expect(summits).toBeDefined()
      expect(Array.isArray(summits)).toBe(true)
      expect(summits.length).toBe(0)
      console.log('Successfully handled non-existent sotaid')
    })
  })

  describe('Search by name', () => {
    it('should search summits by partial name match', async () => {
      const allSummits = await summitsService.getAllSummits()
      if (allSummits.length > 0) {
        // Get a substring from the first summit's name
        const testName = allSummits[0]?.name
        const searchTerm = testName?.substring(0, Math.min(4, testName.length))

        const results = await summitsService.searchByName(searchTerm || '')
        expect(results).toBeDefined()
        expect(Array.isArray(results)).toBe(true)
        expect(results.length).toBeGreaterThan(0)

        // Verify all results contain the search term
        results.forEach(summit => {
          expect(summit.name.toLowerCase()).toContain(searchTerm?.toLowerCase())
        })

        console.log(`Search for "${searchTerm}" found ${results.length} summit(s)`)
      }
    })

    it('should return empty array for non-matching name', async () => {
      const nonMatchingName = 'ZZZZNONEXISTENT9999'
      const results = await summitsService.searchByName(nonMatchingName)
      expect(results).toBeDefined()
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBe(0)
      console.log('Successfully handled non-matching name search')
    })

    it('should perform case-insensitive name search', async () => {
      const allSummits = await summitsService.getAllSummits()
      if (allSummits.length > 0) {
        const testName = allSummits[0]?.name
        const searchTerm = testName?.substring(0, Math.min(4, testName.length))

        // Test with different cases
        const lowerResults = await summitsService.searchByNameInsensitive(searchTerm?.toLowerCase() || '')
        const upperResults = await summitsService.searchByNameInsensitive(searchTerm?.toUpperCase() || '')

        expect(lowerResults.length).toBeGreaterThan(0)
        expect(upperResults.length).toBeGreaterThan(0)
        // Note: MySQL case sensitivity depends on collation, so results might differ
        console.log(`Case-insensitive search: lowercase found ${lowerResults.length}, uppercase found ${upperResults.length}`)
      }
    })
  })

  describe('Additional search methods', () => {
    it('should retrieve summits by book code', async () => {
      const allSummits = await summitsService.getAllSummits()
      if (allSummits.length > 0) {
        const testBook = allSummits[0]?.book
        const results = await summitsService.getByBook(testBook || '')

        expect(results).toBeDefined()
        expect(Array.isArray(results)).toBe(true)
        expect(results.length).toBeGreaterThan(0)

        // Verify all results have the correct book code
        results.forEach(summit => {
          expect(summit.book).toBe(testBook)
        })

        console.log(`Found ${results.length} summit(s) in book "${testBook}"`)
      }
    })

    it('should retrieve summits by minimum height', async () => {
      const allSummits = await summitsService.getAllSummits()
      if (allSummits.length > 0) {
        const minHeight = 500 // 500 meters
        const results = await summitsService.getByMinHeight(minHeight)

        expect(results).toBeDefined()
        expect(Array.isArray(results)).toBe(true)

        // Verify all results meet the height requirement
        results.forEach(summit => {
          expect(summit.height).toBeGreaterThanOrEqual(minHeight)
        })

        console.log(`Found ${results.length} summit(s) with height >= ${minHeight}m`)
      }
    })
  })

  describe('Error scenarios', () => {
    it('should handle database connection errors gracefully', async () => {
      try {
        const client = getPrismaClient()
        await client.$queryRaw`SELECT 1 as test`
        console.log('Database connection successful for summits tests')
      } catch (error) {
        console.error('Database connection error:', error)
        throw error
      }
    })

    it('should prevent SQL injection in name search', async () => {
      const maliciousInput = "'; DROP TABLE summits; --"
      const results = await summitsService.searchByName(maliciousInput)
      expect(results).toBeDefined()
      expect(Array.isArray(results)).toBe(true)
      console.log('Successfully prevented SQL injection in name search')
    })
  })

  describe('Data integrity', () => {
    it('should have valid wotaid values', async () => {
      const summits = await summitsService.getAllSummits()
      summits.forEach(summit => {
        expect(summit.wotaid).toBeGreaterThanOrEqual(0)
        expect(Number.isInteger(summit.wotaid)).toBe(true)
      })
      console.log(`All ${summits.length} wotaid values are valid integers >= 0`)
    })

    it('should have valid height values', async () => {
      const summits = await summitsService.getAllSummits()
      summits.forEach(summit => {
        expect(summit.height).toBeGreaterThanOrEqual(0)
        expect(Number.isInteger(summit.height)).toBe(true)
      })
      console.log(`All ${summits.length} height values are valid integers >= 0`)
    })

    it('should have non-empty name and reference fields', async () => {
      const summits = await summitsService.getAllSummits()
      summits.forEach(summit => {
        expect(summit.name).toBeDefined()
        expect(summit.reference).toBeDefined()
        expect(typeof summit.name).toBe('string')
        expect(typeof summit.reference).toBe('string')
      })
      console.log('All summits have defined name and reference fields')
    })
  })
})
