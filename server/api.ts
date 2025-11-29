import express from 'express'
import cors from 'cors'
import { summitsService, spotsService, alertsService } from '../src/services/database.js'

const app = express()
const port = 3001

// Middleware
app.use(cors())
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Summits endpoints
app.get('/api/summits', async (req, res) => {
  try {
    const summits = await summitsService.getAllSummits()
    res.json(summits)
  } catch (error) {
    console.error('Error fetching summits:', error)
    res.status(500).json({ error: 'Failed to fetch summits' })
  }
})

app.get('/api/summits/wotaid/:id', async (req, res) => {
  try {
    const wotaid = parseInt(req.params.id)
    const summit = await summitsService.getByWotaId(wotaid)
    if (summit) {
      res.json(summit)
    } else {
      res.status(404).json({ error: 'Summit not found' })
    }
  } catch (error) {
    console.error('Error fetching summit:', error)
    res.status(500).json({ error: 'Failed to fetch summit' })
  }
})

app.get('/api/summits/sotaid/:id', async (req, res) => {
  try {
    const sotaid = parseInt(req.params.id)
    const summits = await summitsService.getBySotaId(sotaid)
    res.json(summits)
  } catch (error) {
    console.error('Error fetching summits by sotaid:', error)
    res.status(500).json({ error: 'Failed to fetch summits' })
  }
})

app.get('/api/summits/search', async (req, res) => {
  try {
    const { name } = req.query
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name parameter is required' })
    }
    const summits = await summitsService.searchByName(name)
    res.json(summits)
  } catch (error) {
    console.error('Error searching summits:', error)
    res.status(500).json({ error: 'Failed to search summits' })
  }
})

app.get('/api/summits/book/:book', async (req, res) => {
  try {
    const book = req.params.book
    const summits = await summitsService.getByBook(book)
    res.json(summits)
  } catch (error) {
    console.error('Error fetching summits by book:', error)
    res.status(500).json({ error: 'Failed to fetch summits' })
  }
})

app.get('/api/summits/height/:minHeight', async (req, res) => {
  try {
    const minHeight = parseInt(req.params.minHeight)
    const summits = await summitsService.getByMinHeight(minHeight)
    res.json(summits)
  } catch (error) {
    console.error('Error fetching summits by height:', error)
    res.status(500).json({ error: 'Failed to fetch summits' })
  }
})

// Spots endpoints
app.get('/api/spots', async (req, res) => {
  try {
    const spots = await spotsService.getAllSpots()
    res.json(spots)
  } catch (error) {
    console.error('Error fetching spots:', error)
    res.status(500).json({ error: 'Failed to fetch spots' })
  }
})

app.get('/api/spots/recent', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10
    const spots = await spotsService.getRecentSpots(limit)
    res.json(spots)
  } catch (error) {
    console.error('Error fetching recent spots:', error)
    res.status(500).json({ error: 'Failed to fetch recent spots' })
  }
})

app.get('/api/spots/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const spot = await spotsService.getSpotById(id)
    if (spot) {
      res.json(spot)
    } else {
      res.status(404).json({ error: 'Spot not found' })
    }
  } catch (error) {
    console.error('Error fetching spot:', error)
    res.status(500).json({ error: 'Failed to fetch spot' })
  }
})

app.get('/api/spots/search', async (req, res) => {
  try {
    const { call } = req.query
    if (!call || typeof call !== 'string') {
      return res.status(400).json({ error: 'Call parameter is required' })
    }
    const spots = await spotsService.searchByCall(call)
    res.json(spots)
  } catch (error) {
    console.error('Error searching spots:', error)
    res.status(500).json({ error: 'Failed to search spots' })
  }
})

app.post('/api/spots', async (req, res) => {
  try {
    const { call, wotaid, freqmode, comment, spotter } = req.body

    // Validate required fields
    if (!call || !wotaid || !freqmode || !spotter) {
      return res.status(400).json({ error: 'Missing required fields: call, wotaid, freqmode, spotter' })
    }

    const spot = await spotsService.createSpot({
      datetime: new Date(),
      call,
      wotaid: parseInt(wotaid),
      freqmode,
      comment: comment || '',
      spotter
    })

    res.status(201).json(spot)
  } catch (error) {
    console.error('Error creating spot:', error)
    res.status(500).json({ error: 'Failed to create spot' })
  }
})

// Alerts endpoints
app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await alertsService.getAllAlerts()
    res.json(alerts)
  } catch (error) {
    console.error('Error fetching alerts:', error)
    res.status(500).json({ error: 'Failed to fetch alerts' })
  }
})

app.get('/api/alerts/recent', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10
    const alerts = await alertsService.getRecentAlerts(limit)
    res.json(alerts)
  } catch (error) {
    console.error('Error fetching recent alerts:', error)
    res.status(500).json({ error: 'Failed to fetch recent alerts' })
  }
})

app.get('/api/alerts/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const alert = await alertsService.getAlertById(id)
    if (alert) {
      res.json(alert)
    } else {
      res.status(404).json({ error: 'Alert not found' })
    }
  } catch (error) {
    console.error('Error fetching alert:', error)
    res.status(500).json({ error: 'Failed to fetch alert' })
  }
})

app.get('/api/alerts/search', async (req, res) => {
  try {
    const { call } = req.query
    if (!call || typeof call !== 'string') {
      return res.status(400).json({ error: 'Call parameter is required' })
    }
    const alerts = await alertsService.searchByCall(call)
    res.json(alerts)
  } catch (error) {
    console.error('Error searching alerts:', error)
    res.status(500).json({ error: 'Failed to search alerts' })
  }
})

app.post('/api/alerts', async (req, res) => {
  try {
    const { call, wotaid, freqmode, comment, postedby, datetime } = req.body

    // Validate required fields
    if (!call || !wotaid || !freqmode || !postedby) {
      return res.status(400).json({ error: 'Missing required fields: call, wotaid, freqmode, postedby' })
    }

    const alert = await alertsService.createAlert({
      datetime: datetime ? new Date(datetime) : new Date(),
      call,
      wotaid: parseInt(wotaid),
      freqmode,
      comment: comment || null,
      postedby
    })

    res.status(201).json(alert)
  } catch (error) {
    console.error('Error creating alert:', error)
    res.status(500).json({ error: 'Failed to create alert' })
  }
})

app.delete('/api/alerts/:id', async (req, res) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({ error: 'Missing alert ID' })
    }

    await alertsService.deleteAlert(parseInt(id))

    res.status(200).json({ message: 'Alert deleted successfully' })
  } catch (error) {
    console.error('Error deleting alert:', error)
    res.status(500).json({ error: 'Failed to delete alert' })
  }
})

// Start server
app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`)
  console.log(`Health check: http://localhost:${port}/api/health`)
})
