<script setup lang="ts">
/*
* AdminUsers
*/
import Loader_small from '@/components/loaders/Loader_small.vue'
import Loading from '@/components/loaders/Loading.vue'
import Empty from '@/components/loaders/Empty.vue'
import Pagination from '@/components/Pagination.vue'
import AdminUserModal from '@/components/admins/AdminUserModal.vue';
import EditAdminUserModal from '@/components/admins/EditAdminUserModal.vue'
import EditPermissionModal from '@/components/permissions/EditPermissionModal.vue'
import Multiselect from '@vueform/multiselect'
import { ref, watch } from 'vue'

const props = defineProps({
  activeTab: String
});

const { $api, $toast,$confirm } = useNuxtApp()
const fullLoading = ref<boolean>(false);


const showAddAdminUserModal = ref<boolean>(false)
const openAdminAddModal=()=>{
  showAddAdminUserModal.value=true;
}

const showEditAdminUserModal = ref<boolean>(false)
const adminUserDetail = ref<any>(null);
const editAdminUserModal=(u:any)=>{
  adminUserDetail.value=u;
 showEditAdminUserModal.value=true;
}

const showPermissionModal = ref<boolean>(false);
const openPermissionModal= ()=>{
 showPermissionModal.value=true;
}

const callBackAdminUserSaved = async () => {
  fetchAdminUsersData();
}

// ── "Log as" (impersonation) ─────────────────────────────────────────────────
// Mint a short-lived, portal-scoped token for this user, then hand the browser to
// the backend enter endpoint, which sets the portal cookie and lands on the right
// dashboard (institute / student) by role. Audit-logged server-side. The admin's
// own admin-panel session is on a different token and is untouched.
// Row currently starting a login-as — drives the inline spinner so the admin
// gets instant feedback even when /login-as responds slowly.
const loggingAsId = ref<any>(null)
const loginAs = async (u: any) => {
  const confirmed = await $confirm(`Log in as ${u?.name || u?.email}? You'll open their portal exactly as they see it.`)
  if (!confirmed) return
  loggingAsId.value = u.id
  try {
    const res: any = await $api.post('/login-as', { user_id: u.id })
    const token    = res?.data?.token
    const enterUrl = res?.data?.enter_url   // portal-domain handoff endpoint (Primary Domain)
    if (res?.data?.status !== 'success' || !token || !enterUrl) {
      $toast(res?.data?.msg || 'Could not start login-as.', 'error')
      return
    }
    // Hand the SHORT-LIVED token to the portal via a hidden form POST — token in the
    // BODY (never a URL), opened in a new tab. The portal exchanges it for a session
    // and logs in. api.passmed.com is never shown; the token never lands in history.
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = enterUrl
    form.target = '_blank'
    const input = document.createElement('input')
    input.type = 'hidden'; input.name = 'token'; input.value = token
    form.appendChild(input)
    document.body.appendChild(form)
    form.submit()
    form.remove()
  } catch (err: any) {
    $toast(err?.response?.data?.msg || 'Could not start login-as.', 'error')
  } finally {
    loggingAsId.value = null
  }
}

/*
* 
admin user fetch
*/


const totalAdminUsersPages = ref(1)
const totalAdminUsersdata = ref(0)
const getAdminUsersData = ref<any[]>([])
const loadingAdminUsers=ref<boolean>(false);
const pageAdminUsersCurrent = ref(1)
const limitUsersdata = ref(10)

// ── Filters ────────────────────────────────────────────────────────────────
const filterRole = ref<string>('all')
const filterInstitution = ref<any>('all')

const roleOptions = [
  { value: 'all', label: 'All roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'super-admin', label: 'Super Admin' },
  { value: 'support-admin', label: 'Support Admin' },
  { value: 'institution-admin', label: 'Institution Admin' },
  { value: 'content-admin', label: 'Content Admin' },
  { value: 'professor', label: 'Professor' },
]

const institutionOptions = ref<any[]>([{ value: 'all', label: 'All institutions' }])

const fetchInstitutionOptions = async () => {
  try {
    const res:any = await $api.post('/institutions', { search: '', limit: 1000 })
    const list = res?.data?.data ?? []
    institutionOptions.value = [
      { value: 'all', label: 'All institutions' },
      ...list.map((i: any) => ({ value: i.institution_id, label: i.institution_name })),
    ]
  } catch {
    institutionOptions.value = [{ value: 'all', label: 'All institutions' }]
  }
}

// dd Mon yyyy, HH:mm  (blank-safe)
const formatLastLogin = (val: any) => {
  if (!val) return '—'
  const d = new Date(String(val).replace(' ', 'T'))
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const fetchAdminUsersData = async () => {
  loadingAdminUsers.value = true

  try {
    const res:any = await $api.post('/admin-users', {
      page: pageAdminUsersCurrent.value,
      limit: limitUsersdata.value,
      role: filterRole.value,
      institution_id: filterInstitution.value,
    })

    const obj:any = res.data

    if (obj.status === 'success') {
      totalAdminUsersdata.value = obj.total
      totalAdminUsersPages.value = Math.ceil(obj.total / obj.limit)
      pageAdminUsersCurrent.value = obj.current_page
      getAdminUsersData.value = obj.data
    } else {
      getAdminUsersData.value = []
      totalAdminUsersdata.value = 0
      totalAdminUsersPages.value = 1
      pageAdminUsersCurrent.value = 1
    }
  } catch (err) {
   
    getAdminUsersData.value = []
    totalAdminUsersdata.value = 0
    totalAdminUsersPages.value = 1
    pageAdminUsersCurrent.value = 1
  } finally {
    loadingAdminUsers.value = false
  }
}

const confirmAdminUserDelete= async (id="0")=>{
      const confirmed = await $confirm('Are you sure you want to remove this item?')
    if (confirmed) {
            addAdminUserDelete(id)
    }
}

const addAdminUserDelete = async (id="0") => {

    if(!id || id == '0'){
         $toast('Deletion failed','error');
        return;
    }   

  fullLoading.value = true

  try {
    const res:any = await $api.delete("/users/delete/"+id)
    const obj:any = res.data
    if (obj.status === 'success') {
        fullLoading.value = false
          const message = res?.data?.msg || 'Deleted successfully.';
         $toast(message);
        fetchAdminUsersData()
    }else{
      fullLoading.value = false
     const message = res?.data?.msg || 'Deletion failed';
      $toast(message,'error');
    } 

  } catch (err:any) {
   
      const message = err?.response?.data?.message || 'Deletion failed.';
      fullLoading.value = false
     $toast(message,'error');

  }
}


/*
* Permission Role Matrix
*/
const getBadgeClass = (val: string) => {
return {
full: 'badge-green',
edit: 'badge-blue',
view: 'badge-gray',
none: 'badge-red'
}[val]
}

const getPermissionData = ref<any[]>([])
const loaderPermission=ref<boolean>(false);

/**
 * Admin-panel areas, in display order — one per pm-admin sidebar feature.
 * Enforced server-side by the perm: middleware on /api/v1/*.
 */
const ADMIN_AREA_COLS = [
  { key: 'users',         label: 'Users' },
  { key: 'question_bank', label: 'Questions' },   // + import review + taxonomy
  { key: 'exams',         label: 'Exams' },       // + exam categories
  { key: 'institutions',  label: 'Institutions' },
  { key: 'payments',      label: 'Payments' },    // + refunds + promos
  { key: 'content',       label: 'Content' },     // pages + FAQs
  { key: 'notifications', label: 'Notifications' },
  { key: 'analytics',     label: 'Analytics' },
  { key: 'support',       label: 'Support' },
  { key: 'settings',      label: 'Settings' },
] as const

/** Only roles that can actually sign in to the admin panel. */
const ADMIN_PANEL_ROLES = ['super-admin', 'admin', 'content-admin', 'support-admin']

/**
 * institution-admin and professor are deliberately EXCLUDED: they sign in to the
 * institute portal, not here, so admin-panel areas mean nothing for them. Their
 * matrix lives on the institute side (Institute Portal Matrix, below).
 */
const adminPermissionData = computed(() =>
  getPermissionData.value.filter(p => ADMIN_PANEL_ROLES.includes(String(p?.role || '').toLowerCase())),
)

/**
 * Institute-portal areas, in display order. These columns live on the same
 * `permissions` row as the admin-panel ones; they gate /institute/* pages and
 * are enforced server-side by the perm: middleware on api-institute routes.
 */
const INSTITUTE_AREA_COLS = [
  'students',
  'mock_exams',
  'assign_exams',
  'question_bank',
  'reports',
  'seats_cohorts',
  'inst_settings',
  'notifications',
] as const

/** Only the two roles that can actually sign in to the institute portal. */
const INSTITUTE_PORTAL_ROLES = ['institution-admin', 'professor']

const institutePermissionData = computed(() =>
  getPermissionData.value.filter(p => INSTITUTE_PORTAL_ROLES.includes(String(p?.role || '').toLowerCase())),
)

const fetchPermissionData=async () => {
  loaderPermission.value = true;

  try {
    const res:any = await $api.get("/permissions")

    const obj:any = res.data

    if (obj.status === 'success') {
  
      getPermissionData.value = obj.data;

    } else {
      getPermissionData.value = []
    }

  } catch (err) {
   
    getPermissionData.value = []
  } finally {
    loaderPermission.value = false
  }
}

watch(() => props.activeTab, async (val) => {
  if (val === "admins") {
     await fetchInstitutionOptions();
     await fetchAdminUsersData();
     await fetchPermissionData();
  }
},{ immediate: true });

watch(pageAdminUsersCurrent, async () => {
  if (props.activeTab === 'admins') {
    await fetchAdminUsersData()
  }
})

// Role / institution filter changes → reset to page 1 and refetch
watch([filterRole, filterInstitution], async () => {
  if (props.activeTab === 'admins') {
    pageAdminUsersCurrent.value = 1
    await fetchAdminUsersData()
  }
})

</script>
<template>

<Loading v-if="fullLoading" />
 <div v-if="props.activeTab === 'admins'" 
  class="dashwrap settingwrappage">

    <div class="tab-section-content settingsSection-admins active">
        <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
            <div style="font-size:0.78rem;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--ink-dim)">
            Admin Users
            </div>
            <button class="btn btn-primary btn-sm"
            type="button"
            @click="openAdminAddModal">
            Add Admin
            </button>
        </div>

        <!-- Filters -->
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">
          <div style="min-width:200px">
            <label class="form-label" style="display:block;margin-bottom:4px">Role</label>
            <Multiselect
              v-model="filterRole"
              :options="roleOptions"
              label="label"
              valueProp="value"
              :can-clear="false"
              :searchable="true"
              placeholder="Filter by role"
            />
          </div>
          <div style="min-width:240px">
            <label class="form-label" style="display:block;margin-bottom:4px">Institution</label>
            <Multiselect
              v-model="filterInstitution"
              :options="institutionOptions"
              label="label"
              valueProp="value"
              :can-clear="false"
              :searchable="true"
              placeholder="Filter by institution"
            />
          </div>
        </div>

        <table class="data-table" style="font-size: 0.82rem">
            <thead>
            <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Last Login</th>
            <th>Login As</th>
            <th style="position: sticky; right: 0; background: var(--surface)">
            Actions
            </th>
            </tr>
            </thead>
            <tbody v-if="loadingAdminUsers || getAdminUsersData.length === 0">
                <tr>
                <td  v-if="!loadingAdminUsers && getAdminUsersData.length === 0"
                class="text-center" colspan="15">
                    <Empty/>
                </td>
                <td v-else colspan="15">
                    <Loader_small />
                </td>
                </tr>
            </tbody>

            <tbody v-else>
            <tr v-for="(u, i) in getAdminUsersData" :key="i">
            <td style="font-weight: 700">{{ u.name }}</td>
            <td style="font-size: 0.75rem; color: var(--ink-dim)">
                {{ u.email }}
            </td>
        
            <td>
            <span v-if="u.role === 'super-admin'" class="badge badge-teal">
                Super Admin
            </span>
            <span v-else-if="u.role === 'admin'" class="badge badge-teal">
                Admin
            </span>

            <span v-else-if="u.role === 'institution-admin'" class="badge badge-institution">
                Institution Admin
            </span>

            <span v-else-if="u.role === 'professor'" class="badge badge-professor">
                Professor
            </span>

            <span v-else-if="u.role === 'content-admin'" class="badge badge-green">
                Content Admin
            </span>

            <span v-else-if="u.role === 'support-admin'" class="badge badge-amber">
                Support
            </span>
            <span v-else class="badge badge-teal">
                User
            </span>
            </td>
            <td>
            
            <span v-if="u.status == '1'" class="badge badge-green">
            Active
            </span>
            <span v-else class="badge badge-danger">
                Deactive
            </span>

            </td>
            <td style="font-size: 0.75rem; color: var(--ink-dim)">{{ formatLastLogin(u.last_login) }}</td>
            <td style="font-size: 0.75rem">
              <a v-if="u.is_login !== '1'"
                 href="javascript:void(0)"
                 style="color: var(--brand, #0891b2); font-weight: 700; cursor: pointer"
                 :style="{ pointerEvents: loggingAsId === u.id ? 'none' : 'auto', opacity: loggingAsId === u.id ? 0.65 : 1 }"
                 @click="loginAs(u)">
                 <svg v-if="loggingAsId === u.id" width="12" height="12" viewBox="0 0 24 24"
                      style="margin-right:4px;vertical-align:middle">
                   <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="3"
                           stroke-linecap="round" stroke-dasharray="42 14">
                     <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12"
                                       dur="0.8s" repeatCount="indefinite"/>
                   </circle>
                 </svg>
                 {{ loggingAsId === u.id ? 'Opening…' : 'Login as ' + (u.name || u.email) }}
              </a>
              <span v-else style="color: var(--ink-dim)">—</span>
            </td>
            <td   style="position: sticky; right: 0; background: var(--surface)">
            
            <span v-if="u.is_login === '1'"
                style="font-size: 0.72rem; color: var(--ink-dim)">
                You
                </span>

                <span v-else-if="u.email === 'superadmin@gmail.com' || u.email === 'admin@gmail.com'" 
                style="font-size: 0.72rem; color: var(--ink-dim)">
                Access denied
                </span>

                <div v-else style="display: flex; gap: 5px">

                <button class="btn btn-outline btn-sm" type="button"
                    @click="editAdminUserModal(u)">
                Edit
                </button
                >
                <button 
                class="btn btn-danger btn-sm" type="button"
                @click="confirmAdminUserDelete(u.id)"
                >Remove</button>
                </div>
            </td>
            </tr>
    
            </tbody>
            </table>

            <!-- PAGINATION -->
            <Pagination
            v-model:page="pageAdminUsersCurrent"
            :totalData="totalAdminUsersdata"
            :totalPages="totalAdminUsersPages"
            />

        </div>

        <!-- ── Admin Role Matrix ────────────────────────────────────────────────
             Only the four roles that sign in to THIS panel, over areas that map
             1:1 to the sidebar. institution-admin and professor were removed —
             they sign in to the institute portal, so admin areas are meaningless
             for them; they appear in the Institute Portal Matrix below instead.
        -->
        <div class="card" style="margin-top:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
            <div>
              <div style="font-size:0.78rem;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--ink-dim)">
                Admin Role Matrix
              </div>
              <div style="font-size:0.72rem;color:var(--ink-dim);margin-top:4px">
                Access to the admin panel. Questions covers import &amp; taxonomy; Payments covers refunds &amp; promos.
              </div>
            </div>
            <button  class="btn btn-outline btn-sm"
            type="button"
            @click="openPermissionModal">
            Edit permissions
            </button>
        </div>
        <div class="table-wrap">

            <table class="data-table tablePermission" style="font-size:0.82rem">
            <thead>
                <tr>
                <th>Role</th>
                <th>Assigned</th>
                <th v-for="col in ADMIN_AREA_COLS" :key="col.key">{{ col.label }}</th>
                </tr>
                </thead>

                <tbody v-if="loaderPermission || adminPermissionData.length === 0">
                <tr>
                <td class="text-center" colspan="15">
                    <Empty v-if="!loaderPermission && adminPermissionData.length === 0" />
                    <Loader_small v-else  />
                </td>
                </tr>
                </tbody>

            <tbody v-else>
                <tr v-for="(vl, i) in adminPermissionData" :key="i">
                    <td class="td-main">{{ vl?.role_name ?? '-' }}</td>
                    <td>{{ vl?.assign_total ?? '0' }}</td>
                    <td v-for="col in ADMIN_AREA_COLS" :key="col.key">
                      <span class="badge" :class="getBadgeClass(vl[col.key])">
                        {{ vl[col.key] || 'none' }}
                      </span>
                    </td>
                </tr>
            </tbody>
            </table>
        </div>
        </div>

        <!-- ── Institute Portal matrix ──────────────────────────────────────────
             Institution Admin and Professor both sign in to /institute. These
             areas map 1:1 to the portal's pages and drive its sidebar, routes
             and read-only states. Edited from the same "Edit permissions" modal.
        -->
        <div class="card" style="margin-top:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
            <div style="font-size:0.78rem;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--ink-dim)">
              Institute Portal Matrix
            </div>
            <button class="btn btn-outline btn-sm"
            type="button"
            @click="openPermissionModal">
            Edit permissions
            </button>
        </div>
        <div class="table-wrap">
            <table class="data-table tablePermission" style="font-size:0.82rem">
            <thead>
                <tr>
                <th>Role</th>
                <th>Assigned</th>
                <th>Students</th>
                <th>Mock Exams</th>
                <th>Assign Exams</th>
                <th>Question Bank</th>
                <th>Reports</th>
                <th>Seats &amp; Cohorts</th>
                <th>Settings</th>
                <th>Notifications</th>
                </tr>
            </thead>

            <tbody v-if="loaderPermission || institutePermissionData.length === 0">
                <tr>
                <td class="text-center" colspan="15">
                    <Empty v-if="!loaderPermission && institutePermissionData.length === 0" />
                    <Loader_small v-else />
                </td>
                </tr>
            </tbody>

            <tbody v-else>
                <tr v-for="(vl, i) in institutePermissionData" :key="i">
                    <td class="td-main">{{ vl?.role_name ?? '-' }}</td>
                    <td>{{ vl?.assign_total ?? '0' }}</td>
                    <td v-for="area in INSTITUTE_AREA_COLS" :key="area">
                      <span class="badge" :class="getBadgeClass(vl[area])">
                        {{ vl[area] || 'none' }}
                      </span>
                    </td>
                </tr>
            </tbody>
            </table>
        </div>
        </div>
    </div>
</div>
<AdminUserModal
  v-model="showAddAdminUserModal"
  @saved="callBackAdminUserSaved"
  />
<EditAdminUserModal
  v-model="showEditAdminUserModal"
  @saved="callBackAdminUserSaved"
  :detail="adminUserDetail"
  />
  <EditPermissionModal
  v-model="showPermissionModal"
  @saved="fetchPermissionData"
  />
</template>