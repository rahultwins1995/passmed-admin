<script setup lang="ts">
import { ref, reactive } from 'vue'
import Loading from '@/components/loaders/Loading.vue'

const props = defineProps<{ modelValue: Boolean }>()
const emit = defineEmits(['update:modelValue', 'saved'])

const { $api, $toast } = useNuxtApp()
const fullLoading = ref(false)

const form = reactive({
  portal: 'home',     // home | student | institute
  url: '',
  sheet_name: '',
})

const closeModal = () => emit('update:modelValue', false)

const submitImport = async () => {
  if (!form.url) { $toast('Google Sheet URL is required', 'error'); return }

  fullLoading.value = true
  try {
    const res: any = await $api.post('/faqs/import-sheet', {
      portal: form.portal,
      url: form.url,
      sheet_name: form.sheet_name,
    })
    if (res?.data?.status === 'success') {
      $toast(res?.data?.msg || 'FAQs imported', 'success')
      form.url = ''
      form.sheet_name = ''
      emit('saved')
      closeModal()
    } else {
      $toast(res?.data?.msg || 'Import failed', 'error')
    }
  } catch (err: any) {
    $toast(err?.response?.data?.msg || err?.response?.data?.message || 'Import failed', 'error')
  } finally {
    fullLoading.value = false
  }
}
</script>

<template>
  <Loading v-if="fullLoading" />

  <div v-if="modelValue" class="overlay overlay-top open" @click.self="closeModal">
    <div class="drawer" style="width:560px;max-width:96vw">

      <!-- HEADER -->
      <div class="drawer-header">
        <div>
          <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:4px">
            FAQs
          </div>
          <div style="font-size:0.88rem;color:var(--ink-dim)">Import from Google Sheet</div>
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
        <div class="topwrapadd">

          <div class="form-row">
            <label class="form-label">Import into</label>
            <select class="form-input form-select" v-model="form.portal">
              <option value="home">Home FAQs</option>
              <option value="student">Student Portal FAQs</option>
              <option value="institute">Institute Portal FAQs</option>
            </select>
          </div>

          <div class="form-row">
            <label class="form-label">Google Sheet URL</label>
            <input class="form-input"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              v-model="form.url" />
          </div>

          <div class="form-row">
            <label class="form-label">
              Sheet / Tab Name
              <span style="font-weight:400;font-size:0.72rem;color:var(--ink-dim)">(optional)</span>
            </label>
            <input class="form-input" placeholder="e.g. Sheet1" v-model="form.sheet_name" />
          </div>

          <p style="font-size:0.74rem;color:var(--ink-dim);margin:4px 0 0;line-height:1.5">
            Sheet must have header columns <strong>Question</strong> and <strong>Answer</strong>
            (an optional <strong>Status</strong> column: 0=Draft, 1=Published, 2=Archive — defaults to Published).
            Share the sheet as “Anyone with the link can view”.
          </p>

          <!-- ACTIONS -->
          <div style="display:flex;gap:8px;padding-top:24px">
            <button class="btn btn-primary" type="button" @click="submitImport">
              Import FAQs
            </button>
            <button class="btn btn-outline" type="button" @click="closeModal">
              Cancel
            </button>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>
