<template>
  <div v-if="visible" class="modal-overlay" @click="closeModal">
    <div class="modal-container" @click.stop>
      <!-- Close button -->
      <div class="modal-close" @click="closeModal">
        <k-icon icon="x" />
      </div>

      <!-- Upper half: Conversation info -->
      <div class="modal-header">
        <div class="header-section">
          <h2 class="conv-name">{{ conv?.name }}</h2>
          <div class="conv-meta">
            <span class="conv-id">#{{ conv?.id }}</span>
            <span class="status-badge" :class="getStatusClass(conv?.status)">
              {{ getStatusText(conv?.status) }}
            </span>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <k-icon icon="user" />
            <span>Creator: {{ formatCreator(conv) }}</span>
          </div>
          <div class="info-item">
            <k-icon icon="clock" />
            <span>Created: {{ formatDate(conv?.created_at) }}</span>
          </div>
          <div class="info-item">
            <k-icon icon="refresh-cw" />
            <span>Updated: {{ formatDate(conv?.updated_at) }}</span>
          </div>
          <div class="info-item">
            <k-icon icon="users" />
            <span>Members: {{ members.length }}</span>
          </div>
        </div>
      </div>

      <!-- Lower half: Members (left) and Messages (right) -->
      <div class="modal-body">
        <!-- Left: Members list -->
        <div class="members-section">
          <div class="section-title">
            <k-icon icon="users" />
            <span>Members</span>
          </div>
          <div v-if="loadingMembers" class="loading-state">
            <k-loading />
          </div>
          <div v-else-if="members.length === 0" class="empty-state">
            <p>No members</p>
          </div>
          <div v-else class="members-list">
            <div
              v-for="member in members"
              :key="member.user_id"
              class="member-item"
            >
              <span class="member-name">
                {{ member.user_name || `User ${member.user_id}` }}
                <template v-if="member.pid && member.platform">
                  <span class="member-name-extra">({{ member.pid }}, {{ member.platform }})</span>
                </template>
              </span>
              <span class="member-role" :class="'role-' + member.role">
                {{ member.role }}
              </span>
            </div>
          </div>
        </div>

        <!-- Right: Messages list -->
        <div class="messages-section">
          <div class="section-title">
            <k-icon icon="message-circle" />
            <span>Messages</span>
          </div>
          <div v-if="loadingMessages" class="loading-state">
            <k-loading />
          </div>
          <div v-else-if="messages.length === 0" class="empty-state">
            <p>No messages</p>
          </div>
          <div v-else class="messages-list">
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="message-item"
            >
              <div class="message-header">
                <div class="message-user-section">
                  <span class="message-user">{{ msg.user_name || `User ${msg.user_id}` }}</span>
                  <span class="message-type">{{ getContentTypeText(msg.content_type) }}</span>
                </div>
                <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
              </div>
              <div class="message-content">{{ msg.content }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { send } from '@koishijs/client'
import { ConversationStatus } from '../../src/core/models/conversation'
import { ContentType } from '../../src/core/models/conversation-message'

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

interface Member {
  id?: number
  conversation_id: number
  user_id: number
  role: string
  joined_at: Date
  user_name?: string
  pid?: string
  platform?: string
}

interface Message {
  id?: number
  conversation_id: number
  user_id: number
  content: string
  content_type: string
  timestamp: Date
  user_name?: string
}

interface Props {
  visible: boolean
  conv: ConversationCard | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const members = ref<Member[]>([])
const messages = ref<Message[]>([])
const loadingMembers = ref(false)
const loadingMessages = ref(false)

// Load data when modal opens
watch(() => props.visible, async (isVisible) => {
  if (isVisible && props.conv) {
    await loadConversationData()
  } else {
    // Clear data when modal closes
    members.value = []
    messages.value = []
  }
})

async function loadConversationData() {
  if (!props.conv) return

  // Load members and messages in parallel
  await Promise.all([
    loadMembers(),
    loadMessages()
  ])
}

async function loadMembers() {
  if (!props.conv) return

  loadingMembers.value = true
  try {
    members.value = await send('gamemaster/get-conversation-members', props.conv.id)
  } catch (error) {
    console.error('Failed to load members:', error)
  } finally {
    loadingMembers.value = false
  }
}

async function loadMessages() {
  if (!props.conv) return

  loadingMessages.value = true
  try {
    messages.value = await send('gamemaster/get-conversation-messages', props.conv.id)
  } catch (error) {
    console.error('Failed to load messages:', error)
  } finally {
    loadingMessages.value = false
  }
}

function closeModal() {
  emit('close')
}

function getStatusClass(status?: ConversationStatus) {
  if (!status) return ''
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

function getStatusText(status?: ConversationStatus) {
  if (!status) return ''
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

function formatDate(date: Date | string | undefined) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTime(date: Date | string | undefined) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getContentTypeText(contentType: string | undefined) {
  if (!contentType) return ''
  switch (contentType) {
    case 'roleplay':
      return 'RP'
    case 'out_of_character':
      return 'OOC'
    case 'check':
      return 'CHECK'
    case 'command':
      return 'CMD'
    case 'other':
      return 'OTHER'
    default:
      return ''
  }
}

function formatCreator(conv?: ConversationCard) {
  if (!conv) return ''
  if (conv.creator_pid && conv.creator_platform) {
    return `${conv.creator_pid} (${conv.creator_platform})`
  }
  return conv.creator_name || `User ${conv.creator_id}`
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-container {
  background: var(--card-bg);
  border-radius: 16px;
  width: 90vw;
  max-width: 1000px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  position: relative;
  overflow: hidden;
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  z-index: 10;
}

.modal-close:hover {
  background: var(--bg2);
}

/* Upper half: Conversation info */
.modal-header {
  padding: 24px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.header-section {
  margin-bottom: 20px;
}

.conv-name {
  margin: 0 0 12px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--fg1);
}

.conv-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.conv-id {
  font-family: monospace;
  font-size: 14px;
  color: var(--fg3);
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

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--fg2);
}

.info-item .k-icon {
  font-size: 16px;
  color: var(--fg3);
}

/* Lower half: Members and Messages */
.modal-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.members-section,
.messages-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow: hidden;
}

.members-section {
  border-right: 1px solid var(--border);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--fg1);
  margin-bottom: 16px;
  flex-shrink: 0;
}

.loading-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--fg3);
}

/* Members list */
.members-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.member-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border);
  gap: 8px;
}

.member-item:last-child {
  border-bottom: none;
}

.member-name {
  font-size: 13px;
  color: var(--fg1);
  display: flex;
  align-items: center;
  gap: 6px;
}

.member-name-extra {
  font-size: 11px;
  color: var(--fg3);
}

.member-role {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  flex-shrink: 0;
}

.member-role.role-admin {
  background: rgba(82, 196, 26, 0.15);
  color: #52c41a;
}

.member-role.role-member {
  background: rgba(0, 0, 0, 0.05);
  color: var(--fg3);
}

/* Messages list */
.messages-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.message-item {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.message-item:last-child {
  border-bottom: none;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  gap: 8px;
}

.message-user-section {
  display: flex;
  align-items: center;
  gap: 6px;
}

.message-user {
  font-size: 12px;
  font-weight: 600;
  color: var(--primary);
}

.message-type {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  background: var(--bg2);
  color: var(--fg3);
}

.message-time {
  font-size: 11px;
  color: var(--fg3);
}

.message-content {
  font-size: 13px;
  color: var(--fg2);
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Scrollbar styling */
.members-list::-webkit-scrollbar,
.messages-list::-webkit-scrollbar {
  width: 6px;
}

.members-list::-webkit-scrollbar-track,
.messages-list::-webkit-scrollbar-track {
  background: var(--bg1);
}

.members-list::-webkit-scrollbar-thumb,
.messages-list::-webkit-scrollbar-thumb {
  background: var(--fg3);
  border-radius: 3px;
}

.members-list::-webkit-scrollbar-thumb:hover,
.messages-list::-webkit-scrollbar-thumb:hover {
  background: var(--fg2);
}
</style>
