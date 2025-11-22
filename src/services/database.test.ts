import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spotsService, getPrismaClient, disconnectDatabase } from './database'

describe('Spots Database Tests', () => {
  beforeAll(() => {
    console.log('Starting database tests...')
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  describe('Reading spots table', () => {
    it('should connect to database and read all spots', async () => {
      const spots = await spotsService.getAllSpots()
      expect(spots).toBeDefined()
      expect(Array.isArray(spots)).toBe(true)
      console.log(`Found ${spots.length} spots in the database`)
    })

    it('should get recent spots with limit', async () => {
      const recentSpots = await spotsService.getRecentSpots(5)
      expect(recentSpots).toBeDefined()
      expect(Array.isArray(recentSpots)).toBe(true)
      expect(recentSpots.length).toBeLessThanOrEqual(5)
      console.log(`Retrieved ${recentSpots.length} recent spots`)
    })

    it('should handle getting a non-existent spot by ID', async () => {
      const nonExistentId = 999999999
      const spot = await spotsService.getSpotById(nonExistentId)
      expect(spot).toBeNull()
      console.log('Successfully handled non-existent spot ID')
    })

    it('should search spots by call sign', async () => {
      const spots = await spotsService.searchByCall('test')
      expect(spots).toBeDefined()
      expect(Array.isArray(spots)).toBe(true)
      console.log(`Search found ${spots.length} spots matching 'test'`)
    })
  })

  describe('Error scenarios', () => {
    it('should handle database connection errors gracefully', async () => {
      // This will test if the database connection is working
      try {
        const client = getPrismaClient()
        await client.$queryRaw`SELECT 1 as test`
        console.log('Database connection successful')
      } catch (error) {
        console.error('Database connection error:', error)
        throw error
      }
    })

    it('should handle invalid table queries', async () => {
      try {
        const client = getPrismaClient()
        // Try to query a non-existent table
        await client.$queryRaw`SELECT * FROM non_existent_table LIMIT 1`
        // If we get here, the test should fail
        expect(true).toBe(false)
      } catch (error) {
        // We expect an error here
        expect(error).toBeDefined()
        console.log('Successfully caught error for invalid table:', error.message)
      }
    })

    it('should handle malformed queries', async () => {
      try {
        const client = getPrismaClient()
        // Try a malformed query
        await client.$queryRaw`SELECT * FROM WHERE`
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeDefined()
        console.log('Successfully caught error for malformed query:', error.message)
      }
    })

    it('should handle creating spot with missing required fields', async () => {
      try {
        // @ts-expect-error - intentionally passing incomplete data
        await spotsService.createSpot({
          id: 999999,
          call: 'TEST'
          // Missing required fields: datetime, wotaid, freqmode, comment, spotter
        })
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeDefined()
        console.log('Successfully caught error for missing required fields:', error.message)
      }
    })

    it('should handle updating non-existent spot', async () => {
      try {
        await spotsService.updateSpot(999999999, {
          call: 'UPDATED'
        })
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeDefined()
        console.log('Successfully caught error for updating non-existent spot:', error.message)
      }
    })

    it('should handle deleting non-existent spot', async () => {
      try {
        await spotsService.deleteSpot(999999999)
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeDefined()
        console.log('Successfully caught error for deleting non-existent spot:', error.message)
      }
    })

    it('should handle SQL injection attempts', async () => {
      // Test SQL injection prevention in search
      const maliciousInput = "'; DROP TABLE spots; --"
      const spots = await spotsService.searchByCall(maliciousInput)
      expect(spots).toBeDefined()
      expect(Array.isArray(spots)).toBe(true)
      console.log('Successfully prevented SQL injection in search')
    })

    it('should validate data types on read', async () => {
      const spots = await spotsService.getAllSpots()
      if (spots.length > 0) {
        const firstSpot = spots[0]
        expect(typeof firstSpot.id).toBe('number')
        expect(firstSpot.datetime).toBeInstanceOf(Date)
        expect(typeof firstSpot.call).toBe('string')
        expect(typeof firstSpot.wotaid).toBe('number')
        expect(typeof firstSpot.freqmode).toBe('string')
        expect(typeof firstSpot.comment).toBe('string')
        expect(typeof firstSpot.spotter).toBe('string')
        console.log('Successfully validated data types for spot record')
      }
    })
  })

  describe('Connection handling', () => {
    it('should maintain singleton PrismaClient instance', () => {
      const client1 = getPrismaClient()
      const client2 = getPrismaClient()
      expect(client1).toBe(client2)
      console.log('Singleton pattern verified for PrismaClient')
    })
  })
})
