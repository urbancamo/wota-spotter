import { PrismaClient as WotaPrismaClient } from '@prisma/wota-client'
import { PrismaClient as CmsPrismaClient } from '@prisma/cms-client'

// WOTA Database Client
export const wotaDb = new WotaPrismaClient()

// CMS Database Client (for authentication)
export const cmsDb = new CmsPrismaClient()

// Graceful shutdown
process.on('beforeExit', async () => {
  await wotaDb.$disconnect()
  await cmsDb.$disconnect()
})