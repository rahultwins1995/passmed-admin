<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import { ref,reactive,watch} from 'vue'
import Loading from '@/components/loaders/Loading.vue'
const props = defineProps({
  modelValue: Boolean
});

const { $api, $toast,$confirm } = useNuxtApp()
const emit = defineEmits(['update:modelValue', 'saved'])

// A Category is a SUB-TOPIC and belongs to exactly one Subject (Clinical Area).
// This is the real hierarchy — and it is not optional bookkeeping: 14 of the 330
// sub-topic names exist under TWO areas ("Lipid disorders" is both Cardiology and
// Endocrinology, "Lung cancer" is both Oncology and Respiratory), so a sub-topic
// without its parent is genuinely ambiguous.
//
// The parent used to be declared backwards, on the Subject form. Nothing wrote
// categories.subject_id, which is why the Category list's Subject column has
// always been blank.
const getDefaultForm = () => ({
  name: '',
  subject_id: '0',
  status: '1',
})

const addform = reactive(getDefaultForm());
const resetForm = () => {
  Object.assign(addform, getDefaultForm())
}

// close modal
const closeModal = () => {
  emit('update:modelValue', false)
}

// ── Parent Subject (Clinical Area) picker ────────────────────────────────────
const subjectList    = ref<any[]>([]);
const subjectLoading = ref<boolean>(false);

const fetchSubjects = async () => {
  subjectLoading.value = true;
  try {
    // 21 clinical areas — one page is plenty, no infinite scroll needed.
    const res:any = await $api.post('/subjects/list', { limit: 500 });
    subjectList.value = res?.data?.status === 'success' ? (res.data.data || []) : [];
  } catch {
    subjectList.value = [];
  } finally {
    subjectLoading.value = false;
  }
}

const subjectOptions = computed(() => [
  { id: '0', name: '! -- Select Subject -- !' },
  ...subjectList.value,
])

const fullLoading=ref<boolean>(false);
// submit
const submitSave = async () => {

  if (!addform.name?.trim()) {
    return $toast('Category name is required', 'error');
  }
  // Guard here as well as server-side: an unparented sub-topic shows under no
  // subject anywhere in the app, which looks like the save silently failed.
  if (!addform.subject_id || String(addform.subject_id) === '0') {
    return $toast('Pick the Subject this sub-topic belongs to', 'error');
  }

  fullLoading.value = true;

  try {
    const res:any = await $api.post('/categories/add', addform);

    if (res.data.status === 'success') {
        fullLoading.value = false;
         $toast("Category is Saved");
          emit('saved', true);
          resetForm();
          // Close only after the server confirms — on failure the drawer stays
          // open with input intact.
          closeModal();

     }else{
           fullLoading.value = false;
           $toast(res?.data?.msg || 'Failed to saved','error');
    }

  } catch (err:any) {
    fullLoading.value = false;
      const message = err?.response?.data?.msg || err?.response?.data?.message || 'Failed to saved.'
     $toast(message,'error');

  }
}


// reset when open
watch(() => props.modelValue, (val) => {
   if (val) {
    resetForm();
    if (!subjectList.value.length) fetchSubjects();
  }
});
</script>

<template>
   <Loading v-if="fullLoading"/>
   
<div v-if="modelValue" class="overlay overlay-top open" @click.self="closeModal">

  <div class="drawer" style="width:400px;max-width:96vw">

    <!-- HEADER -->
    <div class="drawer-header">
      <div>
        <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:4px">
          Category
        </div>
        <div style="font-size: 0.88rem; color: var(--ink-dim);"> 
          New Category
        </div>
      </div>

      <button class="drawer-close" data-action="close-overlay" type="button"
        @click="closeModal">
        <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="13">
        <line x1="18" x2="6" y1="6" y2="18"></line>
        <line x1="6" x2="18" y1="6" y2="18"></line>
        </svg>
        </button>

    </div>

    
    <!-- BODY -->
    <div class="drawer-body">
      <div class="topwrapadd">
          <div class="form-row">
          <label class="form-label">
          Category Name
          </label>
          <input id="nqExplanation" class="form-input"
          placeholder="e.g. Ischemic heart disease"
          v-model="addform.name"/>
          </div>

          <div class="form-row">
            <label class="form-label">Subject <span style="color:var(--rose)">*</span></label>
            <Multiselect
            class="multiSubject-select-options subject-select"
            placeholder="Pick the Clinical Area this sub-topic sits under"
            v-model="addform.subject_id"
            :options="subjectOptions"
            label="name"
            valueProp="id"
            :searchable="true"
            :loading="subjectLoading"
            />
            <div style="font-size:0.7rem;color:var(--ink-dim);margin-top:5px;line-height:1.5">
              A category is a <strong>sub-topic</strong> of a subject. The same name can
              exist under two subjects — "Lipid disorders" belongs to both Cardiology
              and Endocrinology — so the subject is what makes it unambiguous.
            </div>
          </div>

          <div class="form-row" style="margin:0">
          <label class="form-label">Status</label>
          <select class="form-input form-select" id="nqStatus"
          v-model="addform.status">
          <option value="0">Draft</option>
          <option value="1">Published</option>
          </select>
          </div>

          <!-- ACTIONS -->
          <div style="display: flex; gap: 8px; padding-top: 30px;">

          <button class="btn btn-primary" 
          @click="submitSave">
          Add Category
          </button>

          <button class="btn btn-outline"
          @click="closeModal">
          Cancel
          </button>
          </div>
      </div>
    </div>
  </div>
</div>
</template>