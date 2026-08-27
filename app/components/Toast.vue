<script setup lang="ts">
const toast = useToast()
</script>

<template>
  <div v-if="toast.show" class="maintoastwrap toast show">
    <span
      class="toast-dot"
      :style="{
        background:
          toast.type === 'error'
            ? '#ff4d4f'
            : toast.type === 'warning'
            ? '#ffc107'
            : 'var(--teal)'
      }"
    />
    <span>{{ toast.msg }}</span>
  </div>
</template>  

