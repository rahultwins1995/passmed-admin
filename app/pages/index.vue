<script setup lang="ts">
import Loginform from '@/components/Loginform.vue';
definePageMeta({
  middleware: 'guest'
});

</script>
<template>
 <Loginform/>
</template>
