<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { showToast, showLoadingToast, closeToast } from 'vant'
import { apiClient, type Summit } from '../services/api'
import { formatSotaId, formatWotaId, formatHeight, formatDate } from '../utils/formatters'

const summits = ref<Summit[]>([])
const searchValue = ref('')
const loading = ref(false)
const activeTab = ref(0)

// Load summits on mount
onMounted(async () => {
  await loadSummits()
})

async function loadSummits() {
  loading.value = true
  showLoadingToast({
    message: 'Loading...',
    forbidClick: true,
  })

  try {
    const allSummits = await apiClient.summits.getAll()
    // Filter out WOTA ID 0 (dummy entry)
    summits.value = allSummits.filter(s => s.wotaid !== 0)
    closeToast()
    showToast({
      message: `Loaded ${summits.value.length} summits`,
      duration: 1500,
    })
  } catch (error) {
    closeToast()
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

// Get tallest summits
const tallestSummits = computed(() => {
  return [...summits.value]
    .sort((a, b) => b.height - a.height)
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
    case 2: return tallestSummits.value
    default: return summits.value
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
</script>

<template>
  <div class="summits-page">
    <!-- Navigation Bar -->
    <van-nav-bar title="WOTA Summits" fixed placeholder>
      <template #right>
        <van-icon name="setting-o" size="18" />
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
      <van-tab title="Tallest" />
    </van-tabs>

    <!-- Results count -->
    <div class="results-info">
      <van-notice-bar
        v-if="searchValue"
        :text="`Found ${currentList.length} summit(s)`"
        left-icon="search"
        background="#ecf9ff"
        color="#1989fa"
      />
    </div>

    <!-- Summits List -->
    <van-pull-refresh v-model="loading" @refresh="loadSummits">
      <van-list>
        <van-cell
          v-for="summit in currentList"
          :key="summit.wotaid"
          :title="summit.name"
          is-link
          clickable
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
              <van-tag type="default" size="medium">{{ summit.reference }}</van-tag>
            </div>
            <div class="summit-meta">
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
  padding-bottom: 50px; /* Space for bottom navigation */
}

.results-info {
  margin-bottom: 8px;
}

.summit-details {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 4px;
  margin-bottom: 4px;
}

.summit-meta {
  font-size: 12px;
  color: #969799;
  margin-top: 4px;
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
