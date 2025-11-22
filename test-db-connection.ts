import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('Testing database connection...')

    // Test connection
    await prisma.$connect()
    console.log('✓ Successfully connected to database')

    // Test reading from spots table
    const spotsCount = await prisma.spot.count()
    console.log(`✓ Found ${spotsCount} spots in the database`)

    // Get a few recent spots
    const recentSpots = await prisma.spot.findMany({
      take: 3,
      orderBy: { datetime: 'desc' }
    })
    console.log(`✓ Retrieved ${recentSpots.length} recent spots:`)
    recentSpots.forEach(spot => {
      console.log(`  - ID: ${spot.id}, Call: ${spot.call}, Date: ${spot.datetime}`)
    })

    console.log('\n✓ All database operations successful!')
  } catch (error) {
    console.error('✗ Database error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
    console.log('✓ Disconnected from database')
  }
}

testConnection()
