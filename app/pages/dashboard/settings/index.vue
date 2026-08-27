<script setup lang="ts">
import { ref } from 'vue'
import GeneralSettings from '@/components/settings/GeneralSettings.vue';
import AdminUsers from '@/components/settings/AdminUsers.vue';
import SecuritySettings from '@/components/settings/SecuritySettings.vue';
import Redirections from '@/components/settings/Redirections.vue';

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
});

/**
 *  set Tab
**/
const activeTab = ref('general');
const setTab =(tab:string) => {
  activeTab.value = tab;
}

</script>

<template>
 <div class="dashwrap settingwrappage">

    <div class="section-hdr">
      <div class="section-hdr-left">
          <p>Platform configuration, billing plans, integrations and admin access</p>
      </div>
    </div>

      <div class="wrapSettingsTab">
          <button class="settings-nav-item stab-general" 
            :class="{ active: activeTab === 'general' }"
            @click="setTab('general')"
            type="button">
            General
            </button>

            <button class="settings-nav-item stab-admins"
            :class="{ active: activeTab === 'admins' }"
            @click="setTab('admins')"
            type="button">
            Admin Users
            </button>

            <button class="settings-nav-item stab-security"
            :class="{ active: activeTab === 'security' }"
            @click="setTab('security')"
            type="button">
            Security
            </button>

            <button class="settings-nav-item stab-redirections"
            :class="{ active: activeTab === 'redirections' }"
            @click="setTab('redirections')"
            type="button">
            Redirections
            </button>
      </div>
</div>

    <GeneralSettings :active-tab="activeTab" />
    <AdminUsers :active-tab="activeTab" />
    <SecuritySettings :active-tab="activeTab" />
    <Redirections :active-tab="activeTab" />

</template>