<script setup lang="ts">
import { ref } from 'vue'
import SummitsList from './components/SummitsList.vue'
import SpotsList from './components/SpotsList.vue'
import AlertsList from './components/AlertsList.vue'
import type { Summit } from './services/api'

const activePage = ref(0) // Default to Spots page
const preselectedSpotSummit = ref<Summit | null>(null)
const preselectedAlertSummit = ref<Summit | null>(null)
const spotListKey = ref(0)
const alertListKey = ref(0)

function onCreateSpotForSummit(summit: Summit) {
  // Set the preselected summit
  preselectedSpotSummit.value = summit
  // Increment key to force SpotsList to recreate and pick up the new summit
  spotListKey.value++
  // Switch to Spots page
  activePage.value = 0
}

function onCreateAlertForSummit(summit: Summit) {
  // Set the preselected summit
  preselectedAlertSummit.value = summit
  // Increment key to force AlertsList to recreate and pick up the new summit
  alertListKey.value++
  // Switch to Alerts page
  activePage.value = 1
}

function onSpotFormOpened() {
  // Clear the preselected summit after it's been used
  preselectedSpotSummit.value = null
}

function onAlertFormOpened() {
  // Clear the preselected summit after it's been used
  preselectedAlertSummit.value = null
}
</script>

<template>
  <div class="app-container">
    <!-- Page Content -->
    <div class="page-content">
      <SpotsList
        v-if="activePage === 0"
        :key="spotListKey"
        :preselected-summit="preselectedSpotSummit"
        @spot-form-opened="onSpotFormOpened"
      />
      <AlertsList
        v-if="activePage === 1"
        :key="alertListKey"
        :preselected-summit="preselectedAlertSummit"
        @alert-form-opened="onAlertFormOpened"
      />
      <SummitsList
        v-if="activePage === 2"
        @create-spot="onCreateSpotForSummit"
        @create-alert="onCreateAlertForSummit"
      />
    </div>

    <!-- Bottom Navigation -->
    <van-tabbar v-model="activePage" fixed placeholder>
      <van-tabbar-item icon="chat-o">
        Spots
      </van-tabbar-item>
      <van-tabbar-item icon="warning-o">
        Alerts
      </van-tabbar-item>
      <van-tabbar-item icon="location-o">
        Summits
      </van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
}

.page-content {
  min-height: 100vh;
}
</style>
