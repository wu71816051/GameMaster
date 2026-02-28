<template>
  <div class="top-navbar">
    <div class="navbar-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="tab-button"
        :class="{ active: modelValue === tab.value }"
        @click="handleTabClick(tab.value)"
      >
        <k-icon :icon="tab.icon" :size="20" />
        <span>{{ tab.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineEmits, defineProps } from 'vue'

interface Tab {
  value: string
  label: string
  icon: string
}

const props = defineProps<{
  modelValue: string
  tabs: Tab[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function handleTabClick(value: string) {
  emit('update:modelValue', value)
}
</script>

<style scoped>
.top-navbar {
  background: var(--bg2);
  border-bottom: 1px solid var(--bg3);
  padding: 0 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 10;
}

.navbar-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--bg3);
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--fg2);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  min-width: 150px;
  justify-content: center;
}

.tab-button:hover {
  color: var(--fg1);
  background: var(--bg3);
}

.tab-button.active {
  color: var(--fg1);
  border-bottom-color: var(--primary);
  background: var(--bg2);
}

.tab-button k-icon {
  opacity: 0.7;
}

.tab-button.active k-icon,
.tab-button:hover k-icon {
  opacity: 1;
}
</style>
