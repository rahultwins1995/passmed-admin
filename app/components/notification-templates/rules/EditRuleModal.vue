<script setup lang="ts">
import Loading from '@/components/loaders/Loading.vue'
import { ref, reactive, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  detailId: number | string | null
}>()

const emit = defineEmits(['update:modelValue', 'saved'])

const { $toast, $api } = useNuxtApp()

const closeModal = () => emit('update:modelValue', false)

const fullLoading = ref<boolean>(false)

// Real notification templates for the Email Template selector.
const templates = ref<any[]>([])
const fetchTemplates = async () => {
  try {
    const res: any = await $api.post('/notification-templates', { page: 1, limit: 200 })
    if (res?.data?.status === 'success') templates.value = res?.data?.data ?? []
  } catch { templates.value = [] }
}

// Institutions for the "Specific institutions" audience multi-select.
const institutions = ref<any[]>([])
const fetchInstitutions = async () => {
  try {
    const res: any = await $api.post('/institutions', { page: 1, limit: 500 })
    if (res?.data?.status === 'success') institutions.value = res?.data?.data ?? []
  } catch { institutions.value = [] }
}

const addFromModel = reactive<any>({
  name: '',
  type_trigger: 'milestone-question-count',
  milestone_question_count: [],
  before_exam_days: [],
  study_streak_days: [],
  score_percent: '40',
  user_inactivity_days: 7,
  subscription_event: 'started',
  custom_schedule: '',
  delivery_email: 1,
  delivery_in_app: 0,
  email_template: 'auto-generate',
  audience: 'all',
  audience_institution_ids: [],
  status: 1,
})

// Fetch the full rule and prefill the form.
const hydrate = async () => {
  if (!props.detailId) return
  fullLoading.value = true
  try {
    const res: any = await $api.get(`/notification-rules/show/${props.detailId}`)
    const d = res?.data?.data
    if (res?.data?.status === 'success' && d) {
      addFromModel.name = d.name ?? ''
      addFromModel.type_trigger = d.type_trigger ?? 'milestone-question-count'
      addFromModel.milestone_question_count = Array.isArray(d.milestone_question_count) ? d.milestone_question_count.map(Number) : []
      addFromModel.before_exam_days = Array.isArray(d.before_exam_days) ? d.before_exam_days.map(Number) : []
      addFromModel.study_streak_days = Array.isArray(d.study_streak_days) ? d.study_streak_days.map(Number) : []
      addFromModel.score_percent = d.score_percent ?? '40'
      addFromModel.user_inactivity_days = d.user_inactivity_days ?? 7
      addFromModel.subscription_event = d.subscription_event ?? 'started'
      addFromModel.custom_schedule = d.custom_schedule ?? ''
      addFromModel.delivery_email = Number(d.delivery_email ?? 1)
      addFromModel.delivery_in_app = Number(d.delivery_in_app ?? 0)
      addFromModel.email_template = d.email_template ?? 'auto-generate'
      addFromModel.audience = d.audience ?? 'all'
      addFromModel.audience_institution_ids = Array.isArray(d.audience_institution_ids) ? d.audience_institution_ids.map(Number) : []
      addFromModel.status = Number(d.status ?? 1)
    } else {
      $toast(res?.data?.msg || 'Failed to load rule', 'error')
    }
  } catch (err: any) {
    $toast(err?.response?.data?.msg || 'Failed to load rule', 'error')
  } finally {
    fullLoading.value = false
  }
}

const submitForm = async (e: any) => {
  e.preventDefault()
  if (!addFromModel.name.trim()) {
    $toast('name required', 'error')
    return
  }
  fullLoading.value = true
  try {
    const res: any = await $api.post(`/notification-rules/update/${props.detailId}`, addFromModel)
    if (res.data.status === 'success') {
      $toast('Rule updated successfully')
      emit('saved', true)
      closeModal()
    } else {
      $toast(res?.data?.msg || 'Failed to save.', 'error')
    }
  } catch (err: any) {
    $toast(err?.response?.data?.msg || err?.response?.data?.message || 'Failed to save.', 'error')
  } finally {
    fullLoading.value = false
  }
}

watch(() => props.modelValue, (val) => {
  if (val) { fetchTemplates(); fetchInstitutions(); hydrate() }
})
</script>

<template>
  <Loading v-if="fullLoading" />
  <div v-if="modelValue" class="overlay overlay-top open newRuleOverlay" @click.self="closeModal">
    <div class="drawer" style="width: 520px; max-width: 96vw">
      <div class="drawer-header">
        <div class="headertitlewrap">
          <div class="titlewrap">Edit Notification Rule</div>
          <div class="subtitlewrap">Update automated rule</div>
        </div>
        <button class="drawer-close" type="button" @click="closeModal">
          <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="13">
            <line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="drawer-body">
        <div class="form-row">
          <label class="form-label">Rule Name</label>
          <input class="form-input nrName" placeholder="e.g. Streak Milestone — 30 days" type="text" v-model="addFromModel.name" />
        </div>
        <div class="form-row">
          <label class="form-label">Trigger</label>
          <select class="form-input form-select nrTrigger" v-model="addFromModel.type_trigger">
            <option value="milestone-question-count">Milestone reached (question count)</option>
            <option value="before-exam-days">Exam date approaching</option>
            <option value="score-percent">Score drops below threshold</option>
            <option value="user-inactivity-days">User inactive for N days</option>
            <option value="study-streak-days">Study streak reached</option>
          </select>
        </div>

        <div v-if="addFromModel.type_trigger === 'milestone-question-count'" class="form-row nrFields-milestone">
          <label class="form-label">Question Count Threshold</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <label v-for="n in [100,500,1000,2500]" :key="n" 
            style="display:flex;align-items:center;gap:6px;font-size:0.82rem">
              <input type="checkbox" style="accent-color:var(--teal)" 
              :value="n" 
              v-model="addFromModel.milestone_question_count" />
              {{ n.toLocaleString() }} questions
            </label>
          </div>
        </div>

        <div v-if="addFromModel.type_trigger === 'before-exam-days'" class="form-row nrFields-before-exam-days">
          <label class="form-label">Days Before Exam</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <label v-for="n in [7,3,1]" :key="n" style="display:flex;align-items:center;gap:6px;font-size:0.82rem">
              <input type="checkbox" style="accent-color:var(--teal)" :value="n" v-model="addFromModel.before_exam_days" />
              {{ n }} day{{ n === 1 ? '' : 's' }}
            </label>
          </div>
        </div>

        <div v-if="addFromModel.type_trigger === 'score-percent'" class="form-row">
          <label class="form-label">Score Threshold (%)</label>
          <div style="display:flex;align-items:center;gap:8px">
            <input class="form-input nrScoreThreshold" max="100" min="10" style="max-width:80px" type="number" v-model="addFromModel.score_percent" />
            <span style="font-size:0.82rem;color:var(--ink-dim)">% — trigger when avg drops below this</span>
          </div>
        </div>

        <div v-if="addFromModel.type_trigger === 'user-inactivity-days'" class="form-row">
          <label class="form-label">Inactive for</label>
          <div style="display:flex;align-items:center;gap:8px">
            <input class="form-input nrInactiveDays" min="1" style="max-width:80px" type="number" v-model="addFromModel.user_inactivity_days" />
            <span style="font-size:0.82rem;color:var(--ink-dim)">days</span>
          </div>
        </div>

        <div v-if="addFromModel.type_trigger === 'study-streak-days'" class="form-row nrFields-study-streak-days">
          <label class="form-label">Streak Length</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <label v-for="n in [7,30,100]" :key="n" style="display:flex;align-items:center;gap:6px;font-size:0.82rem">
              <input type="checkbox" style="accent-color:var(--teal)" :value="n" v-model="addFromModel.study_streak_days" />
              {{ n }} days
            </label>
          </div>
        </div>

        <div class="form-row">
          <label class="form-label">Delivery Channels</label>
          <div style="display:flex;gap:16px">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.88rem">
              <input type="checkbox" style="accent-color:var(--teal)" :true-value="1" :false-value="0" v-model="addFromModel.delivery_email" />
              Email
            </label>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.88rem">
              <input type="checkbox" style="accent-color:var(--teal)" :true-value="1" :false-value="0" v-model="addFromModel.delivery_in_app" />
              In-app dashboard
            </label>
          </div>
        </div>

        <div class="form-row">
          <label class="form-label">Email Template
            <span style="font-weight:400;font-size:0.72rem;color:var(--ink-dim)">(optional — leave blank to use default)</span>
          </label>
          <select class="form-input form-select nrTemplate" v-model="addFromModel.email_template">
            <option value="auto-generate">Auto-generate</option>
            <option v-for="t in templates" :key="t.id" :value="t.id">
              {{ t.name }}<template v-if="t.type_name || t.type"> — {{ t.type_name || t.type }}</template>
            </option>
          </select>
        </div>

        <div class="form-row" style="margin-bottom:20px">
          <label class="form-label">Audience</label>
          <select class="form-input form-select" v-model="addFromModel.audience">
            <option value="all">All users</option>
            <option value="medical-students">Medical students only</option>
            <option value="residents-doctors">Residents &amp; doctors only</option>
            <option value="individual-subscribers">Individual subscribers only</option>
            <option value="institutional-users">Institutional users only</option>
            <option value="specific-institutions">Specific institutions…</option>
          </select>
        </div>

        <div class="form-row" style="margin-bottom:20px" v-if="addFromModel.audience === 'specific-institutions'">
          <label class="form-label">Institutions (this rule fires only to their students)</label>
          <select class="form-input form-select" multiple size="6" v-model="addFromModel.audience_institution_ids">
            <option v-for="inst in institutions" :key="inst.institution_id" :value="inst.institution_id">
              {{ inst.institution_name }}
            </option>
          </select>
          <div style="font-size:0.72rem;color:var(--ink-dim,#6b7280);margin-top:4px">
            Hold Ctrl/Cmd to select multiple. Leave none = fires to nobody.
          </div>
        </div>

        <div class="bottomwrapbtn" style="display:flex;gap:8px">
          <button class="btn btn-primary" style="flex:1" type="button" @click="submitForm">Save Changes</button>
          <button class="btn btn-outline" type="button" @click="closeModal">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>
