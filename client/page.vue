<template>
  <k-layout>
    <div class="gamemaster-page">
      <div class="page-header">
        <h1>Conversations</h1>
        <p class="subtitle">Manage all TRPG conversations</p>
      </div>

      <div v-if="loading" class="loading-state">
        <k-loading />
      </div>

      <div v-else-if="conversations.length === 0" class="empty-state">
        <k-icon icon="database" :size="64" />
        <p>No conversations</p>
        <p class="hint">Use command to create a new conversation</p>
      </div>

      <div v-else class="conversation-grid">
        <ConversationCard
          v-for="conv in conversations"
          :key="conv.id"
          :conv="conv"
          @click="openModal(conv)"
        />
      </div>
    </div>

    <ConversationDetailModal
      :visible="modalVisible"
      :conv="selectedConversation"
      @close="closeModal"
    />
  </k-layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { send } from '@koishijs/client'
import ConversationCard from './components/ConversationCard.vue'
import ConversationDetailModal from './components/ConversationDetailModal.vue'

const loading = ref(true)
const conversations = ref<InstanceType<typeof ConversationCard>['conv'][]>([])
const modalVisible = ref(false)
const selectedConversation = ref<InstanceType<typeof ConversationCard>['conv'] | null>(null)

async function loadConversations() {
  loading.value = true
  try {
    conversations.value = await send('gamemaster/get-conversations')
  } catch (error) {
    console.error('Failed to load conversations:', error)
  } finally {
    loading.value = false
  }
}

function openModal(conv: InstanceType<typeof ConversationCard>['conv']) {
  selectedConversation.value = conv
  modalVisible.value = true
}

function closeModal() {
  modalVisible.value = false
  selectedConversation.value = null
}

onMounted(() => {
  loadConversations()
})
</script>

<style scoped>
.gamemaster-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
}

.subtitle {
  margin: 0;
  color: var(--fg3);
  font-size: 14px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 16px;
  color: var(--fg3);
}

.empty-state .hint {
  font-size: 12px;
  color: var(--fg2);
}

.conversation-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}
</style>
