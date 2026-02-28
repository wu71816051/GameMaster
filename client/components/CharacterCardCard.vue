<template>
  <div
    class="character-card"
    :class="[getStatusClass(card.status), getBorderClass(card.status)]"
    @click="emitClick"
  >
    <div class="card-header">
      <div class="card-id">#{{ card.id }}</div>
      <div class="status-badge" :class="getStatusClass(card.status)">
        {{ getStatusText(card.status) }}
      </div>
    </div>

    <div class="card-body">
      <h3 class="character-name">{{ card.name }}</h3>

      <div class="character-info">
        <div class="info-row">
          <k-icon icon="user" />
          <span>Owner: {{ formatOwner(card) }}</span>
        </div>

        <div class="info-row">
          <k-icon icon="key" />
          <span>Controller: {{ formatController(card) }}</span>
        </div>

        <div class="info-row">
          <k-icon icon="book" />
          <span>Rule: {{ formatRule(card) }}</span>
        </div>

        <div class="info-row" v-if="card.tags && card.tags.length > 0">
          <k-icon icon="tag" />
          <span>Tags: {{ card.tags.join(', ') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CharacterCardStatus } from '../../src/models/character-card'

interface CharacterCardData {
  id: number
  conversation_id: number
  user_id: number
  controller_id: number
  name: string
  parent_id: number
  rule_system?: string
  data: Record<string, any>
  tags?: string[]
  status: CharacterCardStatus
  created_at?: Date
  updated_at?: Date
}

interface Props {
  card: CharacterCardData
}

defineProps<Props>()

const emit = defineEmits<{
  click: []
}>()

function emitClick() {
  emit('click')
}

function getStatusClass(status: CharacterCardStatus) {
  switch (status) {
    case CharacterCardStatus.ACTIVE:
      return 'status-active'
    case CharacterCardStatus.ARCHIVED:
      return 'status-archived'
    case CharacterCardStatus.DELETED:
      return 'status-deleted'
    default:
      return ''
  }
}

function getBorderClass(status: CharacterCardStatus) {
  switch (status) {
    case CharacterCardStatus.ACTIVE:
      return 'border-active'
    case CharacterCardStatus.ARCHIVED:
      return 'border-archived'
    case CharacterCardStatus.DELETED:
      return 'border-deleted'
    default:
      return ''
  }
}

function getStatusText(status: CharacterCardStatus) {
  switch (status) {
    case CharacterCardStatus.ACTIVE:
      return 'Active'
    case CharacterCardStatus.ARCHIVED:
      return 'Archived'
    case CharacterCardStatus.DELETED:
      return 'Deleted'
    default:
      return 'Unknown'
  }
}

function formatOwner(card: CharacterCardData) {
  return `User ${card.user_id}`
}

function formatController(card: CharacterCardData) {
  if (!card.controller_id) {
    return 'Owner'
  }
  return card.controller_id === card.user_id ? 'Owner' : `User ${card.controller_id}`
}

function formatRule(card: CharacterCardData) {
  return card.rule_system || 'Custom'
}
</script>

<style scoped>
.character-card {
  background: var(--card-bg);
  border: 2px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
  cursor: pointer;
}

.character-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.character-card.border-active {
  border-color: #52c41a;
  background: linear-gradient(135deg, rgba(82, 196, 26, 0.05) 0%, rgba(82, 196, 26, 0.02) 100%);
}

.character-card.border-archived {
  border-color: #1890ff;
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.05) 0%, rgba(24, 144, 255, 0.02) 100%);
}

.character-card.border-deleted {
  border-color: var(--fg3);
  opacity: 0.7;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg1);
  border-bottom: 1px solid var(--border);
}

.card-id {
  font-family: monospace;
  font-size: 12px;
  font-weight: 600;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.status-active {
  background: rgba(82, 196, 26, 0.15);
  color: #52c41a;
}

.status-badge.status-archived {
  background: rgba(24, 144, 255, 0.15);
  color: #1890ff;
}

.status-badge.status-deleted {
  background: rgba(0, 0, 0, 0.08);
  color: var(--fg3);
}

.card-body {
  padding: 16px;
}

.character-name {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--fg1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.character-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--fg2);
}

.info-row .k-icon {
  font-size: 16px;
  color: var(--fg3);
}
</style>
