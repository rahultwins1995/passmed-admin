<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Loading from '@/components/loaders/Loading.vue'
import EditQuestionModal from '@/components/questions/EditQuestionModal.vue'

/**
 * Review & Approve — single-screen loop.
 *
 * Was: review → read the flag → close → open the editor separately → fix →
 * come back → approve. Now: the flag reason, the question editor and the
 * decision live in ONE drawer. Confirm saves any inline edit, records the
 * decision, and advances straight to the next flagged question; Cancel exits.
 */
const props = defineProps<{
  modelValue: boolean
  questionId: any
  /** Ids of the to-approve queue, in list order. Falls back to [questionId]. */
  queue?: any[]
  /** id → QID, for display. Navigation stays keyed on the internal id. */
  qidMap?: Record<string, any>
}>()

const emit = defineEmits(['update:modelValue', 'saved'])

const { $api, $toast } = useNuxtApp()

const fullLoading = ref(false)
const submitting  = ref(false)

const decision = ref<'publish' | 'draft' | 'archive'>('publish')
const note     = ref('')

const importFlags = ref<string[]>([])
const editorRef   = ref<any>(null)

// ── Queue ────────────────────────────────────────────────────────────────────
const ids = ref<any[]>([])
const idx = ref(0)
const currentId = computed(() => ids.value[idx.value] ?? props.questionId)
// Falls back to the internal id only if the map is missing an entry, so the header
// never renders blank.
const currentQid = computed(() => props.qidMap?.[String(currentId.value)] ?? currentId.value)
const total     = computed(() => ids.value.length)

const closeModal = () => emit('update:modelValue', false)

const resetPerQuestion = () => {
  decision.value = 'publish'
  note.value = ''
}

const fetchImportFlags = async (id: any) => {
  if (!id) { importFlags.value = []; return }
  try {
    const res: any = await $api.get('/import-flags/getByQflg/' + id)
    importFlags.value = res?.data?.data ?? []
  } catch { importFlags.value = [] }
}

// Build the queue once, when the drawer opens. It is deliberately a SNAPSHOT —
// approving removes the question from the underlying list, and we don't want the
// queue to shift under the reviewer mid-pass.
watch(() => props.modelValue, async (open) => {
  if (!open) return
  const q = (props.queue ?? []).map((x: any) => Number(x)).filter(Boolean)
  ids.value = q.length ? q : [Number(props.questionId)].filter(Boolean)
  const at = ids.value.indexOf(Number(props.questionId))
  idx.value = at >= 0 ? at : 0
  resetPerQuestion()
  await fetchImportFlags(currentId.value)
}, { immediate: true })

// ── Confirm: save edits (if any) → record decision → next ─────────────────────
const submitApproval = async () => {
  const id = currentId.value
  if (!id || submitting.value) return

  submitting.value = true
  fullLoading.value = true

  try {
    // 1) Persist any inline edit first. Skipped when untouched, so an approval
    //    with no changes doesn't create a pointless revision entry.
    const ed = editorRef.value
    if (ed?.isDirty?.()) {
      const ok = await ed.save()
      if (!ok) return   // validation/save failed — stay on this question
    }

    // 2) Record the decision.
    const status =
      decision.value === 'publish' ? '1' :
      decision.value === 'draft'   ? '0' : '2'

    const res: any = await $api.post(`/questions/review-approve/${id}`, {
      status,
      note: note.value,
    })

    if (res?.data?.status !== 'success') {
      $toast('Failed to save review & approve', 'error')
      return
    }

    const verb =
      decision.value === 'publish' ? 'published' :
      decision.value === 'draft'   ? 'saved as draft' : 'archived'
    $toast(`Q# ${id} ${verb}`)
    emit('saved', true)

    // 3) Advance to the next flagged question, or finish.
    if (idx.value < ids.value.length - 1) {
      idx.value++
      resetPerQuestion()
      await fetchImportFlags(currentId.value)
    } else {
      $toast('Review queue complete')
      closeModal()
    }
  } catch (err: any) {
    $toast(err?.response?.data?.message || 'Failed to save review & approve', 'error')
  } finally {
    submitting.value = false
    fullLoading.value = false
  }
}

// Skip without deciding — just move on.
const skipQuestion = async () => {
  if (idx.value < ids.value.length - 1) {
    idx.value++
    resetPerQuestion()
    await fetchImportFlags(currentId.value)
  } else {
    closeModal()
  }
}
</script>

<template>
  <Loading v-if="fullLoading" />

  <div v-if="modelValue"
    class="approvalQPreview overlay overlay-top open"
    @click.self="closeModal">

    <div class="drawer" style="width:900px;max-width:97vw">

      <!-- HEADER -->
      <div class="drawer-header">
        <div>
          <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:4px">
            Review &amp; Approve
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="font-size:0.95rem;font-weight:700;color:var(--ink)">
              Q#{{ currentQid }}
            </div>
            <span v-if="total > 1" class="badge badge-teal" style="font-size:0.68rem">
              {{ idx + 1 }} of {{ total }}
            </span>
          </div>
        </div>

        <button class="drawer-close" @click="closeModal" type="button">
          <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5"
            viewBox="0 0 24 24" width="13">
            <line x1="18" x2="6" y1="6" y2="18"></line>
            <line x1="6" x2="18" y1="6" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- BODY -->
      <div class="drawer-body">

        <!-- 1. Why it was flagged -->
        <div v-if="importFlags.length" class="flag-banner">
          <strong>Flagged during import:</strong>
          <ul style="margin:6px 0 0;padding-left:18px">
            <li v-for="(r, i) in importFlags" :key="i">{{ r }}</li>
          </ul>
        </div>

        <!-- 2. Fix it right here — the editor is embedded, not a second modal.
                :key remounts it per question so it loads the next one cleanly. -->
        <div class="approval-editor-wrap">
          <EditQuestionModal
            :key="currentId"
            ref="editorRef"
            :model-value="true"
            :id="currentId"
            :active-tab="'4'"
            embedded
          />
        </div>

        <!-- 3. Decision -->
        <div style="margin:18px 0 16px">
          <div style="font-size:0.72rem;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:var(--ink-dim);margin-bottom:10px">
            Approval Decision
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <label style="display:flex;align-items:flex-start;gap:10px;padding:12px;border:1.5px solid var(--border);border-radius:var(--r-sm);cursor:pointer">
              <input type="radio" name="approvalDecision" value="publish"
                style="margin-top:2px;accent-color:var(--teal)" v-model="decision" />
              <div>
                <div style="font-size:0.85rem;font-weight:700;color:var(--ink)">Publish immediately</div>
                <div style="font-size:0.75rem;color:var(--ink-dim)">Question goes live to all subscribers right away</div>
              </div>
            </label>

            <label style="display:flex;align-items:flex-start;gap:10px;padding:12px;border:1.5px solid var(--border);border-radius:var(--r-sm);cursor:pointer">
              <input type="radio" name="approvalDecision" value="draft"
                style="margin-top:2px;accent-color:var(--teal)" v-model="decision" />
              <div>
                <div style="font-size:0.85rem;font-weight:700;color:var(--ink)">Save as draft</div>
                <div style="font-size:0.75rem;color:var(--ink-dim)">Approved but held back — publish manually later</div>
              </div>
            </label>

            <label style="display:flex;align-items:flex-start;gap:10px;padding:12px;border:1.5px solid var(--border);border-radius:var(--r-sm);cursor:pointer">
              <input type="radio" name="approvalDecision" value="archive"
                style="margin-top:2px;accent-color:var(--teal)" v-model="decision" />
              <div>
                <div style="font-size:0.85rem;font-weight:700;color:var(--ink)">Archive</div>
                <div style="font-size:0.75rem;color:var(--ink-dim)">Reject and remove from queue — not suitable for publishing</div>
              </div>
            </label>
          </div>
        </div>

        <div class="form-row" style="margin-bottom:20px">
          <label class="form-label">
            Note
            <span style="font-weight:400;font-size:0.72rem;color:var(--ink-dim)">
              (optional — logged to audit trail)
            </span>
          </label>
          <input class="form-input" placeholder="e.g. Verified against UpToDate Mar 2026 guidelines"
            type="text" v-model="note" />
        </div>

        <!-- 4. Confirm / Skip / Cancel -->
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" style="flex:1" type="button"
            :disabled="submitting" @click="submitApproval">
            {{ submitting
              ? 'Saving…'
              : (idx < total - 1 ? 'Confirm & Next →' : 'Confirm Decision') }}
          </button>
          <button v-if="idx < total - 1" class="btn btn-outline" type="button"
            :disabled="submitting" @click="skipQuestion">
            Skip
          </button>
          <button class="btn btn-outline" type="button" @click="closeModal">
            Cancel
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<style>
.flag-banner{
  background:rgba(245,158,11,0.08);
  border:1.5px solid rgba(245,158,11,0.3);
  border-radius:6px;padding:10px 14px;margin-bottom:14px;
  font-size:0.82rem;color:var(--amber-ink);
}
/* Embedded editor sits inside the approval drawer — give it a subtle frame so it
   reads as "the question you're fixing", not a second page. */
.approval-editor-wrap{
  border:1.5px solid var(--border);
  border-radius:8px;
  padding:4px 14px;
  background:var(--surface);
}
.question-editor-embedded .drawer-body{
  padding:10px 0 !important;
  max-height:none !important;
  overflow:visible !important;
}
</style>
