<script setup lang="ts">
import Loading from '@/components/loaders/Loading.vue'
import { ref, watch,reactive,onMounted } from 'vue'

const props = defineProps<{
  modelValue: Boolean
  detailId: any|null
}>();

const emit = defineEmits(["update:modelValue", "saved"]);

const { $api,$toast } = useNuxtApp()
const fullLoading= ref<boolean>(false);
//Close modal
const closeModal = () => {
  emit("update:modelValue", false);
};

// Form Model (addModel)
const intsfms = {
  name: "",
  email: "",
  role: "professor",
  invive_user: "1",
  status: "1"
};

const addUserModel = reactive(intsfms);

// ── Attach existing Passmed user (no duplicate account) ──────────────────────
const existingSearch  = ref<string>('');
const existingResults = ref<any[]>([]);
const existingLoading = ref<boolean>(false);
// Role the attached user will hold IN THIS INSTITUTION (stored on the membership,
// not their global account role).
const attachRole      = ref<string>('professor');
let   searchTimer: any = null;

const searchExisting = () => {
  const q = existingSearch.value.trim();
  if (searchTimer) clearTimeout(searchTimer);
  if (q.length < 2) { existingResults.value = []; existingLoading.value = false; return; }
  existingLoading.value = true;
  searchTimer = setTimeout(async () => {
    try {
      const res:any = await $api.get('/institutions/users/search-existing', {
        query: { search: q, institution_id: props.detailId }
      });
      existingResults.value = res?.data?.data || [];
    } catch {
      existingResults.value = [];
    } finally {
      existingLoading.value = false;
    }
  }, 350);
};

const attachExisting = async (u: any) => {
  if (!props.detailId || u?.linked) return;
  closeModal();
  fullLoading.value = true;
  try {
    const res:any = await $api.post('/institutions/users/attach-admin/' + props.detailId, { user_id: u.id, role: attachRole.value });
    if (res.data.status === 'success') {
      $toast(res?.data?.msg || 'User attached to the institution.', 'success');
      emit('saved', true);
    } else {
      $toast(res?.data?.msg || 'Attach failed.', 'error');
    }
  } catch (err: any) {
    const message = err?.response?.data?.msg || err?.response?.data?.message || 'Attach failed.';
    $toast(message, 'error');
  } finally {
    fullLoading.value = false;
    existingSearch.value = '';
    existingResults.value = [];
  }
};

// Reset form
const resetForm = () => {
  Object.assign(addUserModel, intsfms);
  existingSearch.value = '';
  existingResults.value = [];
  existingLoading.value = false;
};

// Submit API
const submitAddUser = async (e:any) => {
  e.preventDefault();

    if(!props.detailId){
    return;
    }

    if (!addUserModel.name) {
    $toast("name required",'error');
    return;
    }
    if (!addUserModel.email) {
    $toast("Email required",'error');
    return;
    }

    closeModal();
    fullLoading.value = true;
    const institution_id=props.detailId;

  try {
  
    const res:any = await $api.post("/institutions/users/addByInsId/"+institution_id,addUserModel);
      emit("saved", true);

    if (res.data.status === "success") {
        fullLoading.value = false;
         emit('saved', true)

        const message = res?.data?.msg || 'Add record is successfully.'
        $toast(message,'success');
         
    }else{
        const message = res?.data?.msg || 'Add record is failed.'
        $toast(message,'error');
        fullLoading.value = false;
    }

  } catch (err:any) {
  
    fullLoading.value = false;
      const message = err?.response?.data?.msg || err?.response?.data?.message || 'Add record is failed.'
     $toast(message,'error');
  } finally{
    resetForm();
  } 
};

onMounted(() =>{
  if(!props.modelValue){
     resetForm();
  }
});

</script>

<template>
    <Loading v-if="fullLoading" />
    <div
    v-if="modelValue"
    class="overlay overlay-top open"  
    @click.self="closeModal">

        <div class="drawer" style="width:580px;max-width:97vw">
            <div class="drawer-header">
            <div class="fullheadsec">
                <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:6px">
                 Add Admin User
                </div>
                <div style="font-family:'Figtree',sans-serif;font-size:1rem;font-weight:700;color:var(--ink)">
                  Assign institutional admin access
                </div>
            </div>
            <button class="drawer-close" type="button"
            @click="closeModal"
            >
                <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="13"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>
            </button>
            </div>
            <div class="drawer-body">
                      <!-- Attach an existing Passmed account instead of creating a duplicate -->
                      <div class="form-row" style="margin-bottom:14px">
                          <label class="form-label">Attach existing Passmed user</label>

                          <!-- Role the attached user holds IN THIS INSTITUTION. Stored on
                               the membership row; their global account role is untouched. -->
                          <div style="margin-bottom:8px">
                            <label class="form-label" style="font-size:0.72rem">Attach as</label>
                            <select class="form-input form-select" v-model="attachRole">
                              <option value="professor">Professor</option>
                              <option value="institution-admin">Institution Admin</option>
                            </select>
                          </div>

                          <input class="form-input" type="text"
                            placeholder="Search existing users by email or name"
                            v-model="existingSearch"
                            @input="searchExisting" />
                          <div style="font-size:0.7rem;color:var(--ink-dim);margin-top:5px">
                            Any existing Passmed account can be attached — they keep their own
                            account and gain the role selected above inside this institution.
                          </div>

                          <div v-if="existingLoading"
                            style="font-size:0.72rem;color:var(--ink-dim);margin-top:6px">Searching…</div>

                          <div v-else-if="existingResults.length"
                            style="margin-top:6px;border:1.5px solid var(--border);border-radius:var(--r-sm);max-height:210px;overflow:auto">
                              <button v-for="u in existingResults" :key="u.id"
                                type="button"
                                :disabled="u.linked"
                                @click="attachExisting(u)"
                                style="display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;padding:9px 11px;background:none;border:none;border-bottom:1px solid var(--border);text-align:left"
                                :style="{ cursor: u.linked ? 'not-allowed' : 'pointer', opacity: u.linked ? 0.6 : 1 }">
                                  <span style="min-width:0">
                                    <span style="display:block;font-weight:600;font-size:0.82rem;color:var(--ink)">{{ u.name || '—' }}</span>
                                    <span style="font-size:0.72rem;color:var(--ink-dim)">{{ u.email }} · {{ u.role_name || u.role || 'user' }}</span>
                                  </span>
                                  <span v-if="u.linked" style="font-size:0.68rem;color:var(--amber);white-space:nowrap">Already attached</span>
                                  <span v-else style="font-size:0.72rem;color:var(--teal);font-weight:700;white-space:nowrap">Attach →</span>
                              </button>
                          </div>

                          <div v-else-if="existingSearch.trim().length >= 2"
                            style="font-size:0.72rem;color:var(--ink-dim);margin-top:6px">
                            No matching user found. Create a new user below instead.
                          </div>

                          <div class="wrapformsmall" style="margin-top:6px">
                            <small style="color:#6b7280;">
                              Found an existing Passmed account? Attach it directly — no new user is created and no password is needed.
                            </small>
                          </div>
                      </div>

                      <div style="text-align:center;font-size:0.7rem;color:var(--ink-dim);text-transform:uppercase;letter-spacing:1px;margin:2px 0 16px">
                        — or create a new user —
                      </div>

                      <div class="form-row">
                        <div class="form-row" style="margin-bottom:14px">
                            <label class="form-label">
                              Full Name:<span class="required">*</span>
                            </label>
                            <input class="form-input"
                            placeholder="Dr. Sarah Patel" type="text"
                            v-model="addUserModel.name"  
                            required/>
                        </div>
                      </div>

                      <div class="form-row" style="margin-bottom:14px">
                          <label class="form-label">
                          Email Address:<span class="required">*</span>
                        </label>
                          <input class="form-input" id="newUserEmail"
                          placeholder="s.patel@institution.edu" type="email"
                          v-model="addUserModel.email"
                            required />
                      </div>
                    <div class="form-row" style="margin-bottom:14px">
                        <div class="wrapformsmall" style="background:rgba(8,145,178,0.05);border:1.5px solid rgba(8,145,178,0.15);border-radius:var(--r-sm);padding:10px 12px">
                          <small style="color:#6b7280;">
                            An invitation email with a secure link will be sent to the user to create and set their own password. No password is set manually.
                          </small>
                        </div>
                      </div>

                      <div class="form-row-2">

                          <div class="form-row" style="margin-bottom:14px">
                              <label class="form-label">
                                Level:<span class="required">*</span>
                              </label>
                              <select class="form-input form-select" id="newUserLevel"
                              v-model="addUserModel.role" required>
                                  <option value="institution-admin">Institution Admin</option>
                                  <option value="professor">Professor</option>
                              </select>
                          </div>
                          <div class="form-row">
                                <label class="form-label">Status</label>
                                <select class="form-input form-select"
                                  v-model="addUserModel.status">
                                <option value="1">Active</option>
                                <option value="2">Pending</option>
                                <option value="0">Deactive</option>
                                </select>
                          </div>
                      </div>
                    
                    <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:var(--r-sm);padding:14px;margin-bottom:16px">
                        <div style="margin-bottom:10px">
                        <div style="font-size:0.78rem;font-weight:700;color:var(--ink);margin-bottom:2px">
                        <span style="background:rgba(8,145,178,0.1);color:var(--teal);border:1px solid rgba(8,145,178,0.25);border-radius:99px;padding:2px 8px;font-size:0.68rem;margin-right:6px">Institution Admin</span>
                        </div>
                        <div style="font-size:0.75rem;color:var(--ink-dim);margin-top:4px;padding-left:2px">
                          Full licence management: add/remove users, view all analytics, update billing 
                          contact, manage access settings.
                        </div>
                        </div>

                        <div>
                        <div style="font-size:0.78rem;font-weight:700;color:var(--ink);margin-bottom:2px">
                        <span style="background:rgba(217,119,6,0.1);color:var(--amber);border:1px solid rgba(217,119,6,0.25);border-radius:99px;padding:2px 8px;font-size:0.68rem;margin-right:6px">Professor</span>
                        </div>
                        <div style="font-size:0.75rem;color:var(--ink-dim);margin-top:4px;padding-left:2px">View student progress and performance, assign question sets and study plans. Cannot manage billing or licence settings.</div>
                        </div>
                      </div>

                      <div style="display:flex;gap:8px">
                        <button class="btn btn-primary"
                        style="flex:1"
                        type="button"
                        @click="submitAddUser">
                        Create User
                        </button>
                        <button class="btn btn-outline"  
                        type="button"
                        @click="closeModal">Cancel</button>
                      </div>
              </div>
        </div>
    </div>
</template>