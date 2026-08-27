<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  label?: string
  rows?: number
  placeholder?: string
}>(), {
  label: '',
  rows: 6,
  placeholder: '',
})

const emit = defineEmits(['update:modelValue'])

// 'source' = editable raw HTML, 'preview' = sanitized public-facing render
const mode = ref<'source' | 'preview'>('source')

const onInput = (e: Event) => {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value)
}

const tabStyle = (active: boolean) => ({
  padding: '4px 12px',
  fontSize: '0.72rem',
  fontWeight: '600',
  lineHeight: '1.4',
  cursor: 'pointer',
  border: 'none',
  background: active ? 'var(--primary, #2563eb)' : 'transparent',
  color: active ? '#fff' : 'var(--ink-dim, #666)',
})
</script>

<template>
  <div class="form-row html-src-preview">
    <label class="form-label"
      style="display:flex;align-items:center;justify-content:space-between;gap:8px">
      <span>{{ label }}</span>
      <span class="hsp-toggle"
        style="display:inline-flex;border:1.5px solid var(--border);border-radius:var(--r-sm);overflow:hidden">
        <button type="button" :style="tabStyle(mode === 'source')" @click="mode = 'source'">
          Source
        </button>
        <button type="button" :style="tabStyle(mode === 'preview')" @click="mode = 'preview'">
          Preview
        </button>
      </span>
    </label>

    <!-- Source: editable raw HTML -->
    <textarea v-show="mode === 'source'"
      class="form-input"
      :rows="rows"
      :placeholder="placeholder"
      :value="modelValue"
      @input="onInput"
      style="resize:vertical;font-family:var(--font-mono, ui-monospace, monospace);font-size:0.78rem;line-height:1.6"></textarea>

    <!-- Preview: sanitized rendered HTML (how the public page will look) -->
    <div v-show="mode === 'preview'"
      class="hsp-preview"
      style="border:1.5px solid var(--border);border-radius:var(--r-sm);padding:14px;min-height:120px;background:#fff;line-height:1.7;overflow:auto">
      <template v-if="modelValue && modelValue.trim()">
        <div v-html="safeHtmlContent(modelValue)"></div>
      </template>
      <span v-else style="color:var(--ink-dim, #999);font-size:0.8rem">Nothing to preview yet.</span>
    </div>
  </div>
</template>
