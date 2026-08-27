<!--
  Controlled FAQ portal tabs. Drives the consolidated /dashboard/faqs page
  (Home / Student / Institute) in-place via v-model instead of navigating to
  separate routes. Value is the portal_type sent to the unified /faqs endpoint.
-->
<script setup lang="ts">
defineProps<{ modelValue: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const tabs = [
  { label: 'Home (Frontend)', value: 'home' },
  { label: 'Student Portal',  value: 'student' },
  { label: 'Institute Portal', value: 'institute' },
]
</script>

<template>
  <div class="faq-tabs">
    <button
      v-for="t in tabs"
      :key="t.value"
      type="button"
      class="faq-tab"
      :class="{ 'active-tab': modelValue === t.value }"
      @click="emit('update:modelValue', t.value)"
    >
      {{ t.label }}
    </button>
  </div>
</template>

<style scoped>
.faq-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}
.faq-tab {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
}
.faq-tab:hover { color: #0f172a; }
.faq-tab.active-tab {
  color: #0fa5b6;
  border-bottom-color: #0fa5b6;
}
</style>
