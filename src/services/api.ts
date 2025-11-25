// API client for frontend to communicate with backend

const API_BASE = '/api'

interface Summit {
  wotaid: number  // Display as LDW-XXX (<=214) or LDO-XXX (>214, subtract 214) format (e.g., LDW-001, 215→LDO-001)
  sotaid: number | null  // Display as G/LD-XXX format (e.g., G/LD-001)
  book: string
  name: string
  height: number
  reference: string
  last_act_by: string | null
  last_act_date: Date | null
  humpid: number | null
  gridid: string | null
  // Computed fields from grid reference
  lat?: number
  lon?: number
}

interface Spot {
  id: number
  datetime: Date
  call: string
  wotaid: number
  freqmode: string
  comment: string
  spotter: string
}

interface Alert {
  id: number
  datetime: Date
  call: string
  wotaid: number
  freqmode: string
  comment: string | null
  postedby: string
}

export const apiClient = {
  // Summits API
  summits: {
    async getAll(): Promise<Summit[]> {
      const response = await fetch(`${API_BASE}/summits`)
      if (!response.ok) {
        throw new Error('Failed to fetch summits')
      }
      return response.json()
    },

    async getByWotaId(wotaid: number): Promise<Summit | null> {
      const response = await fetch(`${API_BASE}/summits/wotaid/${wotaid}`)
      if (response.status === 404) {
        return null
      }
      if (!response.ok) {
        throw new Error('Failed to fetch summit')
      }
      return response.json()
    },

    async getBySotaId(sotaid: number): Promise<Summit[]> {
      const response = await fetch(`${API_BASE}/summits/sotaid/${sotaid}`)
      if (!response.ok) {
        throw new Error('Failed to fetch summits')
      }
      return response.json()
    },

    async searchByName(name: string): Promise<Summit[]> {
      const response = await fetch(`${API_BASE}/summits/search?name=${encodeURIComponent(name)}`)
      if (!response.ok) {
        throw new Error('Failed to search summits')
      }
      return response.json()
    },

    async getByBook(book: string): Promise<Summit[]> {
      const response = await fetch(`${API_BASE}/summits/book/${book}`)
      if (!response.ok) {
        throw new Error('Failed to fetch summits')
      }
      return response.json()
    },

    async getByMinHeight(minHeight: number): Promise<Summit[]> {
      const response = await fetch(`${API_BASE}/summits/height/${minHeight}`)
      if (!response.ok) {
        throw new Error('Failed to fetch summits')
      }
      return response.json()
    },
  },

  // Spots API
  spots: {
    async getAll(): Promise<Spot[]> {
      const response = await fetch(`${API_BASE}/spots`)
      if (!response.ok) {
        throw new Error('Failed to fetch spots')
      }
      return response.json()
    },

    async getRecent(limit: number = 10): Promise<Spot[]> {
      const response = await fetch(`${API_BASE}/spots/recent?limit=${limit}`)
      if (!response.ok) {
        throw new Error('Failed to fetch recent spots')
      }
      return response.json()
    },

    async getById(id: number): Promise<Spot | null> {
      const response = await fetch(`${API_BASE}/spots/${id}`)
      if (response.status === 404) {
        return null
      }
      if (!response.ok) {
        throw new Error('Failed to fetch spot')
      }
      return response.json()
    },

    async searchByCall(call: string): Promise<Spot[]> {
      const response = await fetch(`${API_BASE}/spots/search?call=${encodeURIComponent(call)}`)
      if (!response.ok) {
        throw new Error('Failed to search spots')
      }
      return response.json()
    },

    async create(data: {
      call: string
      wotaid: number
      freqmode: string
      comment: string
      spotter: string
    }): Promise<Spot> {
      const response = await fetch(`${API_BASE}/spots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('Failed to create spot')
      }
      return response.json()
    },
  },

  // Alerts API
  alerts: {
    async getAll(): Promise<Alert[]> {
      const response = await fetch(`${API_BASE}/alerts`)
      if (!response.ok) {
        throw new Error('Failed to fetch alerts')
      }
      return response.json()
    },

    async getRecent(limit: number = 10): Promise<Alert[]> {
      const response = await fetch(`${API_BASE}/alerts/recent?limit=${limit}`)
      if (!response.ok) {
        throw new Error('Failed to fetch recent alerts')
      }
      return response.json()
    },

    async getById(id: number): Promise<Alert | null> {
      const response = await fetch(`${API_BASE}/alerts/${id}`)
      if (response.status === 404) {
        return null
      }
      if (!response.ok) {
        throw new Error('Failed to fetch alert')
      }
      return response.json()
    },

    async searchByCall(call: string): Promise<Alert[]> {
      const response = await fetch(`${API_BASE}/alerts/search?call=${encodeURIComponent(call)}`)
      if (!response.ok) {
        throw new Error('Failed to search alerts')
      }
      return response.json()
    },

    async create(data: {
      call: string
      wotaid: number
      freqmode: string
      comment: string
      postedby: string
    }): Promise<Alert> {
      const response = await fetch(`${API_BASE}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('Failed to create alert')
      }
      return response.json()
    },
  },

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    const response = await fetch(`${API_BASE}/health`)
    if (!response.ok) {
      throw new Error('Health check failed')
    }
    return response.json()
  },
}

export type { Summit, Spot, Alert }
