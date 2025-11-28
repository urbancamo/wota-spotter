<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { showToast, showLoadingToast, closeToast, showSuccessToast } from 'vant'
import { apiClient, type Alert, type Summit } from '../services/api'
import { formatWotaId, formatSotaId, formatDateTime } from '../utils/formatters'
import { gridRefToLatLon } from '../utils/gridReference'
import { getCurrentPosition, findClosestSummit } from '../utils/geolocation'

const alerts = ref<Alert[]>([])
const loading = ref(false)
const zoomScale = ref(1.0)
const showForm = ref(false)
const gpsLoading = ref(false)

// Summit data for displaying names
const summits = ref<Summit[]>([])

// Form data
const formData = ref({
  summit: null as Summit | null,
  call: '',
  activationDate: '',
  activationTime: '',
  freqmode: '',
  comment: '',
  postedby: ''
})

// Summit search
const summitSearchValue = ref('')
const showSummitPicker = ref(false)

// Date and time pickers
const showDatePicker = ref(false)
const showTimePicker = ref(false)

// Callsign history for suggestions
const callsignHistory = ref<string[]>([])
const postedbyHistory = ref<string[]>([])

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

// Check if an alert is after now and before midnight
function isAlertRecent(datetime: string): boolean {
  const alertDate = new Date(datetime)
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(23, 59, 59, 999) // End of today
  return alertDate >= now && alertDate <= midnight
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

// Load form data from localStorage
function loadFormData() {
  const saved = localStorage.getItem('wota-alert-form')
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
  loadCallsignHistory()
}

// Save form data to localStorage
function saveFormData() {
  localStorage.setItem('wota-alert-form', JSON.stringify(formData.value))
}

// Load callsign history from localStorage
function loadCallsignHistory() {
  const savedCallsigns = localStorage.getItem('wota-alert-callsign-history')
  const savedPostedby = localStorage.getItem('wota-alert-postedby-history')

  if (savedCallsigns) {
    try {
      callsignHistory.value = JSON.parse(savedCallsigns)
    } catch (error) {
      console.error('Error loading callsign history:', error)
    }
  }

  if (savedPostedby) {
    try {
      postedbyHistory.value = JSON.parse(savedPostedby)
    } catch (error) {
      console.error('Error loading postedby history:', error)
    }
  }
}

// Add callsign to history (keep last 3 unique)
function addToCallsignHistory(callsign: string) {
  if (!callsign) return

  callsignHistory.value = callsignHistory.value.filter(c => c !== callsign)
  callsignHistory.value.unshift(callsign)
  callsignHistory.value = callsignHistory.value.slice(0, 3)

  localStorage.setItem('wota-alert-callsign-history', JSON.stringify(callsignHistory.value))
}

// Add postedby to history (keep last 3 unique)
function addToPostedbyHistory(postedby: string) {
  if (!postedby) return

  postedbyHistory.value = postedbyHistory.value.filter(p => p !== postedby)
  postedbyHistory.value.unshift(postedby)
  postedbyHistory.value = postedbyHistory.value.slice(0, 3)

  localStorage.setItem('wota-alert-postedby-history', JSON.stringify(postedbyHistory.value))
}

// Populate callsign from history
function selectCallsignFromHistory(callsign: string) {
  formData.value.call = callsign
  saveFormData()
}

// Populate postedby from history
function selectPostedbyFromHistory(postedby: string) {
  formData.value.postedby = postedby
  saveFormData()
}

// Filter summits based on search
const filteredSummits = computed(() => {
  if (!summitSearchValue.value) {
    return summits.value.slice(0, 50)
  }

  const search = summitSearchValue.value.toLowerCase()
  return summits.value.filter(summit =>
    summit.name.toLowerCase().includes(search) ||
    summit.wotaid.toString().includes(search) ||
    (summit.sotaid && summit.sotaid.toString().includes(search)) ||
    formatWotaId(summit.wotaid).toLowerCase().includes(search) ||
    (summit.sotaid && formatSotaId(summit.sotaid)?.toLowerCase().includes(search))
  ).slice(0, 50)
})

// Get selected summit display text
const selectedSummitText = computed(() => {
  if (formData.value.summit) {
    return formData.value.summit.name
  }
  return ''
})

// Format date for UK display (dd/mm/yyyy)
const displayDate = computed({
  get() {
    if (!formData.value.activationDate) return ''
    const [year, month, day] = formData.value.activationDate.split('-')
    return `${day}/${month}/${year}`
  },
  set(value: string) {
    if (!value) {
      formData.value.activationDate = ''
      return
    }
    // Handle both dd/mm/yyyy and d/m/yyyy formats
    const parts = value.split('/')
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0')
      const month = parts[1].padStart(2, '0')
      const year = parts[2]
      formData.value.activationDate = `${year}-${month}-${day}`
    }
  }
})

function onSummitSelect(summit: Summit) {
  formData.value.summit = summit
  showSummitPicker.value = false
  saveFormData()
}

function onCallsignInput(event: Event) {
  const target = event.target as HTMLInputElement
  formData.value.call = target.value.toUpperCase()
}

function onPostedbyInput(event: Event) {
  const target = event.target as HTMLInputElement
  formData.value.postedby = target.value.toUpperCase()
}

function onDateConfirm(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  formData.value.activationDate = `${year}-${month}-${day}`
  showDatePicker.value = false
  saveFormData()
}

function onTimeConfirm(value: string) {
  formData.value.activationTime = value
  showTimePicker.value = false
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

function getTomorrowDate() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const year = tomorrow.getFullYear()
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
  const day = String(tomorrow.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addFreqModeShortcut(shortcut: string) {
  if (!formData.value.freqmode) {
    formData.value.freqmode = shortcut
  } else {
    // Parse existing values and check if shortcut already exists
    const existingValues = formData.value.freqmode.split(',').map(v => v.trim())

    // Only add if not already in the list
    if (!existingValues.includes(shortcut)) {
      formData.value.freqmode += ', ' + shortcut
    }
  }
  saveFormData()
}

function openForm() {
  loadFormData()
  // Set default date and time to tomorrow at 10:00 UTC
  if (!formData.value.activationDate) {
    formData.value.activationDate = getTomorrowDate()
  }
  if (!formData.value.activationTime) {
    formData.value.activationTime = '10:00'
  }
  // Clear frequency & mode field
  formData.value.freqmode = ''
  showForm.value = true
}

async function submitAlert() {
  // Validate form
  if (!formData.value.summit) {
    showToast({ message: 'Please select a summit', type: 'fail' })
    return
  }
  if (!formData.value.call) {
    showToast({ message: 'Please enter a callsign', type: 'fail' })
    return
  }
  if (!formData.value.activationDate) {
    showToast({ message: 'Please select date', type: 'fail' })
    return
  }
  if (!formData.value.activationTime) {
    showToast({ message: 'Please select time', type: 'fail' })
    return
  }
  if (!formData.value.freqmode) {
    showToast({ message: 'Please enter frequency & mode', type: 'fail' })
    return
  }
  if (!formData.value.postedby) {
    showToast({ message: 'Please enter your callsign', type: 'fail' })
    return
  }

  showLoadingToast({
    message: 'Creating alert...',
    forbidClick: true,
  })

  try {
    // Combine date and time to create datetime
    const datetime = new Date(`${formData.value.activationDate}T${formData.value.activationTime}:00Z`)

    await apiClient.alerts.create({
      call: formData.value.call,
      wotaid: formData.value.summit.wotaid,
      freqmode: formData.value.freqmode,
      comment: formData.value.comment,
      postedby: formData.value.postedby,
      datetime
    })

    closeToast()
    showSuccessToast('Alert created successfully')

    // Add callsigns to history
    addToCallsignHistory(formData.value.call)
    addToPostedbyHistory(formData.value.postedby)

    // Save form data
    saveFormData()

    // Reload alerts
    await loadAlerts()

    // Close form
    showForm.value = false

    // Scroll to top to show the new alert
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    closeToast()
    showToast({
      message: 'Failed to create alert',
      type: 'fail',
    })
    console.error('Error creating alert:', error)
  }
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
          <van-icon name="add-o" size="18" @click="openForm" class="add-icon" />
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

    <!-- Create Alert Form Popup -->
    <van-popup v-model:show="showForm" position="bottom" :style="{ height: '85%' }">
      <div class="form-container">
        <van-nav-bar
          title="Create Alert"
          left-text="Cancel"
          right-text="Submit"
          @click-left="showForm = false"
          @click-right="submitAlert"
        />

        <van-form @submit="submitAlert">
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

          <!-- Summit References Field -->
          <van-field
            v-if="formData.summit"
            label="References"
            readonly
          >
            <template #input>
              <div class="summit-references">
                <van-tag type="primary" size="medium">
                  {{ formatWotaId(formData.summit.wotaid) }}
                </van-tag>
                <van-tag v-if="formData.summit.sotaid" type="success" size="medium">
                  {{ formatSotaId(formData.summit.sotaid) }}
                </van-tag>
              </div>
            </template>
          </van-field>

          <!-- Date Field -->
          <van-field
            v-model="displayDate"
            name="date"
            label="Date"
            placeholder="dd/mm/yyyy"
            @blur="saveFormData"
            :rules="[{ required: true, message: 'Please select date' }]"
          >
            <template #input>
              <input
                type="text"
                v-model="displayDate"
                placeholder="dd/mm/yyyy"
                @blur="saveFormData"
                class="date-input"
              />
            </template>
          </van-field>

          <!-- Time Field -->
          <van-field
            v-model="formData.activationTime"
            name="time"
            label="Time (UTC)"
            placeholder="Select activation time"
            :rules="[{ required: true, message: 'Please select time' }]"
          >
            <template #input>
              <input
                type="time"
                v-model="formData.activationTime"
                @change="saveFormData"
                class="time-input"
              />
            </template>
          </van-field>

          <!-- Callsign Field -->
          <van-field
            v-model="formData.call"
            name="call"
            label="Callsign"
            placeholder="e.g., M0ABC/P"
            @focus="formData.call = ''"
            @input="onCallsignInput"
            @blur="saveFormData"
            :rules="[{ required: true, message: 'Please enter callsign' }]"
          />

          <!-- Callsign History Suggestions -->
          <van-field
            v-if="callsignHistory.length > 0"
            label="History"
            readonly
            class="history-field"
          >
            <template #input>
              <div class="history-tags">
                <van-tag
                  v-for="(callsign, index) in callsignHistory"
                  :key="callsign"
                  :type="index === 0 ? 'success' : index === 1 ? 'warning' : 'danger'"
                  size="medium"
                  class="history-tag"
                  @click="selectCallsignFromHistory(callsign)"
                >
                  {{ callsign }}
                </van-tag>
              </div>
            </template>
          </van-field>

          <!-- Frequency & Mode Field -->
          <van-field
            v-model="formData.freqmode"
            name="freqmode"
            label="Freq & Mode"
            placeholder="e.g., 145.5-fm"
            @blur="saveFormData"
            :rules="[{ required: true, message: 'Please enter frequency & mode' }]"
          />

          <!-- Frequency & Mode Shortcuts -->
          <van-field
            label="Shortcuts"
            readonly
            class="shortcuts-field"
          >
            <template #input>
              <div class="shortcut-buttons">
                <van-button
                  size="small"
                  type="primary"
                  plain
                  @click="addFreqModeShortcut('145.5-fm')"
                  class="shortcut-btn"
                >
                  145.5-fm
                </van-button>
                <van-button
                  size="small"
                  type="primary"
                  plain
                  @click="addFreqModeShortcut('433.5-fm')"
                  class="shortcut-btn"
                >
                  433.5-fm
                </van-button>
                <van-button
                  size="small"
                  type="success"
                  plain
                  @click="addFreqModeShortcut('144.3-ssb')"
                  class="shortcut-btn"
                >
                  144.3-ssb
                </van-button>
                <van-button
                  size="small"
                  type="warning"
                  plain
                  @click="addFreqModeShortcut('144.05-cw')"
                  class="shortcut-btn"
                >
                  144.05-cw
                </van-button>
                <van-button
                  size="small"
                  type="success"
                  plain
                  @click="addFreqModeShortcut('432.2-ssb')"
                  class="shortcut-btn"
                >
                  432.2-ssb
                </van-button>
                <van-button
                  size="small"
                  type="warning"
                  plain
                  @click="addFreqModeShortcut('432.05-cw')"
                  class="shortcut-btn"
                >
                  432.05-cw
                </van-button>
                <van-button
                  size="small"
                  type="primary"
                  plain
                  @click="addFreqModeShortcut('70.45-fm')"
                  class="shortcut-btn"
                >
                  70.45-fm
                </van-button>
                <van-button
                  size="small"
                  type="primary"
                  plain
                  @click="addFreqModeShortcut('51.51-fm')"
                  class="shortcut-btn"
                >
                  51.51-fm
                </van-button>
              </div>
            </template>
          </van-field>

          <!-- Comment Field -->
          <van-field
            v-model="formData.comment"
            name="comment"
            label="Comment"
            placeholder="Optional comment"
            @blur="saveFormData"
          />

          <!-- Posted By Field -->
          <van-field
            v-model="formData.postedby"
            name="postedby"
            label="Your Call"
            placeholder="e.g., M0XYZ"
            @focus="formData.postedby = ''"
            @input="onPostedbyInput"
            @blur="saveFormData"
            :rules="[{ required: true, message: 'Please enter your callsign' }]"
          />

          <!-- Posted By History Suggestions -->
          <van-field
            v-if="postedbyHistory.length > 0"
            label="History"
            readonly
            class="history-field"
          >
            <template #input>
              <div class="history-tags">
                <van-tag
                  v-for="(postedby, index) in postedbyHistory"
                  :key="postedby"
                  :type="index === 0 ? 'success' : index === 1 ? 'warning' : 'danger'"
                  size="medium"
                  class="history-tag"
                  @click="selectPostedbyFromHistory(postedby)"
                >
                  {{ postedby }}
                </van-tag>
              </div>
            </template>
          </van-field>
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

    <!-- Date Picker Popup -->
    <van-popup v-model:show="showDatePicker" position="bottom" :style="{ height: '50%' }">
      <van-date-picker
        title="Select Date"
        :min-date="new Date()"
        @confirm="onDateConfirm"
        @cancel="showDatePicker = false"
      />
    </van-popup>

    <!-- Time Picker Popup -->
    <van-popup v-model:show="showTimePicker" position="bottom" :style="{ height: '50%' }">
      <van-time-picker
        title="Select Time (UTC)"
        :model-value="formData.activationTime"
        @confirm="onTimeConfirm"
        @cancel="showTimePicker = false"
      />
    </van-popup>
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

.form-container,
.picker-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f7f8fa;
  overflow-y: auto;
  padding-bottom: 100px;
}

.summit-details {
  display: flex;
  gap: 0.25em;
  margin-top: 0.25em;
}

.summit-references {
  display: flex;
  gap: 0.25em;
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

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.history-field :deep(.van-field__label) {
  color: #969799;
}

.history-tags {
  display: flex;
  gap: 0.5em;
  flex-wrap: wrap;
}

.history-tag {
  cursor: pointer;
  transition: opacity 0.2s;
}

.history-tag:active {
  opacity: 0.7;
}

.date-input,
.time-input {
  width: 100%;
  padding: 0.5em;
  font-size: 0.875em;
  border: 1px solid #ebedf0;
  border-radius: 4px;
  background-color: #fff;
  color: #323233;
  font-family: inherit;
}

.date-input:focus,
.time-input:focus {
  outline: none;
  border-color: #1989fa;
}

.shortcuts-field :deep(.van-field__label) {
  color: #969799;
}

.shortcut-buttons {
  display: flex;
  gap: 0.375em;
  flex-wrap: wrap;
}

.shortcut-btn {
  font-size: 0.75em;
  padding: 0.25em 0.5em;
  min-width: auto;
}
</style>