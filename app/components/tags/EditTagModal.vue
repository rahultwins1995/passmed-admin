<script setup lang="ts">
import { ref, reactive,watch} from 'vue'

import Loading from '@/components/loaders/Loading.vue'
const props = defineProps<{
  modelValue: Boolean
    detail: any | null
}>()

const { $api, $toast,$confirm } = useNuxtApp()
const emit = defineEmits(['update:modelValue', 'saved'])
const pageDetail = ref<any>(null)

const getDefaultForm = () => ({
  name: '',
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

const fullLoading=ref<boolean>(false);
// submit
const submitSave = async () => {

  if (!props.detail?.id) return

  closeModal();
  fullLoading.value = true;

  try {
    const res:any = await $api.post('/tags/update/'+props.detail.id, addform);

    if (res.data.status === 'success') {
        fullLoading.value = false;
         $toast("Changes saved successfully");
          emit('saved', true); 
          resetForm();
     }else{
           $toast('Failed to saved','error');
    }

  } catch (err:any) {
   
    fullLoading.value = false;
      const message = err?.response?.data?.message || 'Failed to saved.'
     $toast(message,'error');

  }
}

const editLoadPage=()=>{
  const detail =pageDetail.value
  if(detail){
    addform.name=detail?.name??'';
    addform.status=detail?.status??'1';
  }
}

watch(() => props.modelValue, async (val) => {
    pageDetail.value =props.detail;
    if (val && props.detail?.id) {
     editLoadPage();
    } else {
    pageDetail.value = null
    }
})

</script>

<template>
   <Loading v-if="fullLoading"/>
   
<div v-if="modelValue && pageDetail" class="overlay overlay-top open" @click.self="closeModal">

  <div class="drawer" style="width:400px;max-width:96vw">

    <!-- HEADER -->
    <div class="drawer-header">
      <div>
        <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:4px">
          Edit Tag
        </div>
        <div style="font-size: 0.88rem; color: var(--ink-dim);"> 
          Create a new Tag from scratch
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
          Tag Name
          </label>
          <input id="nqExplanation" class="form-input"
          placeholder="e.g. tag"
          v-model="addform.name"/>
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
          Save Changes
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