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
  sort_order: 0,
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
    // The slug is NOT sent — the API freezes it on update. Questions store the slug,
    // so regenerating it on rename would orphan every one of them.
    const res: any = await $api.post('/difficulties/update/' + props.detail.id, addform);

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
    addform.sort_order = Number(detail?.sort_order ?? 0);
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
          Difficulty
        </div>
        <div style="font-size: 0.88rem; color: var(--ink-dim);">
          Edit Difficulty Level
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

          <!-- Read-only, and shown deliberately: this is the value questions and import
               sheets actually carry. Renaming the label below does not touch it. -->
          <div class="form-row">
          <label class="form-label">Stored value (slug)</label>
          <input class="form-input" disabled :value="props.detail?.slug ?? ''" />
          <div style="font-size:0.7rem;color:var(--ink-dim);margin-top:5px;line-height:1.5">
            Fixed. Questions store this, not the id — changing it would orphan every
            question using this level.
          </div>
          </div>

          <div class="form-row">
          <label class="form-label">Name</label>
          <input class="form-input"
          placeholder="e.g. Foundation"
          v-model="addform.name"/>
          <div style="font-size:0.7rem;color:var(--ink-dim);margin-top:5px;line-height:1.5">
            Display label only — safe to change at any time.
          </div>
          </div>

          <div class="form-row">
          <label class="form-label">Order</label>
          <input class="form-input" type="number" min="0"
          v-model.number="addform.sort_order"/>
          </div>

          <div class="form-row" style="margin:0">
          <label class="form-label">Status</label>
          <select class="form-input form-select"
          v-model="addform.status">
          <option value="0">Draft</option>
          <option value="1">Published</option>
          </select>
          <div style="font-size:0.7rem;color:var(--ink-dim);margin-top:5px;line-height:1.5">
            Draft retires the level: it disappears from dropdowns, import templates and
            validation. Questions already rated at it keep their rating.
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
