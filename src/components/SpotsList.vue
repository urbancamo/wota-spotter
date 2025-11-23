<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { showToast, showLoadingToast, closeToast, showSuccessToast } from 'vant'
import { apiClient, type Spot, type Summit } from '../services/api'
import { formatWotaId, formatSotaId, formatDateTime } from '../utils/formatters'
import { gridRefToLatLon } from '../utils/gridReference'
import { getCurrentPosition, findClosestSummit } from '../utils/geolocation'

const props = defineProps<{
  preselectedSummit: Summit | null
}>()

const emit = defineEmits<{
  'spot-form-opened': []
}>()

const spots = ref<Spot[]>([])
const loading = ref(false)
const spotsLimit = ref(5)
const showForm = ref(false)
const gpsLoading = ref(false)

// Form data
const formData = ref({
  summit: null as Summit | null,
  call: '',
  freqmode: '',
  comment: '',
  spotter: ''
})

// Summit search
const summits = ref<Summit[]>([])
const summitSearchValue = ref('')
const showSummitPicker = ref(false)

// Load form data from localStorage
function loadFormData() {
  const saved = localStorage.getItem('wota-spot-form')
  if (saved) {
    try {
      const data = JSON.parse(saved)
      formData.value = {
        ...formData.value,
        ...data
      }
    } catch (error) {
      console.error('Error loading form data:', error)
    }
  }
}

// Save form data to localStorage
function saveFormData() {
  localStorage.setItem('wota-spot-form', JSON.stringify(formData.value))
}

// Auto-refresh interval and countdown
let refreshInterval: number | null = null
let countdownInterval: number | null = null
const secondsUntilRefresh = ref(60)

function resetRefreshTimer() {
  secondsUntilRefresh.value = 60
}

// Watch for preselected summit from parent (with immediate to handle mount-time values)
watch(() => props.preselectedSummit, (summit) => {
  if (summit) {
    // First load any saved form data from localStorage (callsign, freqmode, spotter, etc.)
    loadFormData()
    // Then override just the summit field with the preselected one
    formData.value.summit = summit
    // Don't save to localStorage yet - let the user submit the form first
    // Open the form
    showForm.value = true
    // Notify parent that we've handled the preselection
    emit('spot-form-opened')
  }
}, { immediate: true })

// Load spots and summits on mount
onMounted(async () => {
  loadFormData()
  await loadSpots()
  await loadSummits()

  // Set up countdown timer (updates every second)
  countdownInterval = window.setInterval(() => {
    // Only countdown if forms are not open
    if (!showForm.value && !showSummitPicker.value) {
      if (secondsUntilRefresh.value > 0) {
        secondsUntilRefresh.value--
      }
    }
  }, 1000)

  // Set up auto-refresh every minute
  refreshInterval = window.setInterval(async () => {
    // Only auto-refresh if form is not open
    if (!showForm.value && !showSummitPicker.value) {
      await loadSpots(true) // Pass true to indicate silent refresh
      resetRefreshTimer()
    }
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
  await loadSpots(true)
  resetRefreshTimer()
}

async function loadSpots(silent = false) {
  loading.value = true

  try {
    const recentSpots = await apiClient.spots.getRecent(spotsLimit.value)
    spots.value = recentSpots

    if (!silent) {
      showToast({
        message: `Loaded ${spots.value.length} spot(s)`,
        duration: 1500,
      })
    }
  } catch (error) {
    if (!silent) {
      showToast({
        message: 'Failed to load spots',
        type: 'fail',
      })
    }
    console.error('Error loading spots:', error)
  } finally {
    loading.value = false
  }
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

// Filter summits based on search
const filteredSummits = computed(() => {
  if (!summitSearchValue.value) {
    return summits.value.slice(0, 50) // Show first 50 summits by default
  }

  const search = summitSearchValue.value.toLowerCase()
  return summits.value.filter(summit =>
    summit.name.toLowerCase().includes(search) ||
    summit.wotaid.toString().includes(search) ||
    (summit.sotaid && summit.sotaid.toString().includes(search)) ||
    formatWotaId(summit.wotaid).toLowerCase().includes(search) ||
    (summit.sotaid && formatSotaId(summit.sotaid)?.toLowerCase().includes(search))
  ).slice(0, 50) // Limit to 50 results
})

// Format summit for display in picker
function formatSummitDisplay(summit: Summit): string {
  const wotaId = formatWotaId(summit.wotaid)
  const sotaId = summit.sotaid ? formatSotaId(summit.sotaid) : ''
  return `${summit.name} (${wotaId}${sotaId ? ' / ' + sotaId : ''})`
}

// Get selected summit display text
const selectedSummitText = computed(() => {
  if (formData.value.summit) {
    return formatSummitDisplay(formData.value.summit)
  }
  return ''
})

function onSummitSelect(summit: Summit) {
  formData.value.summit = summit
  showSummitPicker.value = false
  saveFormData()
}

async function useGpsLocation() {
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

    const closestSummit = findClosestSummit(position.lat, position.lon, summits.value)

    if (!closestSummit) {
      closeToast()
      showToast({
        message: 'No summits found nearby',
        type: 'fail',
      })
      return
    }

    // Auto-select the closest summit
    formData.value.summit = closestSummit
    saveFormData()

    closeToast()
    showToast({
      message: `Selected ${closestSummit.name}`,
      duration: 2000,
    })
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

function getSotaIdForSpot(wotaid: number): number | null {
  const summit = summits.value.find(s => s.wotaid === wotaid)
  return summit?.sotaid ?? null
}

function openForm() {
  showForm.value = true
}

async function submitSpot() {
  // Validate form
  if (!formData.value.summit) {
    showToast({ message: 'Please select a summit', type: 'fail' })
    return
  }
  if (!formData.value.call) {
    showToast({ message: 'Please enter a callsign', type: 'fail' })
    return
  }
  if (!formData.value.freqmode) {
    showToast({ message: 'Please enter frequency/mode', type: 'fail' })
    return
  }
  if (!formData.value.spotter) {
    showToast({ message: 'Please enter your callsign', type: 'fail' })
    return
  }

  showLoadingToast({
    message: 'Creating spot...',
    forbidClick: true,
  })

  try {
    await apiClient.spots.create({
      call: formData.value.call,
      wotaid: formData.value.summit.wotaid,
      freqmode: formData.value.freqmode,
      comment: formData.value.comment,
      spotter: formData.value.spotter
    })

    closeToast()
    showSuccessToast('Spot created successfully')

    // Save form data
    saveFormData()

    // Reload spots
    await loadSpots()

    // Close form
    showForm.value = false
  } catch (error) {
    closeToast()
    showToast({
      message: 'Failed to create spot',
      type: 'fail',
    })
    console.error('Error creating spot:', error)
  }
}
</script>

<template>
  <div class="spots-page">
    <!-- Navigation Bar -->
    <van-nav-bar fixed placeholder>
      <template #title>
        <div class="title-container">
          <div class="title-main">WOTA Spots</div>
          <div class="title-countdown">
            {{ (showForm || showSummitPicker) ? 'Paused' : `Refreshing in ${secondsUntilRefresh}s` }}
          </div>
        </div>
      </template>
      <template #right>
        <div class="nav-actions">
          <van-icon name="replay" size="16" @click="refreshNow" class="refresh-icon" />
          <van-icon name="plus" size="18" @click="openForm" />
        </div>
      </template>
    </van-nav-bar>

    <!-- Spots List -->
    <van-pull-refresh v-model="loading" @refresh="loadSpots">
      <van-list>
        <van-cell
          v-for="spot in spots"
          :key="spot.id"
          clickable
        >
          <template #title>
            <div class="spot-title">
              <span
                class="callsign-link"
                @click="onCallsignClick($event, spot.call)"
              >
                {{ spot.call }}
              </span>
              <span class="spot-time">{{ formatDateTime(spot.datetime) }}</span>
            </div>
          </template>
          <template #label>
            <div class="spot-details">
              <van-tag
                type="primary"
                size="medium"
                class="clickable-tag"
                @click="onWotaClick($event, spot.wotaid)"
              >
                {{ formatWotaId(spot.wotaid) }}
              </van-tag>
              <van-tag
                v-if="getSotaIdForSpot(spot.wotaid)"
                type="success"
                size="medium"
                class="clickable-tag"
                @click="onSotaClick($event, getSotaIdForSpot(spot.wotaid)!)"
              >
                {{ formatSotaId(getSotaIdForSpot(spot.wotaid)!) }}
              </van-tag>
              <van-tag type="default" size="medium">{{ spot.freqmode }}</van-tag>
            </div>
            <div class="spot-comment" v-if="spot.comment">
              {{ spot.comment }}
            </div>
            <div class="spot-spotter">
              Spotted by:
              <span
                class="spotter-link"
                @click="onCallsignClick($event, spot.spotter)"
              >
                {{ spot.spotter }}
              </span>
            </div>
          </template>
        </van-cell>

        <van-empty
          v-if="spots.length === 0 && !loading"
          description="No spots found"
        />
      </van-list>
    </van-pull-refresh>

    <!-- Create Spot Form Popup -->
    <van-popup v-model:show="showForm" position="bottom" :style="{ height: '80%' }">
      <div class="form-container">
        <van-nav-bar
          title="Create Spot"
          left-text="Cancel"
          right-text="Submit"
          @click-left="showForm = false"
          @click-right="submitSpot"
        />

        <van-form @submit="submitSpot">
          <!-- Summit Field -->
          <van-field
            v-model="selectedSummitText"
            name="summit"
            label="Summit"
            placeholder="Select summit"
            readonly
            clickable
            @click="showSummitPicker = true"
            :rules="[{ required: true, message: 'Please select a summit' }]"
          >
            <template #button>
              <van-icon
                name="location-o"
                size="20"
                :class="['gps-icon', { 'gps-loading': gpsLoading }]"
                @click.stop="useGpsLocation"
              />
            </template>
          </van-field>

          <!-- Callsign Field -->
          <van-field
            v-model="formData.call"
            name="call"
            label="Callsign"
            placeholder="e.g., M0ABC/P"
            @blur="saveFormData"
            :rules="[{ required: true, message: 'Please enter callsign' }]"
          />

          <!-- Frequency/Mode Field -->
          <van-field
            v-model="formData.freqmode"
            name="freqmode"
            label="Freq/Mode"
            placeholder="e.g., 145.375-FM"
            @blur="saveFormData"
            :rules="[{ required: true, message: 'Please enter frequency/mode' }]"
          />

          <!-- Comment Field -->
          <van-field
            v-model="formData.comment"
            name="comment"
            label="Comment"
            placeholder="Optional comment"
            type="textarea"
            rows="2"
            @blur="saveFormData"
          />

          <!-- Spotter Field -->
          <van-field
            v-model="formData.spotter"
            name="spotter"
            label="Your Call"
            placeholder="e.g., M0XYZ"
            @blur="saveFormData"
            :rules="[{ required: true, message: 'Please enter your callsign' }]"
          />
        </van-form>
      </div>
    </van-popup>

    <!-- Summit Picker Popup -->
    <van-popup v-model:show="showSummitPicker" position="bottom" :style="{ height: '80%' }">
      <div class="picker-container">
        <van-nav-bar
          title="Select Summit"
          left-text="Cancel"
          @click-left="showSummitPicker = false"
        />

        <van-search
          v-model="summitSearchValue"
          placeholder="Search by name, WOTA ID, or SOTA ID"
        />

        <van-list>
          <van-cell
            v-for="summit in filteredSummits"
            :key="summit.wotaid"
            :title="summit.name"
            clickable
            @click="onSummitSelect(summit)"
          >
            <template #label>
              <div class="summit-details">
                <van-tag type="primary" size="small">{{ formatWotaId(summit.wotaid) }}</van-tag>
                <van-tag v-if="summit.sotaid" type="success" size="small">
                  {{ formatSotaId(summit.sotaid) }}
                </van-tag>
              </div>
            </template>
          </van-cell>

          <van-empty
            v-if="filteredSummits.length === 0"
            description="No summits found"
          />
        </van-list>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.spots-page {
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

.refresh-icon {
  cursor: pointer;
  transition: opacity 0.2s;
}

.refresh-icon:active {
  opacity: 0.6;
}

.spot-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5em;
  font-weight: 500;
}

.spot-time {
  font-size: 0.75em;
  color: #969799;
  font-weight: normal;
}

.spot-details {
  display: flex;
  gap: 0.25em;
  flex-wrap: wrap;
  margin-top: 0.25em;
  margin-bottom: 0.25em;
}

.spot-comment {
  font-size: 0.8125em;
  color: #323233;
  margin-top: 0.25em;
  margin-bottom: 0.25em;
  font-style: italic;
}

.spot-spotter {
  font-size: 0.75em;
  color: #969799;
  margin-top: 0.25em;
}

.callsign-link,
.spotter-link {
  color: #1989fa;
  cursor: pointer;
  text-decoration: underline;
  font-weight: 500;
}

.callsign-link:active,
.spotter-link:active {
  opacity: 0.7;
}

.clickable-tag {
  cursor: pointer;
  transition: opacity 0.2s;
}

.clickable-tag:active {
  opacity: 0.7;
}

.form-container,
.picker-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f7f8fa;
}

.summit-details {
  display: flex;
  gap: 0.25em;
  margin-top: 0.25em;
}

.gps-icon {
  color: #1989fa;
  cursor: pointer;
  transition: opacity 0.2s;
  padding: 0.25em;
}

.gps-icon:active {
  opacity: 0.6;
}

.gps-loading {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
</style>
