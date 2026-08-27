import Image from '@tiptap/extension-image'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ImageNodeView from '@/components/editor/ImageNodeView.vue'

export const ImageWithDelete = Image.extend({
  addNodeView() {
    return VueNodeViewRenderer(ImageNodeView as any)
  },
})