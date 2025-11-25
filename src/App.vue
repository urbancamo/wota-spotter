<script setup lang="ts">
import { ref } from 'vue'
import SummitsList from './components/SummitsList.vue'
import SpotsList from './components/SpotsList.vue'
import AlertsList from './components/AlertsList.vue'
import type { Summit } from './services/api'

const activePage = ref(0) // Default to Spots page
const preselectedSummit = ref<Summit | null>(null)
const spotListKey = ref(0)

function onCreateSpotForSummit(summit: Summit) {
  // Set the preselected summit
  preselectedSummit.value = summit
  // Increment key to force SpotsList to recreate and pick up the new summit
  spotListKey.value++
  // Switch to Spots page
  activePage.value = 0
}

function onSpotFormOpened() {
  // Clear the preselected summit after it's been used
  preselectedSummit.value = null
}
</script>

<template>
  <div class="app-container">
    <!-- Page Content -->
    <div class="page-content">
      <SpotsList
        v-if="activePage === 0"
        :key="spotListKey"
        :preselected-summit="preselectedSummit"
        @spot-form-opened="onSpotFormOpened"
      />
      <AlertsList
        v-if="activePage === 1"
      />
      <SummitsList
        v-if="activePage === 2"
        @create-spot="onCreateSpotForSummit"
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
