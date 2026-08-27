<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import Loading from '@/components/loaders/Loading.vue'

const props = defineProps<{
  modelValue: Boolean
  detail: any | null
}>()

const { $api, $toast } = useNuxtApp()
const emit = defineEmits(['update:modelValue', 'saved'])
const pageDetail = ref<any>(null)

const getDefaultForm: any = {
  name: '',
  status: '1',
}

const addform = reactive(getDefaultForm);
const resetForm = () => {
  Object.assign(addform, getDefaultForm)
}

const closeModal = () => {
  emit('update:modelValue', false)
}

const fullLoading = ref<boolean>(false);

const submitSave = async () => {

  if (!props.detail?.id) return

  if (!addform.name?.trim()) {
    return $toast('Name is required', 'error')
  }

  fullLoading.value = true;

  try {
    const res: any = await $api.post('/learning-outcomes/update/' + props.detail.id, addform);

    if (res.data.status === 'success') {
      $toast("Changes saved successfully");
      emit('saved', true);
      resetForm();
      closeModal();
    } else {
      $toast(res?.data?.msg || 'Failed to save', 'error');
    }

  } catch (err: any) {
    $toast(err?.response?.data?.msg || err?.response?.data?.message || 'Failed to save.', 'error');
  } finally {
    fullLoading.value = false;
  }
}

const editLoadPage = () => {
  const detail = pageDetail.value
  if (detail) {
    addform.name = detail?.name ?? '';
    addform.status = detail?.status ?? '1';
  }
}

watch(() => props.modelValue, (val) => {
  pageDetail.value = props.detail;
  if (val && props.detail?.id) {
    editLoadPage();
  } else {
    pageDetail.value = null
  }
})
</script>

<template>
   <Loading v-if="fullLoading"/>

<div v-if="modelValue" class="overlay overlay-top open" @click.self="closeModal">

  <div class="drawer" style="width:400px;max-width:96vw">

    <!-- HEADER -->
    <div class="drawer-header">
      <div>
        <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:4px">
          Learning Outcome
        </div>
        <div style="font-size: 0.88rem; color: var(--ink-dim);">
          Edit Learning Outcome
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
          <label class="form-label">Name</label>
          <input class="form-input"
          placeholder="e.g. Management &amp; Treatment"
          v-model="addform.name"/>
          <!-- Questions point at the id, so a rename is safe — no question loses its
               learning outcome. But import sheets match on the NAME, so any sheet
               already written against the old name will start failing. -->
          <div v-if="Number(props.detail?.questions_count) > 0"
            style="font-size:0.7rem;color:var(--amber);margin-top:5px;line-height:1.5">
            Used by {{ props.detail.questions_count }} question{{ Number(props.detail.questions_count) === 1 ? '' : 's' }}.
            Renaming is safe for them, but import sheets that spell the old name will
            no longer match.
          </div>
          </div>

          <div class="form-row" style="margin:0">
          <label class="form-label">Status</label>
          <select class="form-input form-select"
          v-model="addform.status">
          <option value="0">Draft</option>
          <option value="1">Published</option>
          </select>
          <div style="font-size:0.7rem;color:var(--ink-dim);margin-top:5px;line-height:1.5">
            Draft retires the value: it stops appearing in dropdowns and import
            templates, but questions already using it keep it.
          </div>
          </div>

          <!-- ACTIONS -->
          <div style="display: flex; gap: 8px; padding-top: 30px;">

          <button class="btn btn-primary" type="button"
          @click="submitSave">
          Save Changes
          </button>

          <button class="btn btn-outline" type="button"
          @click="closeModal">
          Cancel
          </button>
          </div>
      </div>
    </div>
  </div>
</div>
</template>
