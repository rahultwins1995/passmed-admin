<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()
const { $api } = useNuxtApp()

const logoutPage =async (e:any) => {
  e.preventDefault();
    await auth.logout($api);
    navigateTo('/login');
}

/**
 * Multiple Dropdown Support
 */

const openDrops = ref<string[]>([])
const onClickDroplist = (key: string) => {
  if (openDrops.value.includes(key)) {
    openDrops.value = openDrops.value.filter(item => item !== key)
  } else {
    openDrops.value.push(key)
  }
}
const isDropOpen = (key: string) => {
    return openDrops.value.includes(key);
}

</script>

<template>
<aside class="sidebar">
    <div class="sidebar-logo">
        <img class="wraplogoimg" src="/assets/images/logosvg.svg" alt="Passmed US Logo"/>
        <span class="admin-badge">Admin</span>
    </div>

    <nav class="sidebar-nav">
        <div class="nav-section-label">Overview</div>
        <NuxtLink
         to="/dashboard" 
        class="nav-item" 
        :class="{ active: route.path === '/dashboard' }">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>
        Dashboard
    </NuxtLink>

      <div  v-if="can('users') || can('institutions') || can('payments') || can('exams') || can('question_bank')"
      class="nav-section-label">Management</div>
      <NuxtLink
         v-if="can('users')"
         to="/dashboard/users" 
        class="nav-item" 
       :class="{ active: route.path === '/dashboard/users' }">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
      stroke-width="2" stroke-linecap="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 00-3-3.87"></path><path d="M16 3.13a4 4 0 010 7.75"></path></svg>
      Users
      <!-- <span class="nav-badge">2,418</span> -->
    </NuxtLink>

    <NuxtLink
      v-if="can('question_bank')"
      to="/dashboard/questions"
       class="nav-item"
         :class="{ active: route.path === '/dashboard/questions' }">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
      stroke-linecap="round">
      <path d="M9 11l3 3L22 4"></path>
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
      </svg>
      Question Bank
      <!-- <span class="nav-badge amber">14</span> -->
    </NuxtLink>

    <div v-if="can('question_bank')"
    class="dropdownManagerwrap"
    :class="{ active: isDropOpen('exams')}">
      <div class="drptitle"
      @click="onClickDroplist('exams')">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
        Exams 
        <i class="icnsdrop"></i>
      </div>
        <div class="dropdownitemsList">
            <NuxtLink 
            to="/dashboard/exams" class="nav-item"
            :class="{ active: route.path === '/dashboard/exams' }">
              <span class="nav-icon minusdots"></span>
              Exams
            </NuxtLink>

            <NuxtLink
            to="/dashboard/exams/category"
            class="nav-item"
            :class="{ active: route.path === '/dashboard/exams/category' }"
            >
              <span class="nav-icon minusdots"></span>
              Exam Category
            </NuxtLink>

            <NuxtLink
            to="/dashboard/exams/mocks"
            class="nav-item"
            :class="{ active: route.path === '/dashboard/exams/mocks' }"
            >
              <span class="nav-icon minusdots"></span>
              Mock Exams
            </NuxtLink>
        </div>
    </div>

    <NuxtLink
    v-if="can('payments')"
    to="/dashboard/promos" class="nav-item"
      :class="{ active: route.path === '/dashboard/promos' }">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
      Discount Codes
    </NuxtLink>

    <NuxtLink 
      v-if="can('institutions')"
      to="/dashboard/institutions" class="nav-item" 
      :class="{ active: route.path === '/dashboard/institutions' }">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="7" width="20" height="14" rx="2"></rect><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"></path><line x1="12" y1="12" x2="12" y2="16"></line><line x1="10" y1="14" x2="14" y2="14"></line></svg>
      Institutions
      <!-- <span class="nav-badge teal">12</span> -->
    </NuxtLink>

    <div v-if="can('analytics')"
    class="nav-section-label">Insights</div>
    <NuxtLink 
     v-if="can('analytics')"
    to="/dashboard/analytics" class="nav-item" 
         :class="{ active: route.path === '/dashboard/analytics' }">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
      Analytics &amp; Revenue
    </NuxtLink>

    <div v-if="can('content')"
     class="nav-section-label">Platform</div>

      <NuxtLink
        v-if="can('content')"
       to="/dashboard/pages" class="nav-item"
      :class="{ active: route.path === '/dashboard/pages' }">
        <svg class="nav-icon" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"></rect>
        <path d="M3 9h18M9 21V9"></path></svg>
        Pages
      </NuxtLink>

       <NuxtLink
        v-if="can('payments')"
       to="/dashboard/payments" class="nav-item">
        <svg class="nav-icon" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"></rect><line x1="1" x2="23" y1="10" y2="10"></line></svg>
        Payments
      </NuxtLink>

      <NuxtLink
      to="/dashboard/refund"
       class="nav-item"
         :class="{ active: route.path === '/dashboard/refund' }">
      <svg class="nav-icon" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"></rect><line x1="1" x2="23" y1="10" y2="10"></line></svg>
       Refunds Request
      </NuxtLink>

      <NuxtLink 
      to="/dashboard/notification-templates" class="nav-item" 
      :class="{ active: route.path === '/dashboard/notification-templates' }">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 01-3.46 0"></path></svg>
        Notification Templates
      </NuxtLink>

      <div class="nav-section-label">Frontend FAQs</div>
      <NuxtLink 
      to="/dashboard/faqs" class="nav-item" 
      :class="{ active: route.path === '/dashboard/faqs' }">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
      stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle>
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
        FAQs
      </NuxtLink>

      <div class="nav-section-label">Question Feedback</div>
      <NuxtLink
      to="/dashboard/support-flags" class="nav-item"
      :class="{ active: route.path.startsWith('/dashboard/support-flags') }">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
        Question Feedback
      </NuxtLink>

      <div class="nav-section-label">Questions Import</div>
      <NuxtLink 
      to="/dashboard/import-conflict-review" class="nav-item" 
      :class="{ active: route.path === '/dashboard/import-conflict-review' }">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
      stroke-linecap="round">
      <path d="M9 11l3 3L22 4"></path>
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
      </svg>
       Import Conflict Review
      </NuxtLink>


<div class="dropdownManagerwrap"
    :class="{ active: isDropOpen('manager') }">
    <div class="drptitle"
     @click="onClickDroplist('manager')"
    >
      <svg class="nav-icon" viewBox="-4 -2 24 24"  fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 0h10a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V3a3 3 0 0 1 3-3zm1 7a1 1 0 1 0 0 2h8a1 1 0 0 0 0-2H4zm0 8a1 1 0 0 0 0 2h5a1 1 0 0 0 0-2H4zM4 3a1 1 0 1 0 0 2h8a1 1 0 0 0 0-2H4zm0 8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2H4z"/>
      </svg>
      Dropdown Manager 
      <i class="icnsdrop"></i>
    </div>
    
  <div class="dropdownitemsList">
          <NuxtLink 
          v-if="can('settings')"
          to="/dashboard/category" class="nav-item">
            <span class="nav-icon minusdots"></span>
          Category Manager
          </NuxtLink>

          <NuxtLink 
          v-if="can('settings')"
          to="/dashboard/domain" class="nav-item">
          <span class="nav-icon minusdots"></span>
          Domain Manager
          </NuxtLink>
          <NuxtLink 
          v-if="can('settings')"
          to="/dashboard/discipline" class="nav-item">
           <span class="nav-icon minusdots"></span>
          Discipline Manager
          </NuxtLink>

          <NuxtLink 
          v-if="can('settings')"
          to="/dashboard/subject" class="nav-item">
           <span class="nav-icon minusdots"></span>
          Subject Manager
          </NuxtLink>

          <NuxtLink
          v-if="can('settings')"
          to="/dashboard/tags" class="nav-item">
          <span class="nav-icon minusdots"></span>
          Tag Manager
          </NuxtLink>

          <!-- The last two axes to become curatable. Learning Outcome had a table, a
               model and a complete CRUD controller all along — it was simply never
               routed, so it has been invisible. Difficulty was a hardcoded array in
               five different files. -->
          <NuxtLink
          v-if="can('settings')"
          to="/dashboard/learning-outcome" class="nav-item">
          <span class="nav-icon minusdots"></span>
          Learning Outcome Manager
          </NuxtLink>

          <NuxtLink
          v-if="can('settings')"
          to="/dashboard/difficulty" class="nav-item">
          <span class="nav-icon minusdots"></span>
          Difficulty Manager
          </NuxtLink>
  </div>
</div>


<div  v-if="can('settings')"
  class="nav-section-label">
  Settings
</div>

  <NuxtLink 
  v-if="can('settings')"
  to="/dashboard/settings" class="nav-item" 
  :class="{ active: route.path === '/dashboard/settings' }">
    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
    </svg>
    Settings
  </NuxtLink>

    <div class="nav-section-label">Profile</div>
    <NuxtLink 
    to="/dashboard/profile" class="nav-item" 
    :class="{ active: route.path === '/dashboard/profile' }">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path><circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 00-3-3.87"></path>
      <path d="M16 3.13a4 4 0 010 7.75"></path>
      </svg>
      Profile
    </NuxtLink>
    <NuxtLink 
    to="/dashboard/notifications" class="nav-item" 
    :class="{ active: route.path === '/dashboard/notifications' }">
    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 01-3.46 0"></path></svg>
    Notifications
    </NuxtLink>

    </nav>

    <div class="sidebar-footer">
        <div class="admin-user cursor-pointer" @click="logoutPage">
            <div class="admin-avatar">PM</div>
            <div class="admin-info">
                <div class="admin-name">Passmed Admin</div>
                <div class="admin-role">
                  {{ auth?.user?.role_name??'Super Admin' }}
                </div>
            </div>
            <div class="logoutbtn">
            <i class="fa fa-sign-out text-gray-600 text-sm"></i>
          </div>
        </div>
    </div>
</aside>
</template>