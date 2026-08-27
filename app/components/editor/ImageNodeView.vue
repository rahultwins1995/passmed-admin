<script setup lang="ts">
import { NodeViewWrapper,nodeViewProps  } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)

const onDelete = () => {
  props.deleteNode()
}
</script>

<template>
  <NodeViewWrapper as="span" class="imgNodeWrap" :class="{ 'is-selected': selected }">
    <img :src="node.attrs.src" :alt="node.attrs.alt || ''" class="imgNode" />
    <button type="button" class="imgDeleteBtn" title="Remove image"
            @click.stop.prevent="onDelete"
            contenteditable="false">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="3" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </NodeViewWrapper>
</template>

<style scoped>
.imgNodeWrap {
  position: relative;
  display: inline-block;
  line-height: 0;
  max-width: 100%;
}
.imgNode {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  display: block;
}
.is-selected .imgNode {
  outline: 2px solid var(--teal, #14b8a6);
  outline-offset: 2px;
}
.imgDeleteBtn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  background: rgba(220, 38, 38, 0.92);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 1;
  transition: opacity .15s ease, transform .15s ease;
  box-shadow: 0 2px 6px rgba(0,0,0,0.25);
}
.imgNodeWrap:hover .imgDeleteBtn {
  opacity: 1;
}
.imgDeleteBtn:hover {
  transform: scale(1.1);
  background: rgba(185, 28, 28, 1);
}
</style>