<script setup lang="ts">
import Loading from '@/components/loaders/Loading.vue'
import { ref, computed } from 'vue';

const props = defineProps<{
  modelValue: boolean
}>()
const emit = defineEmits(["update:modelValue", "saved"]);

const { $api,$toast } = useNuxtApp()
const fullLoading= ref<boolean>(false);

/*
 * ── Role Matrix ─────────────────────────────────────────────────────────────
 *
 * This used to be two wide grids: every AREA as a column, every ROLE as a row.
 * It broke down for a structural reason — there are 10 admin areas and 8 institute
 * areas but only 4 and 2 roles. The axis that GROWS was the horizontal one, so the
 * table overflowed (Settings and Notifications were cut off the right edge) and it
 * would only get worse with each new portal page. A wide grid also has nowhere to
 * explain what a level actually grants, which is the thing nobody could tell.
 *
 * So: ONE ROLE AT A TIME. Pick a role, get a vertical list of its areas, each with
 * a plain-English line saying what the levels do for that area. Areas can grow
 * forever — they're rows now, and vertical scrolling is free.
 *
 * Edits to every role are held in memory and written together on Save, so switching
 * roles never loses work. Roles with unsaved edits are marked with a dot.
 *
 * Roles are split by which app they can sign in to. institution-admin and professor
 * cannot log in to pm-admin at all (see the allow-list in Api_authController::login),
 * so they only ever show institute areas. The backend save is column-driven — writing
 * only the institute columns for those roles leaves their other columns untouched
 * rather than blanking them.
 */

/*
 * ── The level ladder ────────────────────────────────────────────────────────
 * Levels are CUMULATIVE — each one contains the one below it:
 *
 *   none    the page is hidden from the sidebar; the API 403s
 *   view    read-only
 *   edit    view + create + update
 *   full    edit + DESTRUCTIVE / IRREVERSIBLE — delete, publish, declare,
 *           broadcast, revoke a seat
 *
 * `full` is displayed as "manage". "Full" read as "the maximum, obviously fine for
 * an admin", so everyone picked it by default; "manage" reads as "this person can
 * delete things", which is what it grants. The stored value is still 'full' — a
 * label change, not a data migration.
 *
 * ── Why the levels differ per area ──────────────────────────────────────────
 * A single 4-level scale on every area was a lie. `reports` has one endpoint
 * (GET /reports/generate) — there is no "editing a report", so `edit` and `full`
 * there looked like grants but gated nothing. Same for Students — check-in emails
 * are its only mutation, so there is nothing there to destroy.
 *
 * AREA_LEVELS mirrors Permission::AREA_LEVELS in the Laravel model, which is the
 * real boundary (it clamps on save AND on read). This copy only decides which
 * options we offer, so an admin cannot pick a level that means nothing.
 */
type Level = 'full' | 'edit' | 'view' | 'none'

/** Weakest → strongest. The segmented control renders in this order. */
const LADDER: Level[] = ['none', 'view', 'edit', 'full']

/** What the admin reads. Value stays `full`; only the label says "manage". */
const LEVEL_LABEL: Record<Level, string> = {
  none: 'none',
  view: 'view',
  edit: 'edit',
  full: 'manage',
}

/**
 * Levels each area can actually honour — keep in step with
 * laravel/app/Models/Permission.php :: AREA_LEVELS.
 */
const AREA_LEVELS: Record<string, Level[]> = {
  students:      ['none', 'view', 'edit'],
  mock_exams:    ['none', 'view', 'edit', 'full'],
  assign_exams:  ['none', 'view', 'edit', 'full'],
  question_bank: ['none', 'view', 'edit', 'full'],
  reports:       ['none', 'view'],
  seats_cohorts: ['none', 'view', 'edit', 'full'],
  inst_settings: ['none', 'view', 'edit', 'full'],
  notifications: ['none', 'view', 'edit'],
}

const levelsFor = (key: string): Level[] => AREA_LEVELS[key] ?? LADDER

const rank = (l: Level) => LADDER.indexOf(l)   // none=0 … full=3

/**
 * Clamp a value into what the area supports — DOWNWARD only, never up.
 * A row saved before AREA_LEVELS existed can hold `reports: full`; that shows as
 * `view` (the strongest level reports has) rather than a phantom capability.
 */
const clamp = (key: string, value: string): Level => {
  const v = String(value || '').toLowerCase() as Level
  const allowed = levelsFor(key)

  if (allowed.includes(v)) return v
  if (!LADDER.includes(v)) return 'none'          // garbage in → deny

  const want = rank(v)
  return allowed.filter(l => rank(l) <= want).sort((a, b) => rank(b) - rank(a))[0] ?? 'none'
}

/*
 * Areas, with the one thing the old UI could never say: what the level MEANS here.
 * `hint` is written for the person granting the permission, not the person holding
 * it — it names the riskiest thing the top level unlocks.
 */
const ADMIN_COLS = [
  { key: 'users',         label: 'Users',         hint: 'Accounts and subscriptions. Manage can delete a user.' },
  { key: 'question_bank', label: 'Questions',     hint: 'Questions, import review, taxonomy.' },
  { key: 'exams',         label: 'Exams',         hint: 'Exams and exam categories.' },
  { key: 'institutions',  label: 'Institutions',  hint: 'Institution records and their seats.' },
  { key: 'payments',      label: 'Payments',      hint: 'Payments, refunds, promo codes.' },
  { key: 'content',       label: 'Content',       hint: 'Pages and FAQs.' },
  { key: 'notifications', label: 'Notifications', hint: 'Notifications and email templates.' },
  { key: 'analytics',     label: 'Analytics',     hint: 'Dashboards and platform metrics.' },
  { key: 'support',       label: 'Support',       hint: 'Support flags and user feedback.' },
  { key: 'settings',      label: 'Settings',      hint: 'Admin users, this matrix, audit log. Manage unlocks the raw SQL tools.' },
] as const

const INSTITUTE_COLS = [
  { key: 'students',      label: 'Students',        hint: 'Roster and check-in emails. Nothing here can be deleted, so there is no manage.' },
  { key: 'mock_exams',    label: 'Mock Exams',      hint: 'Manage can declare results to students and delete an exam. Neither can be undone.' },
  { key: 'assign_exams',  label: 'Assign Exams',    hint: 'Manage can delete an assignment, removing the exam from every student who had it.' },
  { key: 'question_bank', label: 'Question Bank',   hint: 'Edit can author and import. Manage can approve questions into the live bank students sit.' },
  { key: 'reports',       label: 'Reports',         hint: 'Read-only by nature — there is nothing here to change.' },
  { key: 'seats_cohorts', label: 'Seats and Cohorts', hint: 'Manage can delete a cohort and remove a student, which revokes their seat.' },
  { key: 'inst_settings', label: 'Settings',        hint: 'Edit covers program details and thresholds. Manage can invite and remove admins and professors.' },
  { key: 'notifications', label: 'Notifications',   hint: 'Their own inbox. Contacting PassMed support is always allowed, whatever this is set to.' },
] as const

type Portal = 'admin' | 'institute'

const ROLES: Array<{ role: string; label: string; portal: Portal }> = [
  { role: 'super-admin',       label: 'Super Admin',       portal: 'admin' },
  { role: 'admin',             label: 'Admin',             portal: 'admin' },
  { role: 'content-admin',     label: 'Content Admin',     portal: 'admin' },
  { role: 'support-admin',     label: 'Support Admin',     portal: 'admin' },
  { role: 'institution-admin', label: 'Institution Admin', portal: 'institute' },
  { role: 'professor',         label: 'Professor',         portal: 'institute' },
]

const colsFor = (portal: Portal) => (portal === 'admin' ? ADMIN_COLS : INSTITUTE_COLS)

// `full` means "as much as this area can give" — clamped per area, so Reports lands
// on `view` (its ceiling) rather than a level the backend would clamp back anyway.
const fill = (cols: readonly { key: string }[], level: Level) =>
  Object.fromEntries(cols.map(c => [c.key, clamp(c.key, level)]))

/*
 * Presets. The common case is "read-only everywhere, then override two areas" —
 * doing that by hand was 10 dropdowns. `apply` is clamped, so a preset can never
 * set a level an area doesn't have.
 */
const PRESETS: Record<Portal, Array<{ id: string; label: string; desc: string; build: () => Record<string, Level> }>> = {
  admin: [
    { id: 'none',  label: 'No access',  desc: 'Locked out of every area.',            build: () => fill(ADMIN_COLS, 'none') },
    { id: 'read',  label: 'Read-only',  desc: 'Can see everything, change nothing.',  build: () => fill(ADMIN_COLS, 'view') },
    { id: 'edit',  label: 'Standard',   desc: 'Create and update, but never delete.', build: () => fill(ADMIN_COLS, 'edit') },
    { id: 'full',  label: 'Full access', desc: 'Everything, including deletes.',      build: () => fill(ADMIN_COLS, 'full') },
  ],
  institute: [
    { id: 'none', label: 'No access', desc: 'Signs in, sees only Dashboard and Help.', build: () => fill(INSTITUTE_COLS, 'none') },
    { id: 'read', label: 'Read-only', desc: 'Can see the portal, change nothing.',     build: () => fill(INSTITUTE_COLS, 'view') },
    {
      id: 'teaching',
      label: 'Teaching staff',
      desc: 'Runs exams and authors questions, but cannot publish, delete or touch seats.',
      build: () => ({
        ...fill(INSTITUTE_COLS, 'view'),
        students:      'edit',
        mock_exams:    'edit',
        assign_exams:  'edit',
        question_bank: 'edit',
      }),
    },
    { id: 'full', label: 'Full access', desc: 'Everything, including deletes and publishing.', build: () => fill(INSTITUTE_COLS, 'full') },
  ],
}

/*
 * Fallbacks, used only for roles with no row in `permissions` yet. Anything already
 * saved is merged over these on open (see loadPermissions) — the rows used to be
 * hardcoded, so hitting Save wrote these defaults back over every role and silently
 * discarded whatever was configured.
 */
const defaultRows = (): Record<string, any> => ({
  'super-admin':   fill(ADMIN_COLS, 'full'),
  'admin':         fill(ADMIN_COLS, 'full'),
  // Content Admin lives in the question bank and CMS; no billing, no settings.
  'content-admin': { ...fill(ADMIN_COLS, 'none'), users: 'view', question_bank: 'full', exams: 'edit', content: 'full', analytics: 'view' },
  // Support Admin answers tickets and looks users up; read-only elsewhere.
  'support-admin': { ...fill(ADMIN_COLS, 'none'), users: 'edit', question_bank: 'view', support: 'full', notifications: 'edit', payments: 'view', institutions: 'view' },
  // Institution Admin runs the portal — unrestricted unless an admin dials it back.
  'institution-admin': fill(INSTITUTE_COLS, 'full'),
  // Professor starts with no access; grant it explicitly here.
  'professor':         fill(INSTITUTE_COLS, 'none'),
})

/** role → { area: level }. One flat store; the UI just windows into it. */
const rows      = ref<Record<string, any>>(defaultRows())
/** Snapshot of what the server gave us, to mark roles as dirty. */
const saved     = ref<string>('')
const activeRole = ref<string>('institution-admin')

const activeMeta = computed(() => ROLES.find(r => r.role === activeRole.value)!)
const activeCols = computed(() => colsFor(activeMeta.value.portal))
const activeRow  = computed(() => rows.value[activeRole.value] ?? {})
const activePresets = computed(() => PRESETS[activeMeta.value.portal])

/** Does this role differ from what's on the server? Drives the unsaved dot. */
const isDirty = (role: string): boolean => {
  try {
    const base = JSON.parse(saved.value || '{}')
    return JSON.stringify(base[role] ?? {}) !== JSON.stringify(rows.value[role] ?? {})
  } catch { return false }
}
const dirtyCount = computed(() => ROLES.filter(r => isDirty(r.role)).length)

const setLevel  = (area: string, level: Level) => { rows.value[activeRole.value][area] = clamp(area, level) }
const applyPreset = (build: () => Record<string, Level>) => {
  rows.value[activeRole.value] = { ...rows.value[activeRole.value], ...build() }
}

/** Which preset (if any) the current row exactly matches — so the chip can light up. */
const activePresetId = computed(() => {
  const row = activeRow.value
  const hit = activePresets.value.find(p =>
    activeCols.value.every(c => row[c.key] === (p.build() as any)[c.key]),
  )
  return hit?.id ?? null
})

/** Count of areas this role can destroy things in — the number worth double-checking. */
const manageCount = computed(() =>
  activeCols.value.filter(c => activeRow.value[c.key] === 'full').length,
)

const loadPermissions = async () => {
  const next = defaultRows()

  try {
    const res: any = await $api.get('/permissions')
    const obj: any = res?.data

    if (obj?.status === 'success' && Array.isArray(obj.data)) {
      for (const meta of ROLES) {
        const row = obj.data.find((d: any) => String(d?.role || '').toLowerCase() === meta.role)
        if (!row) continue

        for (const col of colsFor(meta.portal)) {
          const value = String(row[col.key] ?? '').toLowerCase()
          // Clamp on the way in: a row written before the per-area sets existed may
          // hold a level this area no longer offers (e.g. reports: 'full').
          if (LADDER.includes(value as Level)) next[meta.role][col.key] = clamp(col.key, value)
        }
      }
    }
  } catch (err) {
    // Fall back to defaults; the user can still set values and save.
    $toast('Could not load saved permissions, showing defaults.', 'error')
  }

  rows.value  = next
  saved.value = JSON.stringify(next)
}

watch(() => props.modelValue, (open) => {
  if (open) loadPermissions()
}, { immediate: true })

const closeModal = () => emit("update:modelValue", false)

const saveChanges = async () => {
    closeModal();
    fullLoading.value = true;

   // Every role is sent, not just the one on screen — edits to the others are held
   // in `rows` while you switch tabs. Only the areas each role's portal owns are
   // included, so the admin and institute halves never blank each other.
   const payload = ROLES.map(meta => Object.fromEntries([
     ['role', meta.role],
     ...colsFor(meta.portal).map(c => [c.key, rows.value[meta.role][c.key]]),
   ]))

  try {
      const res:any = await $api.post('/permissions/save',payload);

     if (res.data.status === "success") {
        emit('saved', true)
        fullLoading.value = false;
        saved.value = JSON.stringify(rows.value)
        const message = res?.data?.msg || 'Save record is successfully.'
        $toast(message,'success');
    }else{
        const message = res?.data?.msg || 'Save record is failed.'
        $toast(message,'error');
        fullLoading.value = false;
    }
  } catch (err:any) {
    fullLoading.value = false;
      const message = err?.response?.data?.message || err?.response?.data?.msg || 'Save record is failed.'
     $toast(message,'error');
  }
};
</script>

<template>
    <Loading v-if="fullLoading" />
    <div
    v-if="modelValue"
    class="overlay overlay-top open"
    @click.self="closeModal">

        <div class="drawer perm-drawer">
            <div class="drawer-header">
              <div class="fullheadsec">
                <div class="perm-eyebrow">Edit Permissions</div>
              </div>
              <button class="drawer-close" type="button" @click="closeModal">
                <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="13"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>
              </button>
            </div>

            <div class="drawer-body">
              <form v-on:submit.prevent="saveChanges">

                <!-- ── Role picker ──────────────────────────────────────────
                     One role at a time. Edits to the others are kept in memory
                     and all roles are written together on Save, so switching
                     tabs never loses work — the dot marks what's unsaved. -->
                <div class="perm-rolebar">
                  <div class="perm-rolegroup">
                    <span class="perm-rolegroup-label">Admin panel</span>
                    <button v-for="r in ROLES.filter(r => r.portal === 'admin')" :key="r.role"
                      type="button"
                      class="perm-roletab"
                      :class="{ active: activeRole === r.role }"
                      @click="activeRole = r.role">
                      {{ r.label }}
                      <span v-if="isDirty(r.role)" class="perm-dot" title="Unsaved changes"></span>
                    </button>
                  </div>
                  <div class="perm-rolegroup">
                    <span class="perm-rolegroup-label">Institute portal</span>
                    <button v-for="r in ROLES.filter(r => r.portal === 'institute')" :key="r.role"
                      type="button"
                      class="perm-roletab"
                      :class="{ active: activeRole === r.role }"
                      @click="activeRole = r.role">
                      {{ r.label }}
                      <span v-if="isDirty(r.role)" class="perm-dot" title="Unsaved changes"></span>
                    </button>
                  </div>
                </div>

                <!-- ── Presets ─────────────────────────────────────────────── -->
                <div class="perm-presets">
                  <span class="perm-presets-label">Start from</span>
                  <button v-for="p in activePresets" :key="p.id"
                    type="button"
                    class="perm-preset"
                    :class="{ active: activePresetId === p.id }"
                    :title="p.desc"
                    @click="applyPreset(p.build)">{{ p.label }}</button>
                </div>

                <!-- ── Areas ───────────────────────────────────────────────── -->
                <div class="perm-list">
                  <div v-for="col in activeCols" :key="col.key" class="perm-row">
                    <div class="perm-row-main">
                      <div class="perm-row-name">{{ col.label }}</div>
                      <!-- The thing the old wide grid had no room to say. -->
                      <div class="perm-row-hint">{{ col.hint }}</div>
                    </div>

                    <!-- Segmented control, not a dropdown: the whole ladder is
                         visible, so you can see that `manage` exists here and
                         `edit` is one step down without opening anything. Areas
                         with no destructive action simply don't render `manage`. -->
                    <div class="perm-seg" role="group" :aria-label="col.label">
                      <button v-for="opt in levelsFor(col.key)" :key="opt"
                        type="button"
                        class="perm-seg-btn"
                        :class="[`is-${opt}`, { on: activeRow[col.key] === opt }]"
                        :aria-pressed="activeRow[col.key] === opt"
                        @click="setLevel(col.key, opt)">{{ LEVEL_LABEL[opt] }}</button>
                    </div>
                  </div>
                </div>

                <!-- ── Legend ──────────────────────────────────────────────── -->
                <div class="perm-legend">
                  <span><b>none</b> hidden</span>
                  <span><b>view</b> read-only</span>
                  <span><b>edit</b> view + create + update</span>
                  <span class="danger"><b>manage</b> edit + delete, publish, revoke</span>
                  <span class="perm-legend-note">Each level includes the ones before it.</span>
                </div>

                <div class="perm-actions">
                  <!-- Two numbers worth seeing before you commit: how many areas
                       this role can destroy things in, and how many roles you've
                       edited but not saved. -->
                  <div class="perm-summary">
                    <span v-if="manageCount" class="perm-warn">
                      {{ activeMeta.label }} can delete or publish in {{ manageCount }}
                      {{ manageCount === 1 ? 'area' : 'areas' }}.
                    </span>
                    <span v-else class="perm-ok">{{ activeMeta.label }} cannot delete or publish anywhere.</span>
                    <span v-if="dirtyCount" class="perm-dirty">
                      {{ dirtyCount }} {{ dirtyCount === 1 ? 'role has' : 'roles have' }} unsaved changes.
                    </span>
                  </div>

                  <div class="perm-buttons">
                    <button class="btn btn-primary" type="submit">Save Changes</button>
                    <button class="btn btn-outline" type="button" @click="closeModal">Cancel</button>
                  </div>
                </div>
              </form>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* The old drawer was 1040px because a 10-column grid needed it — and still
   overflowed. A single list needs far less. */
.perm-drawer { width: 720px; max-width: 96vw; }

.perm-eyebrow {
  font-size: 0.65rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: 2px; color: var(--ink-dim); margin-bottom: 6px;
}

/* ── Role picker ─────────────────────────────────────────────────────────── */
.perm-rolebar {
  display: flex; flex-wrap: wrap; gap: 18px;
  padding-bottom: 12px; margin-bottom: 14px;
  border-bottom: 1px solid var(--border);
}
.perm-rolegroup { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
.perm-rolegroup-label {
  font-size: 0.6rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: 1px; color: var(--ink-faint); margin-right: 3px;
}
.perm-roletab {
  display: inline-flex; align-items: center; gap: 5px;
  border: 1px solid var(--border); background: var(--surface);
  color: var(--ink-dim); border-radius: 999px;
  padding: 4px 12px; font-size: 0.72rem; cursor: pointer;
}
.perm-roletab:hover { border-color: var(--teal, #14b8a6); color: var(--teal, #14b8a6); }
.perm-roletab.active {
  background: var(--teal, #14b8a6); border-color: var(--teal, #14b8a6); color: #fff;
}
.perm-dot { width: 5px; height: 5px; border-radius: 50%; background: #f59e0b; }
.perm-roletab.active .perm-dot { background: #fff; }

/* ── Presets ─────────────────────────────────────────────────────────────── */
.perm-presets { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
.perm-presets-label { font-size: 0.68rem; color: var(--ink-faint); margin-right: 2px; }
.perm-preset {
  border: 1px solid var(--border); background: var(--surface); color: var(--ink-dim);
  border-radius: 6px; padding: 3px 10px; font-size: 0.68rem; cursor: pointer;
}
.perm-preset:hover { border-color: var(--teal, #14b8a6); color: var(--teal, #14b8a6); }
.perm-preset.active { border-color: var(--teal, #14b8a6); color: var(--teal, #14b8a6); background: #f0fdfa; }

/* ── Area rows ───────────────────────────────────────────────────────────── */
.perm-list { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.perm-row {
  display: flex; align-items: center; gap: 16px;
  padding: 10px 14px; border-bottom: 1px solid var(--border);
}
.perm-row:last-child { border-bottom: 0; }
.perm-row:hover { background: var(--surface); }
.perm-row-main { flex: 1; min-width: 0; }
.perm-row-name { font-size: 0.82rem; font-weight: 600; color: var(--ink); }
.perm-row-hint { font-size: 0.68rem; color: var(--ink-faint); line-height: 1.45; margin-top: 1px; }

/* Segmented control — the whole ladder visible at once. Fixed width so the
   controls line up down the page even when an area has only three levels. */
.perm-seg { display: flex; gap: 3px; flex: 0 0 auto; }
.perm-seg-btn {
  min-width: 58px; text-align: center;
  border: 1px solid var(--border); background: var(--surface-2, #fff);
  color: var(--ink-faint); border-radius: 6px;
  padding: 5px 8px; font-size: 0.68rem; cursor: pointer;
}
.perm-seg-btn:hover { border-color: var(--border-strong, #cbd5e1); color: var(--ink); }

/* Selected state carries the meaning: manage is red because it destroys things.
   The old UI rendered `manage` and `none` as identical white boxes. */
.perm-seg-btn.on.is-none  { background: #f1f5f9; border-color: #cbd5e1; color: #475569; font-weight: 600; }
.perm-seg-btn.on.is-view  { background: #eff6ff; border-color: #93c5fd; color: #1d4ed8; font-weight: 600; }
.perm-seg-btn.on.is-edit  { background: #ecfdf5; border-color: #6ee7b7; color: #047857; font-weight: 600; }
.perm-seg-btn.on.is-full  { background: #fff1f2; border-color: #fda4af; color: #be123c; font-weight: 600; }

/* ── Legend ──────────────────────────────────────────────────────────────── */
.perm-legend {
  display: flex; flex-wrap: wrap; gap: 4px 14px;
  margin-top: 12px; font-size: 0.66rem; color: var(--ink-faint);
}
.perm-legend b { color: var(--ink-dim); font-weight: 700; }
.perm-legend .danger b { color: #be123c; }
.perm-legend-note { flex-basis: 100%; color: var(--ink-faint); opacity: 0.85; }

/* ── Footer ──────────────────────────────────────────────────────────────── */
.perm-actions {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; margin-top: 16px; flex-wrap: wrap;
}
.perm-summary { display: flex; flex-direction: column; gap: 2px; font-size: 0.68rem; }
.perm-warn  { color: #be123c; }
.perm-ok    { color: var(--ink-faint); }
.perm-dirty { color: #b45309; }
.perm-buttons { display: flex; gap: 8px; flex: 0 0 auto; }
.perm-buttons .btn-primary { min-width: 180px; }
</style>
