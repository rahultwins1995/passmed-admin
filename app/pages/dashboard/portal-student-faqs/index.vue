<!--
  Consolidated into the single tabbed FAQs page. This route now redirects to
  /dashboard/faqs (use the Student Portal tab there). Kept as a redirect so old
  links/bookmarks don't 404.
-->
<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

await navigateTo('/dashboard/faqs')
</script>

<template>
  <div></div>
</template>
