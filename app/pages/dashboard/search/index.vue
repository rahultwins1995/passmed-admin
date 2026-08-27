<script setup lang="ts">
/**
 * Global search RESULTS PAGE — /dashboard/search?q=...
 *
 * The topbar box (Navigation.vue) still shows a quick dropdown, but pressing Enter
 * or clicking "View all results" lands here. Same backend (/admin-search), same four
 * permission-filtered groups (users / exams / institutions / questions) — a group the
 * signed-in admin can't view simply doesn't come back, so nothing is re-checked here.
 *
 * Why a page and not just the dropdown: clicking a suggestion closes the dropdown,
 * which felt abrupt. Here the results persist — you can open one in a new tab, come
 * back, scan the rest.
 *
 * AUTH-gated (must be logged in) but PERMISSION-area bypassed: it's listed in
 * ADMIN_PUBLIC_PATHS (usePermission) so every signed-in admin may search regardless
 * of their role's matrix — the per-group filtering is what limits what they see.
 * (ADMIN_PUBLIC_PATHS only skips the permission-area check, NOT the login check.)
 */
import { ref, computed, watch } from 'vue'
import { onMounted } from 'vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
  title: 'Search',
})

const { $api } = useNuxtApp()
const route = useRoute()
const router = useRouter()

const SEARCH_GROUPS: { key: 'users'|'exams'|'institutions'|'questions'|'products'; label: string }[] = [
  { key: 'users',        label: 'Users' },
  { key: 'exams',        label: 'Exams' },
  { key: 'institutions', label: 'Institutions' },
  { key: 'questions',    label: 'Questions' },
  { key: 'products',     label: 'Products' },
]
const emptyResults = () => ({ users: [], exams: [], institutions: [], questions: [], products: [] } as Record<string, any[]>)

// The page's own search box, seeded from the URL. Editing it re-routes (so the URL
// stays the shareable source of truth) rather than fetching directly.
const term    = ref<string>(String(route.query.q || '').trim())
const results = ref<Record<string, any[]>>(emptyResults())
const loading = ref<boolean>(false)
const searched = ref<boolean>(false)   // false until the first query resolves

const totalCount = computed(() =>
  SEARCH_GROUPS.reduce((n, g) => n + (results.value[g.key] || []).length, 0))
const hasResults = computed(() => totalCount.value > 0)

let seq = 0
const fetchResults = async (q: string) => {
  q = q.trim()
  if (q.length < 2) {
    results.value = emptyResults()
    searched.value = false
    return
  }
  const mine = ++seq
  loading.value = true
  try {
    const res: any = await $api.get('/admin-search', { params: { q, limit: 30 } })
    if (mine !== seq) return
    results.value = res?.data?.status === 'success'
      ? { ...emptyResults(), ...(res.data.data || {}) }
      : emptyResults()
  } catch {
    if (mine === seq) results.value = emptyResults()
  } finally {
    if (mine === seq) { loading.value = false; searched.value = true }
  }
}

// The URL is the source of truth: fetch whenever ?q changes (topbar navigation,
// back/forward, a shared link, or our own submit()).
watch(() => route.query.q, (q) => {
  const val = String(q || '').trim()
  term.value = val
  fetchResults(val)
})

// Submitting the page's own box just updates the URL; the watcher above fetches.
const submit = () => {
  const q = term.value.trim()
  if (q.length < 2) return
  router.push({ path: '/dashboard/search', query: { q } })
}

// Internal results route inside the admin; external ones (exams → the public exam
// page) open in a new tab via baseUrl(), same as the exams-list eye button.
const go = (row: any) => {
  // Display-only rows (e.g. Stripe products — no per-product admin page) don't navigate.
  if (row?.noLink) return
  if (row?.external) {
    let url = baseUrl(row.link)
    if (!String(url).startsWith('http')) url = `https://${url}`
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  navigateTo(row.link)
}

onMounted(() => fetchResults(term.value))
</script>

<template>
  <div class="dashwrap">
    <div class="section-hdr">
      <div class="section-hdr-left">
        <h1 class="section-title">Search</h1>
        <p v-if="searched && term.length >= 2" class="section-sub">
          {{ totalCount }} result{{ totalCount === 1 ? '' : 's' }} for “{{ term }}”
        </p>
      </div>
    </div>

    <!-- Page search box -->
    <form class="gsp-searchbar" @submit.prevent="submit">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="opacity:.5;flex:none;">
        <circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input
        v-model="term"
        type="text"
        placeholder="Search users, exams, institutions, questions…"
        autofocus
      />
      <button type="submit" class="gsp-searchbtn">Search</button>
    </form>

    <!-- States -->
    <div v-if="loading" class="gsp-state">Searching…</div>
    <div v-else-if="term.length < 2" class="gsp-state">Type at least 2 characters to search.</div>
    <div v-else-if="searched && !hasResults" class="gsp-state">No matches for “{{ term }}”.</div>

    <!-- Grouped results -->
    <template v-else>
      <section v-for="grp in SEARCH_GROUPS" :key="grp.key" v-show="(results[grp.key] || []).length" class="gsp-group">
        <div class="gsp-group-head">
          {{ grp.label }}
          <span class="gsp-count">{{ (results[grp.key] || []).length }}</span>
        </div>
        <div class="gsp-rows">
          <button
            v-for="row in results[grp.key]"
            :key="grp.key + '-' + row.id"
            type="button"
            class="gsp-row"
            @click="go(row)"
          >
            <span class="gsp-row-main">
              <span class="gsp-row-title">{{ row.title }}</span>
              <span v-if="row.subtitle" class="gsp-row-sub">{{ row.subtitle }}</span>
            </span>
            <span v-if="row.meta" class="gsp-row-meta">{{ row.meta }}</span>
          </button>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
/* Colours come from dashstyle.css tokens, which flip under body.dark. */
.section-sub { font-size: 0.8rem; color: var(--ink-dim, #7a95ad); margin-top: 2px; }

.gsp-searchbar {
  display: flex;
  align-items: center;
  gap: 10px;
  /* --white is the CARD token (flips to --dm-card in dark). --bg is the PAGE bg
     (flips to the darker --dm-bg), which made these panels blend into the page in
     dark mode and mis-render in light. Cards must use --white, like .stat-card. */
  background: var(--white, #fff);
  border: 1px solid var(--border, #e2edf4);
  border-radius: 10px;
  padding: 9px 12px;
  margin: 14px 0 22px;
  max-width: 640px;
}
.gsp-searchbar input {
  flex: 1 1 auto;
  border: 0;
  outline: none;
  background: transparent;
  font-size: 0.9rem;
  color: var(--ink, #0f1f2e);
}
.gsp-searchbtn {
  flex: none;
  border: 0;
  background: var(--teal, #06b6d4);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 7px 16px;
  border-radius: 8px;
  cursor: pointer;
}
.gsp-searchbtn:hover { background: var(--teal-mid, #0891b2); }

.gsp-state {
  padding: 40px 12px;
  text-align: center;
  color: var(--ink-dim, #7a95ad);
  font-size: 0.88rem;
}

.gsp-group { margin-bottom: 26px; }
.gsp-group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-dim, #7a95ad);
  margin-bottom: 8px;
}
.gsp-count {
  font-size: 0.66rem;
  color: var(--teal-mid, #0891b2);
  background: var(--teal-pale, #f0feff);
  padding: 1px 8px;
  border-radius: 999px;
}
.gsp-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--white, #fff);
  border: 1px solid var(--border, #e2edf4);
  border-radius: 10px;
  padding: 6px;
}
.gsp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  border-radius: 8px;
  padding: 11px 12px;
  cursor: pointer;
}
.gsp-row:hover { background: var(--surface-hi, #eef6fa); }
.gsp-row-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.gsp-row-title { font-size: 0.88rem; color: var(--ink, #0f1f2e); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gsp-row-sub { font-size: 0.75rem; color: var(--ink-dim, #7a95ad); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gsp-row-meta {
  flex: none;
  font-size: 0.66rem;
  font-weight: 600;
  text-transform: capitalize;
  color: var(--teal-mid, #0891b2);
  background: var(--teal-pale, #f0feff);
  padding: 2px 9px;
  border-radius: 999px;
}
</style>
