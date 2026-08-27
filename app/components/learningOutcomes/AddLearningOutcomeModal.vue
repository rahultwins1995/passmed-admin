<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import Loading from '@/components/loaders/Loading.vue'
const props = defineProps({
  modelValue: Boolean
});

const { $api, $toast } = useNuxtApp()
const emit = defineEmits(['update:modelValue', 'saved'])

const getDefaultForm = () => ({
  name: '',
  status: '1',
})
const addform = reactive(getDefaultForm());
const resetForm = () => {
  Object.assign(addform, getDefaultForm())
}

const closeModal = () => {
  emit('update:modelValue', false)
}

const fullLoading = ref<boolean>(false);

const submitSave = async () => {

  if (!addform.name?.trim()) {
    return $toast('Name is required', 'error')
  }

  // The other taxonomy modals close the drawer BEFORE the request and then toast a
  // failure into an empty screen — the user's typing is gone and they have to start
  // over. Keep the drawer open until we know it saved.
  fullLoading.value = true;

  try {
    const res: any = await $api.post('/learning-outcomes/add', addform);

    if (res.data.status === 'success') {
      $toast("Learning outcome is saved");
      emit('saved', true);
      resetForm();
      closeModal();
    } else {
      // e.g. the duplicate-name guard — the message is worth showing verbatim.
      $toast(res?.data?.msg || 'Failed to save', 'error');
    }

  } catch (err: any) {
    $toast(err?.response?.data?.msg || err?.response?.data?.message || 'Failed to save.', 'error');
  } finally {
    fullLoading.value = false;
  }
}

watch(() => props.modelValue, (val) => {
  if (val) resetForm();
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
          Learning Outcome
        </div>
        <div style="font-size: 0.88rem; color: var(--ink-dim);">
          Create Learning Outcome
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
          <div style="font-size:0.7rem;color:var(--ink-dim);margin-top:5px;line-height:1.5">
            The cognitive task a question tests. Import sheets must match this name
            exactly, so keep it short and stable.
          </div>
          </div>

          <div class="form-row" style="margin:0">
          <label class="form-label">Status</label>
          <select class="form-input form-select"
          v-model="addform.status">
          <option value="0">Draft</option>
          <option value="1">Published</option>
          </select>
          </div>

          <!-- ACTIONS -->
          <div style="display: flex; gap: 8px; padding-top: 30px;">

          <button class="btn btn-primary" type="button"
          @click="submitSave">
          Add Learning Outcome
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
