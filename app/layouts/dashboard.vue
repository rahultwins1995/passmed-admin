<script setup>
import Sidebar from '@/components/sidebar/Sidebar.vue'
import Navigation from '@/components/Navigation.vue'

useHead({
  bodyAttrs: {
    class: 'app-body'
  }
})
</script>

<template>
    <ClientOnly>
      <Sidebar />
     <main id="mainContent" class="main" role="main">
       <Navigation />
      <div class="content">
        <slot />
      </div>
    </main>
      <template #fallback>
          <aside class="sidebar">
            <div class="sidebar-logo">
              <img class="wraplogoimg" src="/assets/images/logosvg.svg" alt="Passmed US Logo"/>
              <span class="admin-badge">Admin</span>
              </div>
            </aside>
            <main id="mainContent" class="main" role="main">
            <div class="topbar flex justify-between items-center px-4 py-2 bg-white border-b"></div>
            <div class="content">
            </div>
        </main>

      </template>

    </ClientOnly>

</template>
<style>
.sidebar-skeleton {
  width: 250px;
  height: 100vh;
  background: #0f172a;
}
</style>