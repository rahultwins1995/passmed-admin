<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import Loading from '@/components/loaders/Loading.vue'

const props = defineProps({ modelValue: Boolean })
const { $api, $toast } = useNuxtApp()
const emit = defineEmits(['update:modelValue', 'saved'])

const getDefaultForm = () => ({ parent_exam_id: '0', name: '', duration_minutes: '60', pass_mark_value: '65', attempt_limit: '1' })
const addform = reactive(getDefaultForm())
const resetForm = () => { Object.assign(addform, getDefaultForm()) }
const closeModal = () => { emit('update:modelValue', false) }
const fullLoading = ref(false)

const examOptions = ref<any[]>([{ id: '0', name: '-- Select parent exam --' }])
const loadExams = async () => {
  try {
    const res: any = await $api.post('/exams/list', { search: '', page: 1, limit: 500 })
    if (res.data?.status === 'success') {
      examOptions.value = [{ id: '0', name: '-- Select parent exam --' }, ...(res.data.data || [])]
    }
  } catch (e) { /* ignore — dropdown just stays with the placeholder */ }
}

const submitSave = async () => {
  if (!addform.parent_exam_id || addform.parent_exam_id == '0') { return $toast('Parent exam is required', 'error') }
  if (!addform.name.trim()) { return $toast('Mock name is required', 'error') }
  fullLoading.value = true
  try {
    const res: any = await $api.post('/mocks/add', {
      parent_exam_id: Number(addform.parent_exam_id),
      name: addform.name.trim(),
      duration_minutes: addform.duration_minutes ? Number(addform.duration_minutes) : null,
      pass_mark_value: addform.pass_mark_value !== '' ? Number(addform.pass_mark_value) : null,
      attempt_limit: addform.attempt_limit !== '' ? Number(addform.attempt_limit) : 1,
    })
    if (res.data?.status === 'success') {
      $toast('Mock created — import questions into it, then publish.')
      emit('saved')
      resetForm()
      closeModal()
    } else { $toast(res.data?.msg || 'Failed to create mock', 'error') }
  } catch (err: any) {
    $toast(err?.response?.data?.msg || err?.response?.data?.message || 'Failed to create mock.', 'error')
  } finally { fullLoading.value = false }
}

watch(() => props.modelValue, (val) => { if (val) { resetForm(); loadExams() } })
onMounted(() => { if (props.modelValue) loadExams() })
</script>

<template>
  <Loading v-if="fullLoading" />
  <div v-if="modelValue" class="overlay open" @click.self="closeModal">
    <div class="drawer">
      <div class="drawer-head">
        <div class="drawer-title">Add Mock Exam</div>
        <button type="button" class="drawer-close" @click="closeModal" aria-label="Close">✕</button>
      </div>
      <div class="drawer-body">
        <p class="mock-note">
          A mock is a child of a parent exam. Create it here, then use
          <strong>Import</strong> on the row to add its question paper, then <strong>Publish</strong>.
        </p>

        <div class="form-row">
          <label class="form-label">Parent exam</label>
          <select class="form-input form-select" v-model="addform.parent_exam_id">
            <option v-for="e in examOptions" :key="e.id" :value="String(e.id)">{{ e.name }}</option>
          </select>
        </div>

        <div class="form-row">
          <label class="form-label">Mock name</label>
          <input class="form-input" type="text" v-model="addform.name" placeholder="e.g. ABA Basic Mock 1" />
        </div>

        <div class="form-row">
          <label class="form-label">Duration (minutes)</label>
          <input class="form-input" type="number" min="1" v-model="addform.duration_minutes" placeholder="60" />
        </div>

        <div class="form-row">
          <label class="form-label">Pass mark (%)</label>
          <input class="form-input" type="number" min="0" max="100" v-model="addform.pass_mark_value" placeholder="65" />
        </div>

        <div class="form-row">
          <label class="form-label">Attempts allowed <span class="hint">(0 = unlimited)</span></label>
          <input class="form-input" type="number" min="0" v-model="addform.attempt_limit" placeholder="1" />
        </div>

        <div class="drawer-actions">
          <button type="button" class="btn btn-outline" @click="closeModal">Cancel</button>
          <button type="button" class="btn btn-primary" @click="submitSave">Create mock</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; justify-content: center; align-items: flex-start; z-index: 1000; padding: 40px 16px; overflow-y: auto; }
.drawer { background: var(--surface, #fff); width: 94vw; max-width: 440px; max-height: 86vh; border-radius: 12px; display: flex; flex-direction: column; box-shadow: 0 12px 40px rgba(0,0,0,.18); }
.drawer-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border, #e5e7eb); }
.drawer-title { font-size: 1.05rem; font-weight: 800; color: var(--ink, #111827); }
.drawer-close { background: none; border: 0; font-size: 1rem; cursor: pointer; color: var(--ink-dim, #6b7280); }
.drawer-body { padding: 18px 20px; overflow-y: auto; flex: 1; }
.mock-note { font-size: .78rem; color: var(--ink-dim, #6b7280); line-height: 1.5; margin: 0 0 14px; }
.form-row { margin-bottom: 14px; }
.form-label { display: block; font-size: .8rem; font-weight: 600; margin-bottom: 5px; color: var(--ink-mid, #374151); }
.hint { font-weight: 400; font-size: .72rem; color: var(--ink-dim, #6b7280); }
.form-input { width: 100%; padding: .6rem .7rem; border: 1px solid var(--border, #d1d5db); border-radius: 8px; font-size: .9rem; background: var(--surface, #fff); color: var(--ink, #111827); }
.form-select { appearance: auto; }
.drawer-actions { display: flex; gap: 10px; margin-top: 18px; }
.drawer-actions .btn { flex: 1; padding: .6rem; border-radius: 8px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn-outline { background: transparent; border-color: var(--border, #d1d5db); color: var(--ink, #111827); }
.btn-primary { background: var(--accent, #0e7c86); color: #fff; }
</style>
