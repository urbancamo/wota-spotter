<script setup lang="ts">
import { ref } from 'vue'
import SummitsList from './components/SummitsList.vue'
import SpotsList from './components/SpotsList.vue'

const activePage = ref(0) // Default to Spots page
</script>

<template>
  <div class="app-container">
    <!-- Page Content -->
    <div class="page-content">
      <SpotsList v-if="activePage === 0" />
      <SummitsList v-if="activePage === 1" />
    </div>

    <!-- Bottom Navigation -->
    <van-tabbar v-model="activePage" fixed placeholder>
      <van-tabbar-item icon="chat-o">
        Spots
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
