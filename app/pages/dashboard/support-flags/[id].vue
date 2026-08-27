<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

import { ref, onMounted } from 'vue'
import Loader_small from '@/components/loaders/Loader_small.vue'
import EditQuestionModal from '@/components/questions/EditQuestionModal.vue'

const { $api, $toast } = useNuxtApp()
const route = useRoute()
const router = useRouter()

const id = route.params.id as string

const loading = ref(false)
const fullLoading = ref(false)
const detail = ref<any>(null)

const fetchDetail = async () => {
  loading.value = true
  try {
    const res: any = await $api.get(`/question-feedback/details/${id}`)
    if (res.data.status === 'success') {
      detail.value = res.data.data
    } else {
      detail.value = null
    }
  } catch (err) {
    detail.value = null
  } finally {
    loading.value = false
  }
}

/* address / reopen */
const onAddress = async () => {
  if (!detail.value) return
  const next = detail.value.status === 'addressed' ? 'open' : 'addressed'
  fullLoading.value = true
  try {
    const res: any = await $api.post(`/question-feedback/status/${id}`, { status: next })
    if (res.data.status === 'success') {
      $toast(next === 'addressed' ? 'Marked as addressed.' : 'Reopened.')
      detail.value.status = next
    } else {
      $toast('Failed to update', 'error')
    }
  } catch (err: any) {
    $toast(err?.response?.data?.msg || 'Failed to update', 'error')
  } finally {
    fullLoading.value = false
  }
}

/* inline question edit — reuse the full question editor */
const showEditModal = ref(false)
const openEdit = () => {
  if (!detail.value?.question_id) { $toast('Question not found', 'error'); return }
  showEditModal.value = true
}
const savedCallBack = async () => {
  showEditModal.value = false
  $toast('Question saved.')
  await fetchDetail()
}

onMounted(fetchDetail)
</script>

<template>
  <Loading v-if="fullLoading" />
  <div class="dashwrap">
    <div class="section-hdr">
      <div class="section-hdr-left">
        <p>Review feedback and fix the question</p>
      </div>
      <div class="section-hdr-right">
        <button class="btn btn-outline btn-sm" type="button" @click="router.push('/dashboard/support-flags')">
          ← Back
        </button>
      </div>
    </div>

    <div v-if="loading" class="card" style="padding:24px"><Loader_small /></div>

    <div v-else-if="!detail" class="card" style="padding:24px">Feedback not found.</div>

    <template v-else>
      <!-- feedback card -->
      <div class="card" style="margin-bottom:20px;padding:20px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
          <div>
            <div style="font-size:12px;color:#888;margin-bottom:4px">Feedback</div>
            <p style="font-size:15px;line-height:1.6;margin:0 0 10px">{{ detail.feedback_text || '—' }}</p>
            <div style="font-size:12px;color:#888">
              Reported by <strong>{{ detail.user?.name || '—' }}</strong>
              <span v-if="detail.user?.email">({{ detail.user.email }})</span>
              · {{ detail.create_date }}
              <span v-if="detail.flag_type"> · type: {{ detail.flag_type }}</span>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <span v-if="detail.status === 'addressed'" class="badge badge-green">Addressed</span>
            <span v-else class="badge badge-danger">Open</span>
            <button class="btn btn-sm" :class="detail.status === 'addressed' ? 'btn-outline' : 'btn-success'"
              type="button" @click="onAddress">
              {{ detail.status === 'addressed' ? 'Reopen' : 'Mark addressed' }}
            </button>
          </div>
        </div>
      </div>

      <!-- question card -->
      <div class="card" style="padding:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:12px">
          <div style="font-size:12px;color:#888">
            Question <strong>{{ detail.qid || '—' }}</strong>
          </div>
          <button class="btn btn-primary btn-sm" type="button" @click="openEdit">Edit question</button>
        </div>
        <p style="font-size:15px;line-height:1.6;margin:0">{{ detail.question_stem || '—' }}</p>
      </div>
    </template>

    <EditQuestionModal
      v-if="showEditModal"
      v-model="showEditModal"
      :id="detail?.question_id"
      :activeTab="'1'"
      @saved="savedCallBack"
    />
  </div>
</template>
