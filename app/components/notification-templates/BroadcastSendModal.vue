<script setup lang="ts">

import Loading from '@/components/loaders/Loading.vue'
import Multiselect from '@vueform/multiselect'
import { ref,reactive,watch} from 'vue'
import Loader_small from '@/components/loaders/Loader_small.vue';

const { $api, $toast,$confirm } = useNuxtApp()

const fullLoader = ref(false);

const inifilitForm ={
  user_type: 'all',              // all | individual | institutional
  status: 'all',                 // all | subscriber | trialist
  exam_ids: [] as number[],      // empty = all exams
  institutions: [] as number[],  // institution_id[]; only when user_type==='institutional'; empty = all
  expiry_within_days: 0,         // 0 = no filter
  channel_email: true,           // deliver as email
  channel_in_app: false,         // deliver as in-app notification
  subject: '',
  message: ''
};


const addFormModel = reactive<any>(inifilitForm)

const resetForm = () => {
  Object.assign(addFormModel,inifilitForm)
}


//  SEND BROADCAST
const sendBroadcast = async () => {
  if (!addFormModel.channel_email && !addFormModel.channel_in_app) {
    $toast('Select at least one channel — Email or In-app.', 'error')
    return
  }
  fullLoader.value=true;
  try {
   const res:any= await $api.post('/notification-templates/broadcast', addFormModel)
   
    if(res.data.status === "success"){
      const message=res?.data.msg||"Broadcast sent";
       $toast(message);
      resetForm();
    }else{
      const message=res?.data.msg||"Failed to send broadcast";
       $toast(message);
    }

  } catch(err:any) {
    const message=err?.response?.data?.msg || err?.response?.data?.message || "Failed to send broadcast.";
    $toast(message,'error')
  }finally{
    fullLoader.value=false;
  }
}

const sendTest = async () => {

   fullLoader.value=true;
    try {
    const res:any= await $api.post('/notification-templates/testmail', addFormModel)
    
      if(res.data.status === "success"){
        const message=res?.data.msg||"Test email sent to your address";
        $toast(message);
        resetForm();
      }else{
        const message=res?.data.msg||"Failed to Test email sent";
        $toast(message);
      }

    } catch(err:any) {
      const message=err?.response?.data?.msg || err?.response?.data?.message || "Failed to Test email sent.";
      $toast(message,'error')
    }finally{
      fullLoader.value=false;
    }
}


const audience_count=ref<any>('0');

// Exams for the multi-select
const exams = ref<any[]>([]);
const fetchExams = async () => {
  try {
    const res:any = await $api.post('/exams/list', { search: '', limit: 500 });
    if (res?.data?.status === 'success') exams.value = res?.data?.data ?? [];
  } catch { exams.value = []; }
};

// Institutions for the sub-filter (shown only when user_type === 'institutional').
// We match users by institution NAME on the backend, so the option value is the name.
const institutions = ref<any[]>([]);
const fetchInstitutions = async () => {
  try {
    const res:any = await $api.post('/institutions/', { limit: 1000 });
    if (res?.data?.status === 'success') institutions.value = res?.data?.data ?? [];
  } catch { institutions.value = []; }
};

// Clear the institution selection whenever we leave the institutional segment.
watch(() => addFormModel.user_type, (t) => {
  if (t !== 'institutional') addFormModel.institutions = [];
});

const data_loading=ref<boolean>(false);
const fetchAudience=async () => {
  data_loading.value = true
  try {
    const res:any = await $api.post('/notification-templates/audience',{
      user_type: addFormModel.user_type,
      status: addFormModel.status,
      exam_ids: addFormModel.exam_ids,
      institutions: addFormModel.institutions,
      expiry_within_days: addFormModel.expiry_within_days,
    })

    audience_count.value = res.data?.count??0;

  }catch(error:any){
    audience_count.value =0;
  } finally {
    data_loading.value = false
  }
}

// Recompute recipient count whenever any filter changes.
watch(
  () => [addFormModel.user_type, addFormModel.status, addFormModel.exam_ids, addFormModel.institutions, addFormModel.expiry_within_days],
  () => { fetchAudience(); },
  { deep: true }
);

onMounted(async()=>{
  fetchExams();
  fetchInstitutions();
  await fetchAudience();
});

// ---- Recipients preview: exact users the current filters will send to ----
const showRecipients = ref(false);
const recipients = ref<any[]>([]);
const recipientsLoading = ref(false);
const recipientsTotal = ref(0);
const recipientsPage = ref(1);
const recipientsLastPage = ref(1);
const recipientsLimit = 25;

const fetchRecipients = async (page = 1) => {
  recipientsLoading.value = true;
  try {
    const res:any = await $api.post('/notification-templates/recipients', {
      user_type: addFormModel.user_type,
      status: addFormModel.status,
      exam_ids: addFormModel.exam_ids,
      institutions: addFormModel.institutions,
      expiry_within_days: addFormModel.expiry_within_days,
      page,
      limit: recipientsLimit,
    });
    if (res?.data?.status === 'success') {
      recipients.value = res.data.data ?? [];
      recipientsTotal.value = res.data.total ?? 0;
      recipientsPage.value = res.data.current_page ?? page;
      recipientsLastPage.value = res.data.last_page ?? 1;
    } else {
      recipients.value = [];
      recipientsTotal.value = 0;
    }
  } catch {
    recipients.value = [];
    recipientsTotal.value = 0;
  } finally {
    recipientsLoading.value = false;
  }
};

const openRecipients = async () => {
  showRecipients.value = true;
  await fetchRecipients(1);
};
const closeRecipients = () => { showRecipients.value = false; };
const recipientsGoto = async (p:number) => {
  if (p < 1 || p > recipientsLastPage.value || p === recipientsPage.value) return;
  await fetchRecipients(p);
};

const broadcastPlaceholder=`Hi {{first_name}},\n\nWe have added 120 new ABIM questions this month...`;
const available_variables ="{{first_name}}";

</script>
<template>

  <Loading v-if="fullLoader" />
       <div class="card" style="margin-top: 20px">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px">
            <div>
              <div style="
              font-size: 0.78rem;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              color: var(--ink-dim);
              ">
              Broadcast
              </div>

            <div style="font-size: 0.75rem; color: var(--ink-dim); margin-top: 2px">
            Send a one-off broadcast (email and/or in-app) to a segment of users
            </div>
            </div>
        </div>

        <div class="form-row-2">
          <div class="form-row" style="margin-bottom: 12px">
            <label class="form-label">User Type</label>
            <select class="form-input form-select" v-model="addFormModel.user_type">
              <option value="all">All</option>
              <option value="individual">Individual</option>
              <option value="institutional">Institutional</option>
            </select>
          </div>

          <div class="form-row" style="margin-bottom: 12px">
            <label class="form-label">Status</label>
            <select class="form-input form-select" v-model="addFormModel.status">
              <option value="all">All</option>
              <option value="subscriber">Subscribers</option>
              <option value="trialist">Trialist</option>
            </select>
          </div>
        </div>

        <div v-if="addFormModel.user_type === 'institutional'" class="form-row" style="margin-bottom: 12px">
          <label class="form-label">Institution(s) <span style="font-weight:400;font-size:0.72rem;color:var(--ink-dim)">(leave empty for all institutions)</span></label>
          <Multiselect
            class="multiexam-select-options"
            v-model="addFormModel.institutions"
            mode="tags"
            :options="institutions.map((i:any)=>({ value: i.institution_id, label: i.institution_name }))"
            :searchable="true"
            :closeOnSelect="false"
            placeholder="All institutions"
          />
        </div>

        <div class="form-row-2">
          <div class="form-row" style="margin-bottom: 12px">
            <label class="form-label">Exam <span style="font-weight:400;font-size:0.72rem;color:var(--ink-dim)">(leave empty for all)</span></label>
            <Multiselect
              class="multiexam-select-options"
              v-model="addFormModel.exam_ids"
              mode="tags"
              :options="exams.map((e:any)=>({ value: e.id, label: e.name }))"
              :searchable="true"
              :closeOnSelect="false"
              placeholder="All exams"
            />
          </div>

          <div class="form-row" style="margin-bottom: 12px">
            <label class="form-label">Expiry Within</label>
            <select class="form-input form-select" v-model.number="addFormModel.expiry_within_days">
              <option :value="0">No filter</option>
              <option :value="1">1 day</option>
              <option :value="7">1 week</option>
              <option :value="14">2 weeks</option>
              <option :value="30">1 month</option>
            </select>
          </div>
        </div>

        <div class="form-row" style="margin-bottom: 12px">
          <label class="form-label">Estimated Recipients</label>
          <div style="display:flex; align-items:center; gap:12px; padding-top:4px">
            <div id="broadcastCount" style="font-size: 1.1rem; font-weight: 700; color: var(--teal)">
              <Loader_small v-if="data_loading" />
              <span v-else>{{ audience_count }} users</span>
            </div>
            <button type="button" class="btn btn-outline" style="padding:4px 10px; font-size:0.78rem"
              :disabled="data_loading || Number(audience_count) === 0"
              @click="openRecipients">
              View recipients
            </button>
          </div>
        </div>

        <div class="form-row" style="margin-bottom: 12px">
          <label class="form-label">Channels</label>
          <div style="display:flex; gap:20px; align-items:center; padding-top:4px;">
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.82rem;">
              <input type="checkbox" v-model="addFormModel.channel_email" /> Email
            </label>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.82rem;">
              <input type="checkbox" v-model="addFormModel.channel_in_app" /> In-app notification
            </label>
          </div>
        </div>

        <div class="form-row">
            <label class="form-label">Subject</label>
            <input
            class="form-input"
            id="broadcastSubject"
            placeholder="e.g. New questions added to ABIM — March 2026"
            type="text"
             v-model="addFormModel.subject" />
        </div>

        <div class="form-row">
            <label class="form-label">Message
               <span style="font-weight: 400;
                    text-transform: none;
                    letter-spacing: 0;
                    font-size: 0.72rem;
                    color: var(--ink-dim);"
                    >
                    Available variables: {{ available_variables }}
                    </span
                    >
            </label>
            <textarea class="form-input" name="broadcastBody" :placeholder="broadcastPlaceholder" rows="5"
            style="resize: vertical"
             v-model="addFormModel.message"
            ></textarea>
        </div>

        <div  v-if="data_loading" style="display: flex; gap: 8px; align-items: center">
           <Loader_small />
          </div>

        <div v-else style="display: flex; gap: 8px; align-items: center">
                <button class="btn btn-primary"
                 @click="sendBroadcast" 
                 type="button" 
                 :disabled="fullLoader">
                 Send Broadcast
                </button>

                <button class="btn btn-outline"
                @click="sendTest"
                  type="button">
                Send Test
                </button>
                <span style="font-size: 0.75rem; color: var(--ink-dim); margin-left: 4px"
                >Send Test goes to your own email — always preview before broadcasting
                </span
                >
        </div>
        </div>

        <!-- Recipients preview modal -->
        <div v-if="showRecipients" class="recipients-overlay" @click.self="closeRecipients">
          <div class="recipients-modal">
            <div class="recipients-head">
              <div>
                <div style="font-weight:700; font-size:0.95rem">Recipients preview</div>
                <div style="font-size:0.75rem; color:var(--ink-dim); margin-top:2px">
                  {{ recipientsTotal }} user(s) match the current filters
                </div>
              </div>
              <button type="button" class="btn btn-outline" style="padding:4px 10px" @click="closeRecipients">Close</button>
            </div>

            <div class="recipients-body">
              <div v-if="recipientsLoading" style="padding:24px; text-align:center"><Loader_small /></div>
              <table v-else-if="recipients.length" class="recipients-table">
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Institution</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in recipients" :key="r.id">
                    <td>{{ r.name || '—' }}</td>
                    <td>{{ r.email }}</td>
                    <td>{{ r.institution || '—' }}</td>
                    <td>{{ r.status }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-else style="padding:24px; text-align:center; color:var(--ink-dim)">No recipients match these filters.</div>
            </div>

            <div v-if="recipientsLastPage > 1" class="recipients-foot">
              <button type="button" class="btn btn-outline" style="padding:4px 10px"
                :disabled="recipientsPage <= 1" @click="recipientsGoto(recipientsPage - 1)">Prev</button>
              <span style="font-size:0.78rem; color:var(--ink-dim)">Page {{ recipientsPage }} of {{ recipientsLastPage }}</span>
              <button type="button" class="btn btn-outline" style="padding:4px 10px"
                :disabled="recipientsPage >= recipientsLastPage" @click="recipientsGoto(recipientsPage + 1)">Next</button>
            </div>
          </div>
        </div>

</template>
<style>
button[disabled] {
    cursor: not-allowed;
    opacity: 0.6;
}

.recipients-overlay{
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(15,23,42,0.45);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.recipients-modal{
  background: var(--card-bg, #fff); color: var(--ink, #1f2933);
  width: 100%; max-width: 760px; max-height: 80vh;
  border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.25);
  display: flex; flex-direction: column; overflow: hidden;
}
.recipients-head{
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid var(--border, #e5e7eb);
}
.recipients-body{ overflow: auto; padding: 8px 16px; }
.recipients-table{ width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.recipients-table th{
  text-align: left; padding: 8px 10px; position: sticky; top: 0;
  background: var(--card-bg, #fff); color: var(--ink-dim, #64748b);
  font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border, #e5e7eb);
}
.recipients-table td{ padding: 8px 10px; border-bottom: 1px solid var(--border, #f1f5f9); }
.recipients-foot{
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 12px 16px; border-top: 1px solid var(--border, #e5e7eb);
}
</style>