<script setup lang="ts">
import { ref,reactive,watch} from 'vue'
import Loading from '@/components/loaders/Loading.vue'
const props = defineProps({
  modelValue: Boolean
});

const { $api, $toast,$confirm } = useNuxtApp()
const emit = defineEmits(['update:modelValue', 'saved'])


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

  closeModal();
  fullLoading.value = true;

  try {
    const res:any = await $api.post('/disciplines/add', addform);

    if (res.data.status === 'success') {
        fullLoading.value = false;
         $toast("Discipline is Saved");
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

  <div class="drawer" style="width:400px;max-width:96vw">

    <!-- HEADER -->
    <div class="drawer-header">
      <div>
        <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:4px">
          Discipline
        </div>
        <div style="font-size: 0.88rem; color: var(--ink-dim);"> 
          Create Discipline
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
          Name
          </label>
          <input id="nqExplanation" class="form-input"
          placeholder="e.g. name"
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
          Add Discipline
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