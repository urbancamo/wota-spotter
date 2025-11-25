<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { showToast } from 'vant'
import { apiClient, type Alert, type Summit } from '../services/api'
import { formatWotaId, formatSotaId, formatDateTime } from '../utils/formatters'
import { gridRefToLatLon } from '../utils/gridReference'

const alerts = ref<Alert[]>([])
const loading = ref(false)
const zoomScale = ref(1.0)

// Summit data for displaying names
const summits = ref<Summit[]>([])

// Auto-refresh interval and countdown
let refreshInterval: number | null = null
let countdownInterval: number | null = null
const secondsUntilRefresh = ref(60)

function resetRefreshTimer() {
  secondsUntilRefresh.value = 60
}

// Load zoom scale from localStorage
function loadZoomScale() {
  const saved = localStorage.getItem('wota-zoom-scale')
  if (saved) {
    try {
      const scale = parseFloat(saved)
      if (!isNaN(scale) && scale > 0) {
        zoomScale.value = scale
      }
    } catch (error) {
      console.error('Error loading zoom scale:', error)
    }
  }
}

// Save zoom scale to localStorage
function saveZoomScale() {
  localStorage.setItem('wota-zoom-scale', zoomScale.value.toString())
}

// Zoom in by 10%
function zoomIn() {
  zoomScale.value = Math.min(zoomScale.value * 1.1, 3.0) // Cap at 300%
  saveZoomScale()
}

// Zoom out by 10%
function zoomOut() {
  zoomScale.value = Math.max(zoomScale.value / 1.1, 0.5) // Min at 50%
  saveZoomScale()
}

// Load alerts and summits on mount
onMounted(async () => {
  loadZoomScale()
  await loadAlerts()
  await loadSummits()

  // Set up countdown timer (updates every second)
  countdownInterval = window.setInterval(() => {
    if (secondsUntilRefresh.value > 0) {
      secondsUntilRefresh.value--
    }
  }, 1000)

  // Set up auto-refresh every minute
  refreshInterval = window.setInterval(async () => {
    await loadAlerts(true) // Pass true to indicate silent refresh
    resetRefreshTimer()
  }, 60000) // 60 seconds
})

// Clean up intervals on unmount
onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})

async function refreshNow() {
  await loadAlerts(true)
  resetRefreshTimer()
}

async function loadAlerts(silent = false) {
  loading.value = true

  try {
    const allAlerts = await apiClient.alerts.getAll()

    // Filter alerts to only show those in the future
    const now = new Date()

    alerts.value = allAlerts.filter(alert => {
      const alertDate = new Date(alert.datetime)
      return alertDate >= now
    })

    if (!silent) {
      showToast({
        message: `Loaded ${alerts.value.length} alert(s)`,
        duration: 1500,
      })
    }
  } catch (error) {
    if (!silent) {
      showToast({
        message: 'Failed to load alerts',
        type: 'fail',
      })
    }
    console.error('Error loading alerts:', error)
  } finally {
    loading.value = false
  }
}

// Check if an alert is within the next 30 minutes
function isAlertRecent(datetime: string): boolean {
  const alertDate = new Date(datetime)
  const now = new Date()
  const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000)
  return alertDate >= now && alertDate <= thirtyMinutesFromNow
}

async function loadSummits() {
  try {
    const allSummits = await apiClient.summits.getAll()
    // Filter out WOTA ID 0 (dummy entry) and add computed lat/lon fields
    summits.value = allSummits
      .filter(s => s.wotaid !== 0)
      .map(summit => {
        // Compute lat/lon from grid reference
        const coords = gridRefToLatLon(summit.reference)
        return {
          ...summit,
          lat: coords?.lat,
          lon: coords?.lon
        }
      })
  } catch (error) {
    console.error('Error loading summits:', error)
  }
}

function onCallsignClick(event: Event, callsign: string) {
  event.stopPropagation()
  const url = `https://qrz.com/db/${callsign}`
  window.open(url, '_blank')
}

function onWotaClick(event: Event, wotaid: number) {
  event.stopPropagation()
  const paddedId = String(wotaid).padStart(3, '0')
  let url: string
  if (wotaid <= 214) {
    url = `https://www.wota.org.uk/mm_ldw-${paddedId}`
  } else {
    url = `https://www.wota.org.uk/mm_ldo-${paddedId}`
  }
  window.open(url, '_blank')
}

function onSotaClick(event: Event, sotaid: number) {
  event.stopPropagation()
  const formattedSotaId = formatSotaId(sotaid)
  if (formattedSotaId) {
    const url = `https://www.sotadata.org.uk/en/summit/${formattedSotaId}`
    window.open(url, '_blank')
  }
}

function getSotaIdForAlert(wotaid: number): number | null {
  const summit = summits.value.find(s => s.wotaid === wotaid)
  return summit?.sotaid ?? null
}

function getSummitName(wotaid: number): string | null {
  const summit = summits.value.find(s => s.wotaid === wotaid)
  return summit?.name ?? null
}
</script>

<template>
  <div class="alerts-page" :style="{
    transform: `scale(${zoomScale})`,
    transformOrigin: 'top left',
    width: `${100 / zoomScale}%`
  }">
    <!-- Navigation Bar -->
    <van-nav-bar fixed placeholder>
      <template #title>
        <div class="title-container">
          <div class="title-main">WOTA Alerts</div>
          <div class="title-countdown">
            {{ `Refreshing in ${secondsUntilRefresh}s` }}
          </div>
        </div>
      </template>
      <template #right>
        <div class="nav-actions">
          <van-icon name="minus" size="16" @click="zoomOut" class="zoom-icon" />
          <van-icon name="plus" size="16" @click="zoomIn" class="zoom-icon" />
          <van-icon name="replay" size="16" @click="refreshNow" class="refresh-icon" />
        </div>
      </template>
    </van-nav-bar>

    <!-- Alerts List -->
    <van-pull-refresh v-model="loading" @refresh="refreshNow" loading-text="Loading alerts...">
      <van-list>
        <van-cell
          v-for="alert in alerts"
          :key="alert.id"
          clickable
          :class="{ 'recent-alert': isAlertRecent(alert.datetime) }"
        >
          <template #title>
            <div class="alert-title">
              <span
                class="callsign-link"
                @click="onCallsignClick($event, alert.call)"
              >
                {{ alert.call }}
              </span>
              <span class="alert-time">{{ formatDateTime(alert.datetime) }}</span>
            </div>
          </template>
          <template #label>
            <div class="alert-details">
              <van-tag
                type="primary"
                size="medium"
                class="clickable-tag"
                @click="onWotaClick($event, alert.wotaid)"
              >
                {{ formatWotaId(alert.wotaid) }}
              </van-tag>
              <van-tag
                v-if="getSotaIdForAlert(alert.wotaid)"
                type="success"
                size="medium"
                class="clickable-tag"
                @click="onSotaClick($event, getSotaIdForAlert(alert.wotaid)!)"
              >
                {{ formatSotaId(getSotaIdForAlert(alert.wotaid)!) }}
              </van-tag>
              <van-tag type="default" size="medium">{{ alert.freqmode }}</van-tag>
            </div>
            <div class="alert-summit-name">
              {{ getSummitName(alert.wotaid) }}
            </div>
            <div class="alert-comment" v-if="alert.comment">
              {{ alert.comment }}
            </div>
            <div class="alert-postedby">
              Posted by:
              <span
                class="postedby-link"
                @click="onCallsignClick($event, alert.postedby)"
              >
                {{ alert.postedby }}
              </span>
            </div>
          </template>
        </van-cell>

        <van-empty
          v-if="alerts.length === 0 && !loading"
          description="No alerts found"
        />
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<style scoped>
.alerts-page {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 3.125em;
}

.title-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125em;
}

.title-main {
  font-size: 1em;
  font-weight: 600;
}

.title-countdown {
  font-size: 0.6875em;
  color: #969799;
  font-weight: normal;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.75em;
}

.zoom-icon,
.refresh-icon {
  cursor: pointer;
  transition: opacity 0.2s;
}

.zoom-icon:active,
.refresh-icon:active {
  opacity: 0.6;
}

.alert-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5em;
  font-weight: 500;
}

.alert-time {
  font-size: 0.75em;
  color: #969799;
  font-weight: normal;
}

.alert-details {
  display: flex;
  gap: 0.25em;
  flex-wrap: wrap;
  margin-top: 0.25em;
  margin-bottom: 0.25em;
}

.alert-summit-name {
  font-size: 1em;
  color: #323233;
  margin-top: 0.25em;
  margin-bottom: 0.25em;
  font-weight: bold;
}

.alert-comment {
  font-size: 0.8125em;
  color: #323233;
  margin-top: 0.25em;
  margin-bottom: 0.25em;
  font-style: italic;
}

.alert-postedby {
  font-size: 0.75em;
  color: #969799;
  margin-top: 0.25em;
}

.callsign-link,
.postedby-link {
  color: #1989fa;
  cursor: pointer;
  text-decoration: underline;
  font-weight: 500;
}

.callsign-link:active,
.postedby-link:active {
  opacity: 0.7;
}

.clickable-tag {
  cursor: pointer;
  transition: opacity 0.2s;
}

.clickable-tag:active {
  opacity: 0.7;
}

.recent-alert {
  background-color: #d4edda !important; /* Pastel green background */
}
</style>