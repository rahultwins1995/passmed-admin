<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { $api } = useNuxtApp()
const open = ref<boolean>(false)

// Dark mode. The topbar has always had this button; it just had no handler and no
// stylesheet behind it, so it was decoration. Both now exist — see
// composables/useDarkMode.ts and the body.dark block at the end of dashstyle.css.
const { isDark, toggle: toggleDark } = useDarkMode()

// Topbar title bound to the current route (was hard-coded "Dashboard").
// Prefers an explicit route.meta.title if a page sets one, else derives a
// nice label from the last non-numeric path segment.
const route = useRoute()
const TITLES: Record<string, string> = {
  dashboard: 'Dashboard', users: 'Users', questions: 'Question Bank', exams: 'Exams',
  institutions: 'Institutions', payments: 'Payments', refund: 'Refund Request', promos: 'Discount Codes',
  'import-conflict-review': 'Import Conflict Review', 'notification-templates': 'Notification Templates',
  notifications: 'Notifications', 'support-flags': 'Question Feedback', analytics: 'Analytics & Revenue',
  faqs: 'FAQs', 'portal-institute-faqs': 'Institute FAQs', 'portal-student-faqs': 'Student FAQs',
  pages: 'Pages', settings: 'Settings', profile: 'Profile', feedback: 'Feedback',
  category: 'Categories', discipline: 'Disciplines', domain: 'Domains', subject: 'Subjects', tags: 'Tags',
  'learning-outcome': 'Learning Outcomes', difficulty: 'Difficulty Levels',
}
const pageTitle = computed(() => {
  const metaTitle = route.meta?.title as string | undefined
  if (metaTitle) return metaTitle
  const segs = route.path.split('/').filter(s => s && !/^\d+$/.test(s)) // skip ids
  const key = segs[segs.length - 1] ?? 'dashboard'
  return TITLES[key] ?? key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
})

const logoutPage =async (e:any) => {
  e.preventDefault();
    await auth.logout($api);
    navigateTo('/login');
}

// ── Global search ────────────────────────────────────────────────────────────
// The topbar box used to be a dead placeholder. It now hits /admin-search, which
// returns four permission-filtered groups (users / exams / institutions /
// questions) — a group the signed-in admin can't view never comes back, so we can
// render whatever we're given without re-checking here.
//
// Groups the backend can return, in display order. Labels + the empty result shape
// both come from this one list.
const SEARCH_GROUPS: { key: 'users'|'exams'|'institutions'|'questions'|'products'; label: string }[] = [
  { key: 'users',        label: 'Users' },
  { key: 'exams',        label: 'Exams' },
  { key: 'institutions', label: 'Institutions' },
  { key: 'questions',    label: 'Questions' },
  { key: 'products',     label: 'Products' },
]
const emptyResults = () => ({ users: [], exams: [], institutions: [], questions: [], products: [] } as Record<string, any[]>)

const searchQuery   = ref<string>('')
const searchResults = ref<Record<string, any[]>>(emptyResults())
const searchOpen    = ref<boolean>(false)
const searchLoading = ref<boolean>(false)
const searchBox     = ref<HTMLElement | null>(null)

// Reset the topbar search on ANY session change. The box is a plain ref that the
// SPA doesn't tear down on logout, so without this the previous user's / previous
// session's term lingered after logout → login. Watching the auth token clears it
// whether the token drops to null (logout) or changes (a fresh login).
const clearSearch = () => {
  searchQuery.value = ''
  searchResults.value = emptyResults()
  searchOpen.value = false
}
watch(() => auth.token, () => clearSearch())

// Any group has at least one row → we have something to show.
const hasResults = computed(() => SEARCH_GROUPS.some(g => (searchResults.value[g.key] || []).length > 0))

let searchTimer: any = null
let searchSeq = 0   // guards against a slow earlier request overwriting a newer one

const runSearch = async (term: string) => {
  const q = term.trim()
  if (q.length < 2) {
    searchResults.value = emptyResults()
    searchLoading.value = false
    return
  }
  const seq = ++searchSeq
  searchLoading.value = true
  try {
    const res: any = await $api.get('/admin-search', { params: { q } })
    if (seq !== searchSeq) return                     // a newer keystroke already fired
    if (res?.data?.status === 'success') {
      searchResults.value = { ...emptyResults(), ...(res.data.data || {}) }
    } else {
      searchResults.value = emptyResults()
    }
  } catch {
    if (seq === searchSeq) searchResults.value = emptyResults()
  } finally {
    if (seq === searchSeq) searchLoading.value = false
  }
}

// Debounce keystrokes so we don't fire a request per character.
watch(searchQuery, (val) => {
  searchOpen.value = true
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => runSearch(val), 300)
})

const goToResult = (row: any) => {
  // Display-only rows (e.g. Stripe products — no per-product admin page) don't navigate.
  if (row?.noLink) return
  searchOpen.value = false
  searchQuery.value = ''
  searchResults.value = emptyResults()
  // External results (exams → the public exam page) open in a new tab via baseUrl(),
  // same as the exams-list eye button. Internal ones route inside the admin.
  if (row?.external) {
    let url = baseUrl(row.link)
    if (!String(url).startsWith('http')) url = `https://${url}`
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  navigateTo(row.link)
}

// Enter (or the "View all results" row) → the full results page. The dropdown stays
// for quick nav; the page is for when you want to browse the whole set without it
// closing under you. The URL carries the query so the page is shareable.
const goToAllResults = () => {
  const q = searchQuery.value.trim()
  if (q.length < 2) return
  searchOpen.value = false
  searchQuery.value = ''
  searchResults.value = emptyResults()
  navigateTo({ path: '/dashboard/search', query: { q } })
}

const closeSearch = () => { searchOpen.value = false }
const onSearchFocus = () => { if (searchQuery.value.trim().length >= 2) searchOpen.value = true }

const onClickDroplist=()=>{
  open.value = !open.value;
}
const unreadCount = ref<number>(0)

const fetchUnreadCount = async () => {
  try {
    const res: any = await $api.get('/notifications/unread-count')
    if (res?.data?.status === 'success') {
      unreadCount.value = Number(res.data.count) || 0
    } else {
      unreadCount.value = 0
    }
  } catch {
    unreadCount.value = 0
  }
}

// poll every 60s (Firebase/push come temporary)
let pollTimer: any = null
onMounted(() => {

  fetchUnreadCount()
  pollTimer = setInterval(fetchUnreadCount, 60000)

  const handleClick = (e: any) => {

    // Close the search dropdown on any click outside the search box.
    if (searchOpen.value && !e.target.closest('.topbar-search')) {
      searchOpen.value = false
    }

    // sidebar toggle button
    const toggle = e.target.closest('[data-action="toggle-sidebar"]')
    if (toggle) {
      document.body.classList.toggle('sidebar-open')
      return
    }

    // mobile sidebar close
    if (
      window.innerWidth <= 1024 &&
      !e.target.closest('.sidebar') &&
      !e.target.closest('[data-action="toggle-sidebar"]')
    ) {
      document.body.classList.remove('sidebar-open')
    }
  }

  document.addEventListener('click', handleClick)

  // cleanup (IMPORTANT)
  onBeforeUnmount(() => {
    document.removeEventListener('click', handleClick)
     if (pollTimer){
      clearInterval(pollTimer)  
     }
  })

})
</script>

<template>
  <div class="topbar flex justify-between items-center px-4 py-2 bg-white border-b">
    
    <!-- LEFT -->
    <div class="topbar-title font-semibold">
      {{ pageTitle }}
    </div>

    <!-- RIGHT -->
    <div class="topbar-right flex items-center gap-4">

      <!-- SEARCH -->
      <div ref="searchBox" class="topbar-search flex items-center gap-2 border px-2 py-1 rounded" style="position:relative;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="opacity:.5;flex:none;">
          <circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          v-model="searchQuery"
          @focus="onSearchFocus"
          @keydown.esc="closeSearch"
          @keydown.enter.prevent="goToAllResults"
          placeholder="Search users, exams, institutions, questions…"
          type="search"
          name="admin-global-search"
          autocomplete="off"
          data-lpignore="true"
          data-1p-ignore
          data-bwignore
          data-form-type="other"
          readonly
          onfocus="this.removeAttribute('readonly')"
          class="outline-none text-sm"
          style="min-width:230px;background:transparent;"
        />

        <!-- Results dropdown -->
        <div v-if="searchOpen && searchQuery.trim().length >= 2" class="global-search-panel">
          <div v-if="searchLoading" class="gs-state">Searching…</div>

          <template v-else-if="hasResults">
            <template v-for="grp in SEARCH_GROUPS" :key="grp.key">
              <div v-if="(searchResults[grp.key] || []).length" class="gs-group">
                <div class="gs-group-head">{{ grp.label }}</div>
                <button
                  v-for="row in searchResults[grp.key]"
                  :key="grp.key + '-' + row.id"
                  type="button"
                  class="gs-row"
                  @click="goToResult(row)"
                >
                  <span class="gs-row-title">{{ row.title }}</span>
                  <span v-if="row.subtitle" class="gs-row-sub">{{ row.subtitle }}</span>
                  <span v-if="row.meta" class="gs-row-meta">{{ row.meta }}</span>
                </button>
              </div>
            </template>
          </template>

          <div v-else class="gs-state">No matches for “{{ searchQuery.trim() }}”.</div>

          <!-- Footer: jump to the full results page (persists, doesn't close under you). -->
          <button v-if="!searchLoading && hasResults" type="button" class="gs-viewall" @click="goToAllResults">
            View all results
          </button>
        </div>
      </div>
      
      <div class="topbar-right">
        <button aria-label="Toggle navigation" class="icon-btn mobile-menu-btn"
         data-action="toggle-sidebar" type="button">
          <svg fill="none" height="15" stroke="currentColor" stroke-linecap="round" 
          stroke-width="2" viewBox="0 0 24 24" width="15">
          <line x1="3" x2="21" y1="6" y2="6"></line>
          <line x1="3" x2="21" y1="12" y2="12"></line>
          <line x1="3" x2="21" y1="18" y2="18"></line>
        </svg>
        </button>

          <NuxtLink to="/dashboard/notifications" class="icon-btn notifwrap" 
          >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 01-3.46 0"></path></svg>
          <!-- <span class="notif-dot"></span> -->
            <span v-if="unreadCount > 0" class="notif-badge">
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </span>
          </NuxtLink>

          <!-- Icon shows the CURRENT mode (sun = you are in light), the tooltip says
               what clicking does. Same convention as the student/institute portals. -->
          <button class="icon-btn themwrap" type="button"
            :title="isDark ? 'Dark mode — switch to light' : 'Light mode — switch to dark'"
            :aria-label="isDark ? 'Dark mode — switch to light' : 'Light mode — switch to dark'"
            :aria-pressed="isDark"
            @click="toggleDark()">
          <svg v-if="!isDark" width="15" height="15" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round"><circle cx="12" cy="12" r="3"></circle>
          <path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M21 12h-2M5 12H3M19.07 19.07l-1.41-1.41M5.34 5.34L3.93 3.93M12 21v-2M12 5V3"></path>
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
          </button>
      </div>
        

      <!-- DROPDOWN -->
      <div  class="dropdown topheandright"
        :class="{ open: open }"  ref="dropdownRef">

        <button @click="onClickDroplist"
          class="dropdowntoggle"
          type="button" >
          <i class="fa fa-bars text-gray-600 text-sm"></i>
        </button>

        <!-- MENU -->
        <ul class="dropdown-menu">
          <li>
            <NuxtLink class="hyitem" to="/dashboard/profile">
              Profile
            </NuxtLink>
          </li>

          <li>
            <NuxtLink @click="logoutPage">Logout</NuxtLink>
          </li>

        </ul>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* All colours come from the dashstyle.css design tokens, which flip under body.dark,
   so the dropdown follows dark mode with no extra dark rules. */
.global-search-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 380px;
  max-width: 90vw;
  max-height: 60vh;
  overflow-y: auto;
  /* --white = card token (flips to --dm-card in dark). --bg is the page bg. */
  background: var(--white, #fff);
  border: 1px solid var(--border, #e2edf4);
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(15, 31, 46, 0.14);
  z-index: 60;
  padding: 6px;
}
.gs-state {
  padding: 14px 12px;
  font-size: 0.8rem;
  color: var(--ink-dim, #7a95ad);
  text-align: center;
}
.gs-group + .gs-group { border-top: 1px solid var(--border, #e2edf4); margin-top: 4px; padding-top: 4px; }
.gs-group-head {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-dim, #7a95ad);
  padding: 8px 10px 4px;
}
.gs-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border: 0;
  background: transparent;
  border-radius: 7px;
  cursor: pointer;
  font-size: 0.82rem;
  color: var(--ink, #0f1f2e);
}
.gs-row:hover { background: var(--surface-hi, #eef6fa); }
.gs-row-title { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gs-row-sub { flex: none; max-width: 45%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.72rem; color: var(--ink-dim, #7a95ad); }
.gs-row-meta {
  flex: none;
  font-size: 0.62rem;
  font-weight: 600;
  text-transform: capitalize;
  color: var(--teal-mid, #0891b2);
  background: var(--teal-pale, #f0feff);
  padding: 1px 7px;
  border-radius: 999px;
}
.gs-viewall {
  width: 100%;
  border: 0;
  border-top: 1px solid var(--border, #e2edf4);
  margin-top: 4px;
  padding: 10px;
  background: transparent;
  color: var(--teal-mid, #0891b2);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 0 0 8px 8px;
}
.gs-viewall:hover { background: var(--surface-hi, #eef6fa); }
</style>