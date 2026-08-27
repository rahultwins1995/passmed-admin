<script setup lang="ts">
import { ref,reactive,watch} from 'vue'
import Loading from '@/components/loaders/Loading.vue'
const props = defineProps({
  modelValue: Boolean,
  // home | student | institute — drives the unified /faqs endpoint + whether the
  // HelpFaq category `type` field is shown.
  portalType: { type: String, default: 'home' }
});

const { $api, $toast,$confirm } = useNuxtApp()
const emit = defineEmits(['update:modelValue', 'saved'])

const getDefaultForm = () => ({
  question: '',
  answer: '',
  status: '1',
  type: 'other', // only used for student/institute (HelpFaq)
})

const addform = reactive(getDefaultForm());
const resetForm = () => {
  Object.assign(addform, getDefaultForm())
  // Default category depends on the portal (marketing vs help categories).
  addform.type = props.portalType === 'home' ? 'getting-started' : 'other'
}

// close modal
const closeModal = () => {
  emit('update:modelValue', false)
}

const fullLoading=ref<boolean>(false);
// submit
const submitSave = async () => {

  closeModal();
  fullLoading.value = true;

  try {
    const res:any = await $api.post('/faqs/add', { ...addform, portal_type: props.portalType });

    if (res.data.status === 'success') {
       const message = res?.data?.msg || 'Record created successfully.'
         $toast(message,'success');
          emit('saved', true); 
          resetForm();
     }else{
      const message =res?.data?.msg || 'Failed to saved record.'
       $toast(message,'error');
    }

  } catch (err:any) {
     const message = err?.response?.data?.msg || 'Failed to saved record.'
     $toast(message,'error');

  }finally{
    fullLoading.value = false;
  }
}

// reset when open
watch(() => props.modelValue, (val) => {
   if (val) {
    resetForm();
  }
});
</script>

<template>
   <Loading v-if="fullLoading"/>
   
<div v-if="modelValue" class="overlay overlay-top open" @click.self="closeModal">

  <div class="drawer" style="width:700px;max-width:96vw">

      <!-- HEADER -->
      <div class="drawer-header">
        <div>
          <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:4px">
            FAQs
          </div>
          <div style="font-size: 0.88rem; color: var(--ink-dim);"> 
            Create FAQs
          </div>
        </div>
        <button class="drawer-close" data-action="close-overlay" type="button"
        @click="closeModal">
        <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" 
        stroke-width="2.5" viewBox="0 0 24 24" width="13">
        <line x1="18" x2="6" y1="6" y2="18"></line>
        <line x1="6" x2="18" y1="6" y2="18"></line>
        </svg>
        </button>
      </div>

      <!-- BODY -->
      <div class="drawer-body">
        <div class="topwrapadd">
            <div class="form-row">
            <label class="form-label">Category</label>
            <select class="form-input form-select" v-model="addform.type">
              <template v-if="portalType === 'home'">
                <option value="getting-started">Getting Started</option>
                <option value="pricing">Pricing &amp; Plans</option>
                <option value="content">Content &amp; Exams</option>
                <option value="account">Account</option>
                <option value="institutions">Institutions</option>
              </template>
              <template v-else>
                <option value="account">Account</option>
                <option value="questions">Questions</option>
                <option value="billing">Billing</option>
                <option value="technical">Technical</option>
                <option value="other">Other</option>
              </template>
            </select>
            </div>

            <div class="form-row">
            <label class="form-label">
            Question Name
            </label>
            <input id="nqExplanation" class="form-input"
            placeholder="e.g. question"
            v-model="addform.question"/>
            </div>

            <div class="form-row">
            <label class="form-label">
            Answer
            </label>
            <textarea class="form-input" rows="6" v-model="addform.answer"></textarea>
            </div>

            <div class="form-row" style="margin:0">
            <label class="form-label">Status</label>
            <select class="form-input form-select" id="nqStatus"
            v-model="addform.status">
            <option value="0">Draft</option>
            <option value="1">Published</option>
            <option value="2">Archive</option>
            </select>
            </div>

            <!-- ACTIONS -->
            <div style="display: flex; gap: 8px; padding-top: 30px;">

            <button class="btn btn-primary" 
            @click="submitSave">
            Add & FAQs
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