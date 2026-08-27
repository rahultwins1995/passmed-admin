<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Loading from '@/components/loaders/Loading.vue'

const props = defineProps<{
  modelValue: boolean
  review: any | null
}>()

const emit = defineEmits(['update:modelValue', 'saved'])

const { $api, $toast } = useNuxtApp()

const fullLoading = ref(false)
const adminNotes  = ref('')
const activeTab   = ref<'diff' | 'existing' | 'incoming'>('diff')

// ── Parsed snapshots ──────────────────────────────────────────────────────────
const existingData = computed(() => {
  const d = props.review?.existing_data
  if (!d) return {}
  return typeof d === 'string' ? JSON.parse(d) : d
})

const incomingData = computed(() => {
  const d = props.review?.incoming_data
  if (!d) return {}
  return typeof d === 'string' ? JSON.parse(d) : d
})

// ── Which fields differ between existing and incoming ─────────────────────────
const diffFields = computed(() => {
  const fields = [
    { key: 'question_stem', label: 'Question Stem' },
    { key: 'explanation',   label: 'Explanation'   },
    { key: 'difficulty',    label: 'Difficulty'    },
    { key: 'answer',        label: 'Answer'        },
  ]
  return fields.map(f => ({
    ...f,
    existing: existingData.value[f.key] ?? '—',
    incoming: incomingData.value[f.key] ?? '—',
    changed:  (existingData.value[f.key] ?? '') !== (incomingData.value[f.key] ?? ''),
  }))
})

const hasChanges = computed(() => diffFields.value.some(f => f.changed))

// ── Strip HTML for plain display ──────────────────────────────────────────────
const stripTags = (html: string) =>
  html ? html.replace(/<[^>]*>/g, '') : '—'

// ── Actions ───────────────────────────────────────────────────────────────────
const isPending = computed(() => props.review?.review_status === 'pending')

const closeModal = () => {
  emit('update:modelValue', false)
}

const submitAction = async (action: 'approve' | 'reject') => {
  if (!props.review?.id) return
  if(!adminNotes.value){
    $toast('Reason is requied.','error')
    return
  }

  fullLoading.value = true
  try {
    const res: any = await $api.post(`/import-reviews/action/${props.review.id}`, {
      action,
      notes: adminNotes.value,
    })
    const obj = res?.data ?? {}
    if (obj.status === 'success') {
      $toast(
        action === 'approve'
          ? 'Approved — DB question updated with incoming data'
          : 'Rejected — existing question kept unchanged',
        'success'
      )
      emit('saved')
      closeModal()
    } else {
      $toast(obj?.msg || 'Action failed', 'error')
    }
  } catch (err: any) {
    $toast(err?.response?.data?.msg || 'Action failed', 'error')
  } finally {
    fullLoading.value = false
  }
}

// ── Reset notes when review changes ──────────────────────────────────────────
watch(() => props.review, () => {
  adminNotes.value = ''
  activeTab.value  = 'diff'
})
</script>

<template>
  <Loading v-if="fullLoading" />

  <div v-if="modelValue && review"
       class="overlay overlay-top open"
       @click.self="closeModal">

    <div class="drawer" style="width:680px;max-width:98vw">

      <!-- Header -->
      <div class="drawer-header">
        <div class="fullheadsec">
          <div class="drawer-header-title">
            Review Duplicate — Q#{{ review.qid }}
          </div>
          <div class="drawer-header-subtitle" style="display:flex;align-items:center;gap:8px">
            <span>Import #{{ review.import_file_id }}</span>
            <span v-if="review.row_number" style="color:var(--ink-dim)">
              · Row {{ review.row_number }}
            </span>
            <span class="badge"
                  :class="{
                    'badge-amber':    review.review_status === 'pending',
                    'badge-green':    review.review_status === 'approved',
                    'badge-archived': review.review_status === 'rejected',
                  }">
              {{ review.review_status }}
            </span>
          </div>
        </div>
        <button class="drawer-close" type="button" @click="closeModal">
          <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round"
               stroke-width="2.5" viewBox="0 0 24 24" width="13">
            <line x1="18" x2="6" y1="6" y2="18"></line>
            <line x1="6" x2="18" y1="6" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="reviewDuplicateBody">

        <!-- Conflict reason banner -->
        <div class="conflict-banner">
          <svg fill="none" height="14" stroke="currentColor" stroke-linecap="round"
               stroke-width="2.5" viewBox="0 0 24 24" width="14" style="flex-shrink:0">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
            <line x1="12" x2="12" y1="9" y2="13"></line>
            <line x1="12" x2="12.01" y1="17" y2="17"></line>
          </svg>
          <span>{{ review.conflict_reason || 'QID already exists in database' }}</span>
        </div>

        <!-- Tabs -->
        <div class="import-tab-wrap" style="margin-bottom:0">
          <button class="import-tab"
                  :class="{ active: activeTab === 'diff' }"
                  type="button"
                  @click="activeTab = 'diff'">
            Diff View
            <span v-if="hasChanges" class="diff-badge">{{ diffFields.filter(f=>f.changed).length }}</span>
          </button>
          <button class="import-tab"
                  :class="{ active: activeTab === 'existing' }"
                  type="button"
                  @click="activeTab = 'existing'">
            Existing (DB)
          </button>
          <button class="import-tab"
                  :class="{ active: activeTab === 'incoming' }"
                  type="button"
                  @click="activeTab = 'incoming'">
            Incoming (CSV)
          </button>
        </div>

      </div>

      <!-- Tab content -->
      <div class="drawer-body" style="padding-top:12px">

        <!-- DIFF VIEW -->
        <div v-if="activeTab === 'diff'">
          <div v-if="!hasChanges"
               style="text-align:center;padding:24px;color:var(--ink-dim);font-size:0.85rem">
            No field-level differences detected — QID is the only conflict.
          </div>

          <div v-for="field in diffFields" :key="field.key"
               class="diff-row" :class="{ 'diff-changed': field.changed }">

            <div class="diff-field-label">
              {{ field.label }}
              <span v-if="field.changed" class="diff-changed-tag">changed</span>
            </div>

            <div class="diff-cols">
              <div class="diff-col diff-col-existing">
                <div class="diff-col-header">Existing (DB)</div>
                <div class="diff-col-body" :class="{ 'diff-strike': field.changed }">
                  {{ stripTags(field.existing) || '—' }}
                </div>
              </div>
              <div class="diff-col diff-col-incoming">
                <div class="diff-col-header">Incoming (CSV)</div>
                <div class="diff-col-body" :class="{ 'diff-highlight': field.changed }">
                  {{ stripTags(field.incoming) || '—' }}
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- EXISTING VIEW -->
        <div v-if="activeTab === 'existing'">
          <div v-if="Object.keys(existingData).length === 0"
               style="color:var(--ink-dim);font-size:0.85rem;text-align:center;padding:24px">
            No snapshot data available.
          </div>
          <div v-else class="snapshot-view">
            <div v-for="(val, key) in existingData" :key="key" class="snapshot-row">
              <div class="snapshot-key">{{ key }}</div>
              <div class="snapshot-val">{{ stripTags(String(val)) || '—' }}</div>
            </div>
          </div>
        </div>

        <!-- INCOMING VIEW -->
        <div v-if="activeTab === 'incoming'">
          <div v-if="Object.keys(incomingData).length === 0"
               style="color:var(--ink-dim);font-size:0.85rem;text-align:center;padding:24px">
            No snapshot data available.
          </div>
          <div v-else class="snapshot-view incoming">
            <div v-for="(val, key) in incomingData" :key="key" class="snapshot-row">
              <div class="snapshot-key">{{ key }}</div>
              <div class="snapshot-val">{{ stripTags(String(val)) || '—' }}</div>
            </div>
          </div>
        </div>

        <!-- Previously reviewed info -->
        <div v-if="review.review_status !== 'pending'"
             class="reviewed-info">
          <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round"
               stroke-width="2.5" viewBox="0 0 24 24" width="13">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <div>
            <div style="font-weight:600;font-size:0.8rem">
              {{ review.review_status === 'approved' ? 'Approved' : 'Rejected' }}
              at {{ review.reviewed_at }}
            </div>
            <div v-if="review.admin_notes"
                 style="font-size:0.78rem;color:var(--ink-mid);margin-top:2px">
              Note: {{ review.admin_notes }}
            </div>
          </div>
        </div>

        <!-- Admin notes + action buttons -->
        <template v-if="isPending">
          <div class="form-row" style="margin-top:16px">
            <label class="form-label">Admin Notes<span style="color: red;font-weight:bold;">*</span></label>
            <textarea
              v-model="adminNotes"
              class="form-input"
              rows="2"
              placeholder="Reason for approval or rejection…"
              style="resize:vertical;font-size:0.82rem"
            ></textarea>
          </div>

          <!-- What each action means -->
          <div class="action-explainer">
            <div class="ae-item ae-approve">
              <strong>Approve</strong> — Incoming CSV data overwrites the existing DB question (question_stem, explanation, difficulty).
            </div>
            <div class="ae-item ae-reject">
              <strong>Reject</strong> — Existing DB question is kept unchanged. CSV row is discarded.
            </div>
          </div>

          <div style="display:flex;gap:8px;margin-top:16px;padding-bottom:4px">
            <button class="btn btn-primary"
                    style="flex:1"
                    type="button"
                    @click="submitAction('approve')">
              ✓ Approve — Update DB
            </button>
            <button class="btn btn-danger"
                    style="flex:1"
                    type="button"
                    @click="submitAction('reject')">
              ✗ Reject — Keep Original
            </button>
            <button class="btn btn-outline"
                    type="button"
                    @click="closeModal">
              Cancel
            </button>
          </div>
        </template>

        <template v-else>
          <div style="display:flex;justify-content:flex-end;margin-top:16px;padding-bottom:4px">
            <button class="btn btn-outline" type="button" @click="closeModal">
              Close
            </button>
          </div>
        </template>

      </div>
    </div>
  </div>
</template>

<style scoped>
/* Conflict banner */
.conflict-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(220,38,38,0.05);
  border: 1.5px solid rgba(220,38,38,0.15);
  border-radius: var(--r, 6px);
  padding: 10px 14px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--red, #dc2626);
  margin-bottom: 14px;
}

/* Diff badge on tab */
.diff-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--red, #dc2626);
  color: #fff;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 700;
  width: 16px;
  height: 16px;
  margin-left: 5px;
  vertical-align: middle;
}

/* Diff rows */
.diff-row {
  margin-bottom: 12px;
  border: 1.5px solid var(--border, #e5e7eb);
  border-radius: var(--r, 6px);
  overflow: hidden;
}
.diff-row.diff-changed {
  border-color: rgba(245,158,11,0.4);
}

.diff-field-label {
  padding: 6px 12px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--ink-dim, #6b7280);
  background: var(--surface, #f9fafb);
  border-bottom: 1px solid var(--border, #e5e7eb);
  display: flex;
  align-items: center;
  gap: 8px;
}

.diff-changed-tag {
  background: rgba(245,158,11,0.15);
  color: #b45309;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 0.65rem;
  font-weight: 700;
}

.diff-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.diff-col {
  padding: 10px 12px;
}
.diff-col + .diff-col {
  border-left: 1px solid var(--border, #e5e7eb);
}

.diff-col-header {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 5px;
  color: var(--ink-dim, #9ca3af);
}
.diff-col-existing .diff-col-header { color: #6b7280; }
.diff-col-incoming .diff-col-header { color: var(--teal, #06b6d4); }

.diff-col-body {
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--ink, #111827);
  word-break: break-word;
}

.diff-strike {
  text-decoration: line-through;
  color: var(--ink-dim, #9ca3af);
}
.diff-highlight {
  color: var(--teal, #06b6d4);
  font-weight: 500;
}

/* Snapshot view */
.snapshot-view {
  border: 1.5px solid var(--border, #e5e7eb);
  border-radius: var(--r, 6px);
  overflow: hidden;
}
.snapshot-view.incoming .snapshot-val {
  color: var(--teal, #06b6d4);
}

.snapshot-row {
  display: grid;
  grid-template-columns: 130px 1fr;
  border-bottom: 1px solid var(--border, #e5e7eb);
}
.snapshot-row:last-child { border-bottom: 0; }

.snapshot-key {
  padding: 8px 12px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--ink-dim, #6b7280);
  background: var(--surface, #f9fafb);
  border-right: 1px solid var(--border, #e5e7eb);
}
.snapshot-val {
  padding: 8px 12px;
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--ink, #111827);
  word-break: break-word;
}

/* Reviewed info */
.reviewed-info {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: var(--surface, #f9fafb);
  border: 1.5px solid var(--border, #e5e7eb);
  border-radius: var(--r, 6px);
  padding: 10px 14px;
  margin-top: 14px;
  color: var(--ink-mid, #4b5563);
}

/* Action explainer */
.action-explainer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
}
.ae-item {
  padding: 8px 12px;
  border-radius: var(--r, 6px);
  font-size: 0.75rem;
  line-height: 1.5;
}
.ae-approve {
  background: rgba(16,185,129,0.05);
  border: 1.5px solid rgba(16,185,129,0.2);
  color: #065f46;
}
.ae-reject {
  background: rgba(220,38,38,0.05);
  border: 1.5px solid rgba(220,38,38,0.15);
  color: #7f1d1d;
}

/* Status badges */
.badge-amber {
  background: rgba(245,158,11,0.1);
  color: #b45309;
  border: 1px solid rgba(245,158,11,0.25);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.7rem;
  font-weight: 700;
}
.badge-archived {
  background: rgba(107,114,128,0.1);
  color: #374151;
  border: 1px solid rgba(107,114,128,0.2);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.7rem;
  font-weight: 700;
}
</style>