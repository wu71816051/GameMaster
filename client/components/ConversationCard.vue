<template>
  <div
    class="conversation-card"
    :class="[getStatusClass(conv.status), getBorderClass(conv.status)]"
    @click="emitClick"
  >
    <div class="card-header">
      <div class="conversation-id">#{{ conv.id }}</div>
      <div class="status-badge" :class="getStatusClass(conv.status)">
        {{ getStatusText(conv.status) }}
      </div>
    </div>

    <div class="card-body">
      <h3 class="conversation-name">{{ conv.name }}</h3>

      <div class="conversation-info">
        <div class="info-row">
          <k-icon icon="user" />
          <span>Creator: {{ formatCreator(conv) }}</span>
        </div>

        <div class="info-row">
          <k-icon icon="clock" />
          <span>Created: {{ formatDate(conv.created_at) }}</span>
        </div>

        <div class="info-row">
          <k-icon icon="refresh-cw" />
          <span>Updated: {{ formatDate(conv.updated_at) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ConversationStatus } from '../../src/core/models/conversation'

interface ChannelInfo {
  platform: string
  guildId: string
  channelId: string
}

interface ConversationCard {
  id: number
  name: string
  creator_id: number
  creator_name?: string
  creator_pid?: string
  creator_platform?: string
  channels: ChannelInfo[]
  status: ConversationStatus
  created_at: Date
  updated_at: Date
  metadata?: Record<string, any>
  member_count?: number
}

interface Props {
  conv: ConversationCard
}

defineProps<Props>()

const emit = defineEmits<{
  click: []
}>()

function emitClick() {
  emit('click')
}

function getStatusClass(status: ConversationStatus) {
  switch (status) {
    case ConversationStatus.ACTIVE:
      return 'status-active'
    case ConversationStatus.PAUSED:
      return 'status-paused'
    case ConversationStatus.ENDED:
      return 'status-ended'
    default:
      return ''
  }
}

function getBorderClass(status: ConversationStatus) {
  switch (status) {
    case ConversationStatus.ACTIVE:
      return 'border-active'
    case ConversationStatus.PAUSED:
      return 'border-paused'
    case ConversationStatus.ENDED:
      return 'border-ended'
    default:
      return ''
  }
}

function getStatusText(status: ConversationStatus) {
  switch (status) {
    case ConversationStatus.ACTIVE:
      return 'Active'
    case ConversationStatus.PAUSED:
      return 'Paused'
    case ConversationStatus.ENDED:
      return 'Ended'
    default:
      return 'Unknown'
  }
}

function formatDate(date: Date | string) {
  const d = new Date(date)
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCreator(conv: ConversationCard) {
  if (conv.creator_pid && conv.creator_platform) {
    return `${conv.creator_pid} (${conv.creator_platform})`
  }
  return conv.creator_name || `User ${conv.creator_id}`
}
</script>

<style scoped>
.conversation-card {
  background: var(--card-bg);
  border: 2px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
  cursor: pointer;
}

.conversation-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.conversation-card.border-active {
  border-color: #52c41a;
  background: linear-gradient(135deg, rgba(82, 196, 26, 0.05) 0%, rgba(82, 196, 26, 0.02) 100%);
}

.conversation-card.border-paused {
  border-color: #faad14;
  background: linear-gradient(135deg, rgba(250, 173, 20, 0.05) 0%, rgba(250, 173, 20, 0.02) 100%);
}

.conversation-card.border-ended {
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

.conversation-id {
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

.status-badge.status-paused {
  background: rgba(250, 173, 20, 0.15);
  color: #faad14;
}

.status-badge.status-ended {
  background: rgba(0, 0, 0, 0.08);
  color: var(--fg3);
}

.card-body {
  padding: 16px;
}

.conversation-name {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--fg1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-info {
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
