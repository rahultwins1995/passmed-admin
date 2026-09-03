<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
const inputRef = ref<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null)
const dialogRef = ref<HTMLElement | null>(null)
const error = ref('')
let previouslyFocused: HTMLElement | null = null

const confirmState = useConfirm()

function focusableEls(): HTMLElement[] {
  if (!dialogRef.value) return []
  return Array.from(dialogRef.value.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
  )).filter(el => el.offsetParent !== null)
}

// Escape cancels; Tab is trapped inside the open dialog (a11y — keyboard users
// can't tab out into the page behind the modal).
function onDocKeydown(e: KeyboardEvent) {
  if (!confirmState.value.show) return
  if (e.key === 'Escape') { e.preventDefault(); onCancel(); return }
  if (e.key === 'Tab') {
    const els = focusableEls()
    if (!els.length) return
    const first = els[0], last = els[els.length - 1]
    const active = document.activeElement as HTMLElement
    if (e.shiftKey && (active === first || !dialogRef.value?.contains(active))) {
      e.preventDefault(); last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault(); first.focus()
    }
  }
}

// Open → remember the trigger, trap + focus. Close → release + restore focus.
watch(() => confirmState.value.show, async (show) => {
  if (show) {
    error.value = ''
    previouslyFocused = (document.activeElement as HTMLElement) ?? null
    document.addEventListener('keydown', onDocKeydown)
    await nextTick()
    ;(inputRef.value ?? focusableEls()[0])?.focus()
  } else {
    document.removeEventListener('keydown', onDocKeydown)
    previouslyFocused?.focus?.()
    previouslyFocused = null
  }
})

onBeforeUnmount(() => document.removeEventListener('keydown', onDocKeydown))

const close = (result: unknown) => {
  confirmState.value.resolve?.(result)
  confirmState.value.show = false
}


const onConfirm = () => {
  if (confirmState.value.input) {
    const val = (confirmState.value.inputValue ?? '').trim()
    if (confirmState.value.required && !val) {
      error.value = 'This field is required'
      return
    }
     // prompt -> value
    close(confirmState.value.inputValue) 
    return
  }
  // confirm -> true
  close(true)                              
}

const onCancel = () => {
  // prompt cancel -> null, confirm -> false
  close(confirmState.value.input ? null : false) 
}

const onKeydown = (e: KeyboardEvent) => {
  // Enter to confirm 
  if (e.key === 'Enter' && confirmState.value.input !== 'textarea') {
    e.preventDefault()
    onConfirm()
  }
}

</script>

<template>
  <div v-if="confirmState.show" class="confirmoverlay overlay overlay-top open"
   @click.self="onCancel">
     <div ref="dialogRef" class="drawer" style="width:400px;max-width:96vw"
       role="dialog" aria-modal="true" aria-labelledby="confirmMsg">
        <div class="drawer-body">
            <div id="confirmMsg" class="confirmbox">
            {{ confirmState.message }}
            </div>

          <div v-if="confirmState.input" class="form-row" style="margin-top:16px">
            <label v-if="confirmState.lable"
              class="form-label" for="confirmInputField">
              {{ confirmState.lable }}
            </label>

             <textarea v-if="confirmState.input === 'textarea'"
             id="confirmInputField"
             ref="inputRef"
             v-model="confirmState.inputValue"
              class="form-input confirm-input"
              rows="2"
              :placeholder="confirmState.placeholder"
              style="resize:vertical;font-size:0.82rem"
            @keydown="onKeydown"></textarea>

            <select
            v-else-if="confirmState.input === 'select'"
            id="confirmInputField"
            ref="inputRef"
            v-model="confirmState.inputValue"
            class="form-select confirm-input">
            <option value="" disabled>
              {{ confirmState.placeholder || 'Select...' }}
            </option>
            <option v-for="opt in confirmState.options"
              :key="opt.value"
              :value="opt.value">
              {{ opt.label }}
            </option>
            </select>

            <input v-else
            id="confirmInputField"
            ref="inputRef"
            v-model="confirmState.inputValue"
            :type="confirmState.input"
            :placeholder="confirmState.placeholder"
            class="form-input confirm-input"
            @keydown="onKeydown" />

          <div v-if="error" class="confirm-error">{{ error }}</div>

          </div>

            <div class="confirm-actions">
                <button class="btn btn-danger" type="button"
                @click="onCancel">
                {{ confirmState.cancelText }}
                </button>

                 <button class="btn btn-primary" type="button"
                @click="onConfirm">
                  {{ confirmState.confirmText }}
                </button>
            </div>
        </div>
    </div>
  </div>
</template>
<style>
.confirm-actions { text-align: center; cursor: pointer; }
.confirm-actions .btn { margin: 0 10px 0 0; }
.confirmbox {
  /* was `white` — a hard white slab inside the dialog, which stayed white in dark
     mode and blew out the whole confirm box. The dialog surface is --white, which
     flips with the theme. */
  background: var(--white); padding: 10px 0px; font-weight: bold;
  text-align: center; margin-bottom: 15px; color: var(--ink);
}
.confirm-input-wrap { margin-bottom: 15px; }
.confirm-input {
  width: 100%; padding: 8px 10px; border: 1px solid var(--border);
  border-radius: 6px; font-size: 14px; outline: none; box-sizing: border-box;
}
.confirm-input:focus { border-color: #4f46e5; }
.confirm-error { color: #dc2626; font-size: 12px; margin-top: 6px; }

</style>