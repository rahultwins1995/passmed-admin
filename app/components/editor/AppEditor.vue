<script setup lang="ts">
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import CodeBlock from '@tiptap/extension-code-block'
import TextAlign from '@tiptap/extension-text-align'
import { ref } from 'vue'
import MediaLibraryModal from '@/components/editor/MediaLibraryModal.vue'
import { ImageWithDelete } from '@/components/editor/ImageWithDelete'

const props = defineProps<{
  modelValue: string
  placeholder?: string | null
  class?: string | null
}>()

const emit = defineEmits(['update:modelValue'])

const { $api, $toast } = useNuxtApp()

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit,
    Underline,
    // Restrict link hrefs to safe schemes. Without validate/protocols a
    // `javascript:` (or `data:`) href is accepted and only defanged at render —
    // i.e. it is stored / lives in the editing surface (stored / self-XSS).
    Link.configure({
      protocols: ['http', 'https', 'mailto'],
      validate: (href) => /^(https?:|mailto:)/i.test(href),
    }),
    ImageWithDelete.configure({
      inline: false,
      allowBase64: true,
    }),
    CodeBlock,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
  ],
  onUpdate({ editor }) {
    if (!showSource.value) {
      emit('update:modelValue', editor.getHTML())
    }
  },
})

//  sync API data
watch(() => props.modelValue, (val) => {
  if (showSource.value) return
  if (editor.value && val !== editor.value.getHTML()) {
    editor.value.commands.setContent(val || '')
  }
})

/* ---------- REMOVE selected image from editor ---------- */
const removeSelectedImage = () => {
  if (!editor.value) return
  if (editor.value.isActive('image')) {
    editor.value.chain().focus().deleteSelection().run()
  } else {
    $toast('Click an image first to select it.', 'error')
  }
}

/* ---------- SOURCE HTML toggle (<>) ---------- */
const showSource = ref(false)
const sourceHtml = ref('')

const toggleSource = () => {
  if (!editor.value) return
  if (!showSource.value) {
    // WYSIWYG → Source
    sourceHtml.value = editor.value.getHTML()
    showSource.value = true
  } else {
    // Source → WYSIWYG (apply changes)
    editor.value.commands.setContent(sourceHtml.value || '')
    emit('update:modelValue', sourceHtml.value || '')
    showSource.value = false
  }
}

// when the source textarea is edited, propagate the change up to the parent too
const onSourceInput = () => {
  emit('update:modelValue', sourceHtml.value || '')
}

/* ---------- URL scheme guards (reject javascript:/data: etc. before insert) ---------- */
const isSafeLink = (u: string) => /^(https?:|mailto:)/i.test(u.trim())
const isSafeImg  = (u: string) => /^https?:\/\//i.test(u.trim())

/* ---------- LINK ---------- */
const setLinkUrl = () => {
  const previous = editor.value?.getAttributes('link').href || ''
  const url = window.prompt('Enter link URL:', previous)
  if (url === null) return
  const trimmed = url.trim()
  if (trimmed === '') {
    editor.value?.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  if (!isSafeLink(trimmed)) {
    $toast('Only http(s) or mailto links are allowed.', 'error')
    return
  }
  editor.value?.chain().focus().extendMarkRange('link')
    .setLink({ href: trimmed }).run()
}

// Accessibility (editorial requirement): ask the author to describe every image
// so medical content carries meaningful alt text. Blank is allowed and means the
// image is decorative (screen readers skip it) — but the author is prompted each
// time so alt is a conscious choice, not silently omitted.
const promptAlt = (): string =>
  (window.prompt('Describe this image for accessibility (leave blank if decorative):') ?? '').trim()

/* ---------- IMAGE via URL ---------- */
const addImageByUrl = () => {
  const url = window.prompt('Paste direct image URL (e.g. ...image.jpg):')
  if (!url || !url.trim()) return
  const trimmed = url.trim()
  if (!isSafeImg(trimmed)) {
    $toast('Only http(s) image URLs are allowed.', 'error')
    return
  }
  editor.value?.chain().focus().setImage({ src: trimmed, alt: promptAlt() }).run()
}

/* ---------- IMAGE upload from PC (with loader) ---------- */
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const triggerFileUpload = () => fileInput.value?.click()

const onFileSelected = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    $toast('Please select an image file.', 'error')
    target.value = ''
    return
  }

  const formData = new FormData()
  formData.append('image', file)

  uploading.value = true
  try {
    const res: any = await $api.post('/uploads/image', formData)
    const url = res?.data?.url
    if (res?.data?.status === 'success' && url) {
      editor.value?.chain().focus().setImage({ src: url, alt: promptAlt() }).run()
    } else {
      $toast(res?.data?.msg || 'Image upload failed.', 'error')
    }
  } catch (err: any) {
    $toast(err?.response?.data?.msg || err?.response?.data?.message || 'Image upload failed.', 'error')
  } finally {
    uploading.value = false
    target.value = ''
  }
}

/* ---------- MEDIA LIBRARY ---------- */
const showLibrary = ref(false)
const openLibrary = () => { showLibrary.value = true }
const onLibrarySelect = (url: string) => {
  if (url) editor.value?.chain().focus().setImage({ src: url, alt: promptAlt() }).run()
}

//  destroy safely
onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="wrapEdtr" :class="class">
      <div class="toolbar">
        <button :disabled="!editor || showSource" @click="editor?.chain().focus().undo().run()">↶</button>
        <button :disabled="!editor || showSource" @click="editor?.chain().focus().redo().run()">↷</button>

        <button :disabled="!editor || showSource" @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()">H1</button>
        <button :disabled="!editor || showSource" @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()">H2</button>

        <button :disabled="!editor || showSource" @click="editor?.chain().focus().toggleBulletList().run()">•</button>
        <button :disabled="!editor || showSource" @click="editor?.chain().focus().toggleOrderedList().run()">1.</button>

        <button :disabled="!editor || showSource" @click="editor?.chain().focus().toggleBold().run()">B</button>
        <button :disabled="!editor || showSource" @click="editor?.chain().focus().toggleItalic().run()"><em>I</em></button>
        <button :disabled="!editor || showSource" @click="editor?.chain().focus().toggleUnderline().run()">U</button>

        <!-- Source HTML toggle -->
        <button
          @click="toggleSource"
          :class="{ 'is-active': showSource }"
          title="View / edit source HTML">
          &lt;&gt;
        </button>

        <!-- Link -->
        <button :disabled="!editor || showSource" @click="setLinkUrl" title="Insert link">🔗</button>

        <!-- Image upload from PC -->
        <button :disabled="!editor || showSource || uploading" @click="triggerFileUpload" title="Upload image from computer">🖼</button>

        <!-- Image via URL -->
        <button :disabled="!editor || showSource" @click="addImageByUrl" title="Insert image by URL">🌐</button>

        <!-- Media library -->
        <button :disabled="!editor || showSource" @click="openLibrary" title="Choose from library">📁</button>
   <!-- Remove selected image -->
        <button :disabled="!editor || showSource || !editor?.isActive('image')"
                @click="removeSelectedImage"
                title="Remove selected image">🗑</button>
      </div>

    <!-- hidden file picker -->
    <input ref="fileInput" type="file" accept="image/*"
           style="display:none" @change="onFileSelected" />

    <!-- upload loader (inline bar) -->
    <div v-if="uploading" class="editorUploadingBar">
      <span class="spinner"></span> Uploading image…
    </div>

    <!-- SOURCE view -->
    <textarea v-if="showSource"
      class="editor-source form-input"
      v-model="sourceHtml"
      @input="onSourceInput"
      spellcheck="false"
      rows="12"></textarea>

    <!-- WYSIWYG -->
    <EditorContent v-else-if="editor" :editor="editor" :placeholder="placeholder" class="editor-box" />

    <!-- Media Library Modal -->
    <MediaLibraryModal v-model="showLibrary" @select="onLibrarySelect" />
  </div>
</template>

<style scoped>
.editorUploadingBar {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.74rem;
  color: var(--ink-dim);
  padding: 8px 10px;
  border-bottom: 1.5px solid var(--border);
  background: var(--surface);
}
.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--border);
  border-top-color: var(--teal, #14b8a6);
  border-radius: 50%;
  display: inline-block;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.editor-source {
  width: 100%;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.76rem;
  line-height: 1.6;
  resize: vertical;
  min-height: 220px;
}
.is-active {
  background: var(--teal, #14b8a6);
  color: #fff;
}
</style>