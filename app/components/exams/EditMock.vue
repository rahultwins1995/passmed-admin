<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import Loading from '@/components/loaders/Loading.vue'

const props = defineProps<{ modelValue: boolean; detail: any | null }>()
const { $api, $toast } = useNuxtApp()
const emit = defineEmits(['update:modelValue', 'saved'])

const form = reactive({ name: '', duration_minutes: '' as any, pass_mark_value: '' as any, attempt_limit: '' as any })
const fullLoading = ref(false)
const closeModal = () => emit('update:modelValue', false)

watch(() => props.modelValue, (v) => {
  if (v && props.detail) {
    form.name = props.detail.name ?? ''
    form.duration_minutes = props.detail.duration_minutes ?? ''
    form.pass_mark_value = props.detail.pass_mark_value ?? ''
    // null attempt_limit = unlimited → show 0 in the input.
    form.attempt_limit = props.detail.attempt_limit ?? 0
  }
})

const submit = async () => {
  if (!form.name.trim()) return $toast('Mock name is required', 'error')
  if (!props.detail?.id) return
  fullLoading.value = true
  try {
    const res: any = await $api.post('/mocks/update/' + props.detail.id, {
      name: form.name.trim(),
      duration_minutes: form.duration_minutes !== '' ? Number(form.duration_minutes) : null,
      pass_mark_value: form.pass_mark_value !== '' ? Number(form.pass_mark_value) : null,
      attempt_limit: form.attempt_limit !== '' ? Number(form.attempt_limit) : 0,
    })
    if (res.data?.status === 'success') { $toast('Mock updated'); emit('saved'); closeModal() }
    else { $toast(res.data?.msg || 'Failed', 'error') }
  } catch (e: any) {
    $toast(e?.response?.data?.msg || e?.response?.data?.message || 'Failed to update mock.', 'error')
  } finally { fullLoading.value = false }
}
</script>

<template>
  <Loading v-if="fullLoading" />
  <div v-if="modelValue" class="overlay open" @click.self="closeModal">
    <div class="drawer">
      <div class="drawer-head">
        <div class="drawer-title">Edit Mock Exam</div>
        <button type="button" class="drawer-close" @click="closeModal" aria-label="Close">✕</button>
      </div>
      <div class="drawer-body">
        <div class="form-row">
          <label class="form-label">Parent exam</label>
          <input class="form-input" type="text" :value="detail?.parent_exam || '—'" disabled />
        </div>
        <div class="form-row">
          <label class="form-label">Mock name</label>
          <input class="form-input" type="text" v-model="form.name" />
        </div>
        <div class="form-row">
          <label class="form-label">Duration (minutes)</label>
          <input class="form-input" type="number" min="1" v-model="form.duration_minutes" />
        </div>
        <div class="form-row">
          <label class="form-label">Pass mark (%)</label>
          <input class="form-input" type="number" min="0" max="100" v-model="form.pass_mark_value" />
        </div>
        <div class="form-row">
          <label class="form-label">Attempts allowed <span class="hint">(0 = unlimited)</span></label>
          <input class="form-input" type="number" min="0" v-model="form.attempt_limit" />
        </div>
        <div class="drawer-actions">
          <button type="button" class="btn btn-outline" @click="closeModal">Cancel</button>
          <button type="button" class="btn btn-primary" @click="submit">Save changes</button>
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
.form-row { margin-bottom: 14px; }
.form-label { display: block; font-size: .8rem; font-weight: 600; margin-bottom: 5px; color: var(--ink-mid, #374151); }
.hint { font-weight: 400; font-size: .72rem; color: var(--ink-dim, #6b7280); }
.form-input { width: 100%; padding: .6rem .7rem; border: 1px solid var(--border, #d1d5db); border-radius: 8px; font-size: .9rem; background: var(--surface, #fff); color: var(--ink, #111827); }
.form-input:disabled { background: var(--surface-hi, #f1f5f9); color: var(--ink-dim, #6b7280); }
.drawer-actions { display: flex; gap: 10px; margin-top: 18px; }
.drawer-actions .btn { flex: 1; padding: .6rem; border-radius: 8px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn-outline { background: transparent; border-color: var(--border, #d1d5db); color: var(--ink, #111827); }
.btn-primary { background: var(--accent, #0e7c86); color: #fff; }
</style>
