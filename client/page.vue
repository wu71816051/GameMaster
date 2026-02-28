<template>
  <k-layout>
    <div class="gamemaster-page">
      <!-- Top navigation bar -->
      <TabNavbar v-model="activeTab" :tabs="tabs" />

      <div class="page-content">
        <div v-if="activeTab === 'conversations'">
        <div v-if="activeTab === 'conversations'">
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

        <div v-else-if="activeTab === 'character_card'">
          <div class="page-header">
            <h1>Character Cards</h1>
            <p class="subtitle">Manage your character cards</p>
          </div>

          <div v-if="loading" class="loading-state">
            <k-loading />
          </div>

          <div v-else-if="characterCards.length === 0" class="empty-state">
            <k-icon icon="card-outline" :size="64" />
            <p>No character cards</p>
            <p class="hint">Use command to create a new character card</p>
          </div>

          <div v-else class="character-card-grid">
            <CharacterCardCard
              v-for="card in characterCards"
              :key="card.id"
              :card="card"
              @click="openCharacterCardModal(card)"
            />
          </div>
        </div>
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
import { ref, onMounted, computed, watch } from 'vue'
import { send, receive } from '@koishijs/client'
import ConversationCard from './components/ConversationCard.vue'
import ConversationDetailModal from './components/ConversationDetailModal.vue'
import CharacterCardCard from './components/CharacterCardCard.vue'
import TabNavbar from './components/TabNavbar.vue'

const activeTab = ref<'conversations' | 'character_card'>('conversations')
const loading = ref(true)
const conversations = ref<InstanceType<typeof ConversationCard>['conv'][]>([])
const characterCards = ref<InstanceType<typeof CharacterCardCard>['card'][]>([])
const modalVisible = ref(false)
const selectedConversation = ref<InstanceType<typeof ConversationCard>['conv'] | null>(null)

const tabs = computed(() => [
  {
    value: 'conversations',
    label: 'Conversations',
    icon: 'chat-bubbles-outline',
  },
  {
    value: 'character_card',
    label: 'Character Cards',
    icon: 'person-outline',
  },
])

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

async function loadCharacterCards() {
  loading.value = true
  try {
    characterCards.value = await send('gamemaster/get-character-cards')
  } catch (error) {
    console.error('Failed to load character cards:', error)
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

function openCharacterCardModal(card: InstanceType<typeof CharacterCardCard>['card']) {
  // TODO: Implement character card detail modal
  console.log('Open character card:', card)
}

// Watch for tab changes
function handleTabChange() {
  loading.value = true

  if (activeTab.value === 'conversations') {
    loadConversations()
  } else if (activeTab.value === 'character_card') {
    loadCharacterCards()
  }
}

onMounted(() => {
  loadConversations()

  // Listen for conversation status changes to refresh the list
  receive('gamemaster/conversation-status-changed', (conversation) => {
    const index = conversations.value.findIndex(c => c.id === conversation.id)
    if (index !== -1) {
      conversations.value[index] = conversation
    }
  })
})

// Watch for tab changes
watch(activeTab, handleTabChange)
</script>

<style scoped>
.gamemaster-page {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.page-content {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
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

.conversation-grid,
.character-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}
</style>
