<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Loading from '@/components/loaders/Loading.vue'
import AppEditor from '@/components/editor/AppEditor.vue'

const { $api, $toast } = useNuxtApp()

const props = defineProps<{
  modelValue: Boolean,
  review: any,
}>()

const emit = defineEmits(['update:modelValue', 'saved'])

const saving = ref(false)

// Editable fields — these are exactly what the review row stores in incoming_data.
const form = ref<any>({
  question_stem: '',
  explanation: '',
  reference: '',
  difficulty: '',
  answer: '', 
})

const closeModal = () => emit('update:modelValue', false)

const stripTags = (html: string) =>
  html ? String(html).replace(/<[^>]*>/g, '') : '—'

// POST edited incoming_data back to the review row (questions table untouched).
// approveAfter=true → also run the normal approve (overwrites the question with the fixed data).
const save = async (approveAfter = false) => {
  if (!props.review?.id) return
  saving.value = true
  try {
    const res: any = await $api.post(`/import-reviews/update-incoming/${props.review.id}`, {
      question_stem: form.value.question_stem,
      explanation:   form.value.explanation,
      reference:     form.value.reference,
      difficulty:    form.value.difficulty,
      answer:        form.value.answer,
    })

    if (res?.data?.status !== 'success') {
      $toast(res?.data?.msg || 'Update failed', 'error')
      saving.value = false
      return
    }

    if (approveAfter) {
      await $api.post(`/import-reviews/action/${props.review.id}`, {
        action: 'approve',
        notes: 'Edited & approved from review.',
      })
      $toast('Saved & approved successfully.', 'success')
    } else {
      $toast('Changes saved.', 'success')
    }

    emit('saved')
    closeModal()
  } catch (err: any) {
    $toast(err?.response?.data?.msg || err?.response?.data?.message || 'Update failed.', 'error')
  } finally {
    saving.value = false
  }
}

// Difficulty vocabulary — see the <select> below.
const difficultyList = ref<any[]>([])
const fetchDifficulties = async () => {
  try {
    const res: any = await $api.post('/difficulties/list', { limit: 500 })
    difficultyList.value = res?.data?.status === 'success' ? (res.data.data || []) : []
  } catch { difficultyList.value = [] }
}

onMounted(() => {
  fetchDifficulties()
  const inc = props.review?.incoming_data ?? {}
  form.value.question_stem = inc.question_stem ?? ''
  form.value.explanation   = inc.explanation ?? ''
  form.value.reference     = inc.reference ?? ''
  form.value.difficulty    = inc.difficulty ?? 'foundation'
  form.value.answer        = inc.answer ?? ''
})
</script>

<template>
  <Loading v-if="saving" />

  <div v-if="modelValue" class="question-modal overlay overlay-top open" @click.self="closeModal">
    <div class="drawer" style="width:720px;max-width:96vw">

      <!-- HEADER -->
      <div class="drawer-header">
        <div>
          <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:4px">
            Edit Incoming (CSV)
          </div>
          <div style="font-size:0.88rem;font-weight:700;color:var(--ink)">
            Q#{{ review?.qid ?? '—' }}
          </div>
        </div>
        <button class="drawer-close" type="button" @click="closeModal">
          <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="13">
            <line x1="18" x2="6" y1="6" y2="18"></line>
            <line x1="6" x2="18" y1="6" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- BODY -->
      <div class="drawer-body">

        <!-- Existing (DB) reference hint -->
        <div v-if="review?.existing_data?.question_stem"
             style="background:var(--surface,#f9fafb);border:1px solid var(--border,#e5e7eb);border-radius:8px;padding:10px 12px;margin-bottom:16px">
          <div style="font-size:0.62rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--ink-dim);margin-bottom:4px">
            Existing in DB (for reference)
          </div>
          <div style="font-size:0.78rem;color:var(--ink-mid);line-height:1.5">
            {{ stripTags(review.existing_data.question_stem) }}
          </div>
        </div>

        <!-- Difficulty + Answer -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
          <div class="form-row" style="margin:0">
            <label class="form-label">Difficulty</label>
            <!-- Live vocabulary, not a hardcoded list. This modal edits the INCOMING
                 import row before approving it — offering a level the importer would
                 then reject is exactly the trap this taxonomy exists to close. -->
            <select class="form-input form-select" v-model="form.difficulty">
              <option v-for="d in difficultyList" :key="d.id" :value="d.slug">{{ d.name }}</option>
            </select>
          </div>
          <div class="form-row" style="margin:0">
            <label class="form-label">Answer</label>
            <input class="form-input" v-model="form.answer" placeholder="e.g. B" />
          </div>
        </div>

        <!-- Question stem -->
        <div class="form-row">
          <label class="form-label">Question Stem</label>
          <AppEditor v-model="form.question_stem" />
        </div>

        <!-- Explanation -->
        <div class="form-row">
          <label class="form-label">Explanation / Teaching Point</label>
          <AppEditor v-model="form.explanation" />
        </div>

        <!-- Reference -->
        <div class="form-row" style="margin-bottom:20px">
          <label class="form-label">
            Reference
            <span style="font-weight:400;font-size:0.72rem;color:var(--ink-dim)">(optional)</span>
          </label>
          <AppEditor v-model="form.reference" />
        </div>

        <!-- ACTIONS -->
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline" style="flex:1" type="button" @click="save(false)">
            Save
          </button>
          <button class="btn btn-primary" style="flex:1" type="button" @click="save(true)">
            Save &amp; Approve
          </button>
        </div>

      </div>
    </div>
  </div>
</template>
