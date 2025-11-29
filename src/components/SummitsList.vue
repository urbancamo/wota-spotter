<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { showToast, showLoadingToast, closeToast } from 'vant'
import { apiClient, type Summit } from '../services/api'
import { formatSotaId, formatWotaId, formatHeight, formatDate } from '../utils/formatters'
import { gridRefToLatLon } from '../utils/gridReference'
import { getCurrentPosition, formatDistance } from '../utils/geolocation'
import { toMaidenhead } from '../utils/maidenhead'
import LatLon from 'geodesy/latlon-spherical.js'

const emit = defineEmits<{
  'create-spot': [summit: Summit]
}>()

const summits = ref<Summit[]>([])
const searchValue = ref('')
const loading = ref(false)
const activeTab = ref(0)
const zoomScale = ref(1.0)
const userLocation = ref<{ lat: number; lon: number } | null>(null)
const gpsLoading = ref(false)

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

// Load summits on mount
onMounted(async () => {
  loadZoomScale()
  await loadSummits()
})

async function loadSummits() {
  loading.value = true

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
    showToast({
      message: `Loaded ${summits.value.length} summits`,
      duration: 1500,
    })
  } catch (error) {
    showToast({
      message: 'Failed to load summits',
      type: 'fail',
    })
    console.error('Error loading summits:', error)
  } finally {
    loading.value = false
  }
}

// Filter summits based on search
const filteredSummits = computed(() => {
  if (!searchValue.value) {
    return summits.value
  }

  const search = searchValue.value.toLowerCase()
  return summits.value.filter(summit =>
    summit.name.toLowerCase().includes(search) ||
    summit.wotaid.toString().includes(search) ||
    (summit.sotaid && summit.sotaid.toString().includes(search)) ||
    summit.reference.toLowerCase().includes(search)
  )
})

// Get recent activations
const recentActivations = computed(() => {
  return summits.value
    .filter(s => s.last_act_date !== null)
    .sort((a, b) => {
      if (!a.last_act_date || !b.last_act_date) return 0
      return new Date(b.last_act_date).getTime() - new Date(a.last_act_date).getTime()
    })
    .slice(0, 20)
})

// Get closest summits based on GPS location
const closestSummits = computed(() => {
  if (!userLocation.value) {
    return []
  }

  const userLatLon = new LatLon(userLocation.value.lat, userLocation.value.lon)

  return [...summits.value]
    .filter(s => s.lat !== undefined && s.lon !== undefined)
    .map(summit => {
      const summitLatLon = new LatLon(summit.lat!, summit.lon!)
      const distance = userLatLon.distanceTo(summitLatLon)
      return {
        ...summit,
        distance
      }
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 20)
})

// Get current list based on active tab
const currentList = computed(() => {
  if (searchValue.value) {
    return filteredSummits.value
  }

  switch (activeTab.value) {
    case 0: return summits.value
    case 1: return recentActivations.value
    case 2: return closestSummits.value
    default: return summits.value
  }
})

// Get GPS location when switching to Closest tab
async function getUserLocation() {
  if (gpsLoading.value) return

  gpsLoading.value = true
  showLoadingToast({
    message: 'Getting location...',
    forbidClick: true,
  })

  try {
    const position = await getCurrentPosition()

    if (!position) {
      closeToast()
      showToast({
        message: 'Could not get GPS location',
        type: 'fail',
      })
      return
    }

    userLocation.value = position
    closeToast()
  } catch (error) {
    closeToast()
    showToast({
      message: 'GPS error',
      type: 'fail',
    })
    console.error('GPS error:', error)
  } finally {
    gpsLoading.value = false
  }
}

// Watch for tab changes and get GPS when switching to Closest tab (tab 2)
watch(activeTab, async (newTab) => {
  if (newTab === 2 && !userLocation.value) {
    await getUserLocation()
  }
})

function onSearch() {
  // Search is reactive, no need to do anything
}

function onCancel() {
  searchValue.value = ''
}

function onWotaClick(event: Event, wotaid: number) {
  // Stop event propagation to prevent the cell click
  event.stopPropagation()

  // Generate WOTA link based on ID range with zero-padded ID
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
  // Stop event propagation to prevent the cell click
  event.stopPropagation()

  // Open SOTA Data link in new tab
  const formattedSotaId = formatSotaId(sotaid)
  if (formattedSotaId) {
    const url = `https://www.sotadata.org.uk/en/summit/${formattedSotaId}`
    window.open(url, '_blank')
  }
}

function onCallsignClick(event: Event, callsign: string) {
  // Stop event propagation to prevent the cell click
  event.stopPropagation()

  // Open QRZ.com link in new tab
  const url = `https://qrz.com/db/${callsign}`
  window.open(url, '_blank')
}

function onGridRefClick(event: Event, gridRef: string) {
  // Stop event propagation to prevent the cell click
  event.stopPropagation()

  // Convert grid reference to lat/lon
  const coords = gridRefToLatLon(gridRef)

  if (coords) {
    // Open OpenStreetMap centered on the coordinates
    // Format: https://www.openstreetmap.org/?mlat=LAT&mlon=LON#map=ZOOM/LAT/LON
    const url = `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lon}#map=15/${coords.lat}/${coords.lon}`
    window.open(url, '_blank')
  } else {
    showToast({
      message: 'Invalid grid reference',
      type: 'fail',
    })
  }
}

function onSummitClick(summit: Summit) {
  // Emit event to create a spot for this summit
  emit('create-spot', summit)
}
</script>

<template>
  <div class="summits-page" :style="{
    transform: `scale(${zoomScale})`,
    transformOrigin: 'top left',
    width: `${100 / zoomScale}%`
  }">
    <!-- Navigation Bar -->
    <van-nav-bar title="WOTA Summits" fixed placeholder>
      <template #right>
        <div class="nav-actions">
          <van-icon name="minus" size="16" @click="zoomOut" class="zoom-icon" />
          <van-icon name="plus" size="16" @click="zoomIn" class="zoom-icon" />
          <!--<van-icon name="setting-o" size="18" />-->
        </div>
      </template>
    </van-nav-bar>

    <!-- Search Bar -->
    <van-search
      v-model="searchValue"
      placeholder="Search summits..."
      show-action
      @search="onSearch"
      @cancel="onCancel"
    />

    <!-- Tabs -->
    <van-tabs v-model:active="activeTab" v-if="!searchValue">
      <van-tab title="All" />
      <van-tab title="Recent" />
      <van-tab title="Closest" />
    </van-tabs>

    <!-- Results count -->
    <div class="results-info" v-if="searchValue">
      <van-notice-bar
        :text="`Found ${currentList.length} summit(s)`"
        left-icon="search"
        background-color="#ecf9ff"
        color="#1989fa"
      />
    </div>

    <!-- Summits List -->
    <van-pull-refresh v-model="loading" @refresh="loadSummits" loading-text="Loading summits...">
      <van-list>
        <van-cell
          v-for="summit in currentList"
          :key="summit.wotaid"
          :title="summit.name"
          is-link
          clickable
          @click="onSummitClick(summit)"
        >
          <template #label>
            <div class="summit-details">
              <van-tag
                type="primary"
                size="medium"
                class="clickable-tag"
                @click="onWotaClick($event, summit.wotaid)"
              >
                {{ formatWotaId(summit.wotaid) }}
              </van-tag>
              <van-tag
                v-if="summit.sotaid"
                type="success"
                size="medium"
                class="clickable-tag"
                @click="onSotaClick($event, summit.sotaid)"
              >
                {{ formatSotaId(summit.sotaid) }}
              </van-tag>
              <van-tag
                type="default"
                size="medium"
                class="clickable-tag"
                @click="onGridRefClick($event, summit.reference)"
              >
                {{ summit.reference }}
              </van-tag>
              <van-tag
                v-if="summit.lat && summit.lon"
                type="warning"
                size="medium"
              >
                {{ toMaidenhead(summit.lat, summit.lon) }}
              </van-tag>
            </div>
            <div class="summit-meta">
              <span v-if="activeTab === 2 && summit.distance !== undefined">
                {{ formatDistance(summit.distance) }} •
              </span>
              <span>{{ formatHeight(summit.height) }}</span>
              <span v-if="summit.last_act_by">
                • Last:
                <span
                  class="callsign-link"
                  @click="onCallsignClick($event, summit.last_act_by)"
                >
                  {{ summit.last_act_by }}
                </span>
                ({{ formatDate(summit.last_act_date) }})
              </span>
            </div>
          </template>
        </van-cell>

        <van-empty
          v-if="currentList.length === 0 && !loading"
          description="No summits found"
        />
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<style scoped>
.summits-page {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 3.125em; /* Space for bottom navigation */
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.75em;
}

.zoom-icon {
  cursor: pointer;
  transition: opacity 0.2s;
}

.zoom-icon:active {
  opacity: 0.6;
}

.results-info {
  margin-bottom: 0.5em;
}

.summit-details {
  display: flex;
  gap: 0.25em;
  flex-wrap: wrap;
  margin-top: 0.25em;
  margin-bottom: 0.25em;
}

.summit-meta {
  font-size: 0.75em;
  color: #969799;
  margin-top: 0.25em;
}

.clickable-tag {
  cursor: pointer;
  transition: opacity 0.2s;
}

.clickable-tag:active {
  opacity: 0.7;
}

.callsign-link {
  color: #1989fa;
  cursor: pointer;
  text-decoration: underline;
  font-weight: 500;
}

.callsign-link:active {
  opacity: 0.7;
}
</style>
