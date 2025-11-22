import { PrismaClient } from '@prisma/client'

// Create a singleton instance of PrismaClient
let prisma: PrismaClient

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

// Spots service functions
export const spotsService = {
  // Get all spots
  async getAllSpots() {
    const client = getPrismaClient()
    return await client.spot.findMany({
      orderBy: {
        datetime: 'desc'
      }
    })
  },

  // Get a specific spot by ID
  async getSpotById(id: number) {
    const client = getPrismaClient()
    return await client.spot.findUnique({
      where: { id }
    })
  },

  // Create a new spot
  async createSpot(data: {
    datetime: Date
    call: string
    wotaid: number
    freqmode: string
    comment: string
    spotter: string
  }) {
    const client = getPrismaClient()

    // Get the maximum ID and add 1
    const maxSpot = await client.spot.findFirst({
      orderBy: {
        id: 'desc'
      },
      select: {
        id: true
      }
    })

    const nextId = maxSpot ? maxSpot.id + 1 : 1

    return await client.spot.create({
      data: {
        id: nextId,
        ...data
      }
    })
  },

  // Update a spot
  async updateSpot(id: number, data: {
    datetime?: Date
    call?: string
    wotaid?: number
    freqmode?: string
    comment?: string
    spotter?: string
  }) {
    const client = getPrismaClient()
    return await client.spot.update({
      where: { id },
      data
    })
  },

  // Delete a spot
  async deleteSpot(id: number) {
    const client = getPrismaClient()
    return await client.spot.delete({
      where: { id }
    })
  },

  // Search spots by call sign
  async searchByCall(call: string) {
    const client = getPrismaClient()
    return await client.spot.findMany({
      where: {
        call: {
          contains: call
        }
      },
      orderBy: {
        datetime: 'desc'
      }
    })
  },

  // Get recent spots (last N spots)
  async getRecentSpots(limit: number = 10) {
    const client = getPrismaClient()
    return await client.spot.findMany({
      take: limit,
      orderBy: {
        datetime: 'desc'
      }
    })
  }
}

// Summits service functions
export const summitsService = {
  // Get all summits
  async getAllSummits() {
    const client = getPrismaClient()
    return await client.summit.findMany({
      orderBy: {
        wotaid: 'asc'
      }
    })
  },

  // Get summit by WOTA ID
  async getByWotaId(wotaid: number) {
    const client = getPrismaClient()
    return await client.summit.findUnique({
      where: { wotaid }
    })
  },

  // Get summits by SOTA ID
  async getBySotaId(sotaid: number) {
    const client = getPrismaClient()
    return await client.summit.findMany({
      where: { sotaid }
    })
  },

  // Search summits by name (partial match)
  async searchByName(name: string) {
    const client = getPrismaClient()
    return await client.summit.findMany({
      where: {
        name: {
          contains: name
        }
      },
      orderBy: {
        name: 'asc'
      }
    })
  },

  // Search summits by name (case-insensitive partial match)
  // Note: MySQL string comparisons are case-insensitive by default with latin1_swedish_ci collation
  async searchByNameInsensitive(name: string) {
    const client = getPrismaClient()
    return await client.summit.findMany({
      where: {
        name: {
          contains: name
        }
      },
      orderBy: {
        name: 'asc'
      }
    })
  },

  // Get summits by book
  async getByBook(book: string) {
    const client = getPrismaClient()
    return await client.summit.findMany({
      where: { book },
      orderBy: {
        wotaid: 'asc'
      }
    })
  },

  // Create a new summit
  async createSummit(data: {
    wotaid: number
    book: string
    name: string
    height: number
    reference: string
    sotaid?: number | null
    last_act_by?: string | null
    last_act_date?: Date | null
    humpid?: number | null
    gridid?: string | null
  }) {
    const client = getPrismaClient()
    return await client.summit.create({
      data
    })
  },

  // Update a summit
  async updateSummit(wotaid: number, data: {
    sotaid?: number | null
    book?: string
    name?: string
    height?: number
    reference?: string
    last_act_by?: string | null
    last_act_date?: Date | null
    humpid?: number | null
    gridid?: string | null
  }) {
    const client = getPrismaClient()
    return await client.summit.update({
      where: { wotaid },
      data
    })
  },

  // Delete a summit
  async deleteSummit(wotaid: number) {
    const client = getPrismaClient()
    return await client.summit.delete({
      where: { wotaid }
    })
  },

  // Get summits with height greater than specified value
  async getByMinHeight(minHeight: number) {
    const client = getPrismaClient()
    return await client.summit.findMany({
      where: {
        height: {
          gte: minHeight
        }
      },
      orderBy: {
        height: 'desc'
      }
    })
  }
}

// Cleanup function to disconnect Prisma client
export async function disconnectDatabase() {
  if (prisma) {
    await prisma.$disconnect()
  }
}
