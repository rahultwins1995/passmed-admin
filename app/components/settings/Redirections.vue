<script setup lang="ts">
/**
 * URL Redirections — admin-managed old→new URL rules (marketing site, 301/302).
 * Shown as a Settings tab (activeTab === 'redirections').
 */
import Loader_small from '@/components/loaders/Loader_small.vue'
import Loading from '@/components/loaders/Loading.vue'
import Empty from '@/components/loaders/Empty.vue'
import { ref, reactive, watch } from 'vue'

const props = defineProps({ activeTab: String })
const { $api, $toast, $confirm } = useNuxtApp()

const loading = ref(false)
const fullLoading = ref(false)
const list = ref<any[]>([])

const showForm = ref(false)
const editId = ref<number | null>(null)
const form = reactive({ from_path: '', to_path: '', type: 301 as number, status: 1 as number })

const resetForm = () => { editId.value = null; form.from_path = ''; form.to_path = ''; form.type = 301; form.status = 1 }

const fetchList = async () => {
  loading.value = true
  try {
    const res: any = await $api.post('/redirects', { limit: 500 })
    list.value = res.data?.status === 'success' ? (res.data.data || []) : []
  } catch (e) { list.value = [] }
  finally { loading.value = false }
}

const openAdd = () => { resetForm(); showForm.value = true }
const openEdit = (r: any) => {
  editId.value = r.id
  form.from_path = r.from_path; form.to_path = r.to_path; form.type = Number(r.type); form.status = Number(r.status)
  showForm.value = true
}
const cancelForm = () => { showForm.value = false; resetForm() }

const save = async () => {
  if (!form.from_path.trim()) return $toast('From path is required', 'error')
  if (!form.to_path.trim()) return $toast('To URL is required', 'error')
  fullLoading.value = true
  try {
    const url = editId.value ? '/redirects/update/' + editId.value : '/redirects/add'
    const res: any = await $api.post(url, {
      from_path: form.from_path.trim(),
      to_path: form.to_path.trim(),
      type: Number(form.type),
      status: Number(form.status),
    })
    if (res.data?.status === 'success') { $toast(res.data.msg || 'Saved'); showForm.value = false; resetForm(); fetchList() }
    else { $toast(res.data?.msg || 'Failed', 'error') }
  } catch (e: any) { $toast(e?.response?.data?.msg || 'Failed', 'error') }
  finally { fullLoading.value = false }
}

const remove = async (r: any) => {
  const ok = await $confirm('Delete this redirect?')
  if (!ok) return
  fullLoading.value = true
  try {
    const res: any = await $api.delete('/redirects/delete/' + r.id)
    if (res.data?.status === 'success') { $toast('Deleted'); fetchList() }
    else { $toast(res.data?.msg || 'Failed', 'error') }
  } catch (e: any) { $toast(e?.response?.data?.msg || 'Failed', 'error') }
  finally { fullLoading.value = false }
}

watch(() => props.activeTab, (t) => { if (t === 'redirections') fetchList() }, { immediate: true })
</script>

<template>
  <div v-if="activeTab === 'redirections'" class="settings-panel">
    <Loading v-if="fullLoading" />

    <div class="panel-hdr">
      <div>
        <h3 class="panel-title">Redirections</h3>
        <p class="panel-sub">
          Send an old URL to a new one with a <strong>301</strong> (permanent) or <strong>302</strong>
          (temporary) redirect. Applies to the public marketing site. The old URL's query string is carried over.
        </p>
      </div>
      <button v-if="!showForm" class="btn btn-primary btn-sm" @click="openAdd">+ Add Redirect</button>
    </div>

    <!-- Add / Edit modal (centered) -->
    <div v-if="showForm" class="rd-overlay" @click.self="cancelForm">
      <div class="rd-modal">
        <div class="rd-modal-head">
          <div class="rd-modal-title">{{ editId ? 'Edit redirect' : 'Add redirect' }}</div>
          <button type="button" class="rd-close" @click="cancelForm" aria-label="Close">✕</button>
        </div>
        <div class="rd-modal-body">
          <div class="rd-field">
            <label>From (old path)</label>
            <input type="text" v-model="form.from_path" placeholder="/about" />
            <span class="hint">The old path on your site, e.g. <code>/about</code></span>
          </div>
          <div class="rd-field">
            <label>To (new URL)</label>
            <input type="text" v-model="form.to_path" placeholder="/about-us   or   https://..." />
            <span class="hint">Internal path (<code>/about-us</code>) or a full external link.</span>
          </div>
          <div class="rd-two">
            <div class="rd-field">
              <label>Type</label>
              <select v-model="form.type">
                <option :value="301">301 — Permanent</option>
                <option :value="302">302 — Temporary</option>
              </select>
            </div>
            <div class="rd-field">
              <label>Status</label>
              <select v-model="form.status">
                <option :value="1">Active</option>
                <option :value="0">De-active</option>
              </select>
            </div>
          </div>
        </div>
        <div class="rd-modal-foot">
          <button class="btn btn-outline btn-sm" @click="cancelForm">Cancel</button>
          <button class="btn btn-primary btn-sm" @click="save">{{ editId ? 'Update' : 'Add' }} redirect</button>
        </div>
      </div>
    </div>

    <!-- List -->
    <div class="rd-card">
      <table class="RdTable">
        <thead>
          <tr><th>From</th><th>To</th><th>Type</th><th>Status</th><th>Action</th></tr>
        </thead>
        <tbody v-if="loading || list.length === 0">
          <tr><td colspan="5" class="rd-empty"><Loader_small v-if="loading" /><Empty v-else /></td></tr>
        </tbody>
        <tbody v-else>
          <tr v-for="r in list" :key="r.id">
            <td class="rd-mono">{{ r.from_path }}</td>
            <td class="rd-mono">{{ r.to_path }}</td>
            <td><span class="badge badge-teal">{{ r.type }}</span></td>
            <td><span :class="['badge', r.status === 1 ? 'badge-green' : 'badge-grays']">{{ r.status === 1 ? 'Active' : 'De-active' }}</span></td>
            <td>
              <div class="rd-rowact">
                <button class="btn btn-outline btn-xs" @click="openEdit(r)">Edit</button>
                <button class="btn btn-danger btn-xs" @click="remove(r)">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.settings-panel { padding: 4px 0; }
.panel-hdr { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.panel-title { margin: 0; font-size: 1.05rem; font-weight: 800; color: var(--ink, #111827); }
.panel-sub { margin: 4px 0 0; font-size: .78rem; color: var(--ink-dim, #6b7280); line-height: 1.5; max-width: 640px; }
.rd-form { border: 1px solid var(--border, #e5e7eb); border-radius: 10px; padding: 16px; margin-bottom: 16px; background: var(--surface-hi, #f8fafc); }
.rd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.rd-field { display: flex; flex-direction: column; }
.rd-field.rd-narrow { grid-column: span 1; }
.rd-field label { font-size: .78rem; font-weight: 600; margin-bottom: 5px; color: var(--ink-mid, #374151); }
.rd-field input, .rd-field select { padding: .55rem .7rem; border: 1px solid var(--border, #d1d5db); border-radius: 8px; font-size: .88rem; background: var(--surface, #fff); color: var(--ink, #111827); }
.hint { font-size: .72rem; color: var(--ink-dim, #6b7280); margin-top: 4px; }
.hint code { background: var(--surface, #eef2f7); padding: 0 4px; border-radius: 4px; }
.rd-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: flex-start; justify-content: center; z-index: 1000; padding: 48px 16px; overflow-y: auto; }
.rd-modal { background: var(--surface, #fff); width: 100%; max-width: 560px; border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,.18); display: flex; flex-direction: column; }
.rd-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border, #e5e7eb); }
.rd-modal-title { font-size: 1.05rem; font-weight: 800; color: var(--ink, #111827); }
.rd-close { background: none; border: 0; font-size: 1rem; cursor: pointer; color: var(--ink-dim, #6b7280); }
.rd-modal-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
.rd-two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.rd-modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--border, #e5e7eb); }
@media (max-width: 560px) { .rd-two { grid-template-columns: 1fr; } }
.rd-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; }
.rd-card { border: 1px solid var(--border, #e5e7eb); border-radius: 10px; overflow: hidden; background: var(--surface, #fff); }
.RdTable { width: 100%; border-collapse: collapse; }
.RdTable th, .RdTable td { padding: 11px 14px; text-align: left; font-size: .82rem; border-bottom: 1px solid var(--border, #eef2f7); vertical-align: middle; }
.RdTable th { font-size: .66rem; text-transform: uppercase; letter-spacing: .5px; color: var(--ink-dim, #6b7280); }
.rd-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .8rem; word-break: break-all; }
.rd-empty { text-align: center; padding: 24px; }
.rd-rowact { display: flex; gap: 6px; }
.btn { border: 1px solid transparent; border-radius: 7px; cursor: pointer; font-weight: 600; }
.btn-sm { padding: .5rem .9rem; font-size: .82rem; }
.btn-xs { padding: .35rem .6rem; font-size: .72rem; }
.btn-primary { background: var(--accent, #0e7c86); color: #fff; }
.btn-outline { background: transparent; border-color: var(--border, #d1d5db); color: var(--ink, #111827); }
.btn-danger { background: var(--rose, #dc2626); color: #fff; }
.badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 20px; font-size: .68rem; font-weight: 700; }
.badge-teal { background: var(--teal-pale, #ccfbf1); color: var(--teal-dark, #0f766e); }
.badge-green { background: var(--green-light, #dcfce7); color: var(--green, #16a34a); }
.badge-grays { background: var(--surface-hi, #f1f5f9); color: var(--ink-dim, #6b7280); }
@media (max-width: 640px) { .rd-grid { grid-template-columns: 1fr; } }
</style>
