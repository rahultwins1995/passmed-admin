<script setup lang="ts">
import Loading from '@/components/loaders/Loading.vue'

import { ref,reactive, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean 
});

const emit = defineEmits(["update:modelValue", "saved"]);
const { $toast,$api,$confirm } = useNuxtApp()


//Close modal
const closeModal = () => {
  emit("update:modelValue", false);
};


const fullLoading=ref<boolean>(false);

// Real notification templates for the Email Template selector.
const templates = ref<any[]>([]);
const fetchTemplates = async () => {
  try {
    const res:any = await $api.post('/notification-templates', { page: 1, limit: 200 });
    if (res?.data?.status === 'success') {
      templates.value = res?.data?.data ?? [];
    }
  } catch { templates.value = []; }
};

// Institutions for the "Specific institutions" audience multi-select.
const institutions = ref<any[]>([]);
const fetchInstitutions = async () => {
  try {
    const res:any = await $api.post('/institutions', { page: 1, limit: 500 });
    if (res?.data?.status === 'success') {
      institutions.value = res?.data?.data ?? [];
    }
  } catch { institutions.value = []; }
};

const typeChangeTrigger=ref<string>('milestone-question-count');


const addFromModel = reactive<any>({
    "name": "",

    "type_trigger": "milestone-question-count",

    "milestone_question_count":[100,500],
    "before_exam_days":[1],
    "study_streak_days":[7],

    "score_percent":'40',
    "user_inactivity_days":7,
   
    "subscription_event":"started",
    "custom_schedule":"",

    "delivery_email":1,
    "delivery_in_app":0,

    "email_template": "auto-generate",
    "audience": "all",
    "audience_institution_ids": []
});


// Reset form
const resetForm = () => {
  Object.assign(addFromModel, {
       "name": "",

    "type_trigger": "milestone-question-count",

    "milestone_question_count":[100,500],
    "before_exam_days":[1],
    "study_streak_days":[7],

    "score_percent":'40',
    "user_inactivity_days":7,
   
    "subscription_event":"started",
    "custom_schedule":"",

    "delivery_email":1,
    "delivery_in_app":0,

    "email_template": "auto-generate",
    "audience": "all",
    "audience_institution_ids": []
});
};

// VALIDATION FUNCTION
const validateForm = () => {
    
  if (!addFromModel.name.trim()) {
    $toast("name required", "error");
    return false;
  }
  return true;
};


// Submit API
const submitForm = async (e:any) => {
  e.preventDefault();

// VALIDATION CALL
  if (!validateForm()){
  return;
  }

   fullLoading.value=true;

  try {

    const res:any =await $api.post("/notification-rules/add",addFromModel);

    if (res.data.status === "success") {
        $toast("Rule created successfully");
        emit("saved", true);
        resetForm();
        closeModal();
    }else{
      const message = res?.data?.msg || 'Failed to saved.'
      $toast(message,'error');
    }


  } catch (err:any) {
    const message = err?.response?.data?.msg ||err?.response?.data?.message || 'Failed to saved.'
    $toast(message,'error');

  } finally {
     fullLoading.value=false;
  }
};

// Watch the ref's VALUE (not the ref object) — the old `() => typeChangeTrigger`
// returned the ref itself, whose identity never changes, so this never fired and
// addFromModel.type_trigger stayed stuck on the default → every rule saved as
// milestone-question-count regardless of the dropdown.
watch(typeChangeTrigger, (vl) => {
  resetForm();

  addFromModel.type_trigger=vl;
})

watch(() => props.modelValue,(val) => {
   if (val){
    typeChangeTrigger.value='milestone-question-count'
    fetchTemplates()
    fetchInstitutions()
   }
});

</script>

<template>
    <Loading v-if="fullLoading" />
    <div v-if="modelValue"
        class="overlay overlay-top open newRuleOverlay" 
     @click.self="closeModal">

    <div class="drawer" style="width: 520px; max-width: 96vw">
        <div class="drawer-header">
            <div class="headertitlewrap">
                <div class="titlewrap">
                New Notification Rule
                </div>
                <div  class="subtitlewrap">
                Create automated rule
                </div>
            </div>
            
            <button class="drawer-close" type="button"
             @click="closeModal" >
                <svg fill="none"
                height="13"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-width="2.5"
                viewBox="0 0 24 24"
                width="13">
                <line x1="18" x2="6" y1="6" y2="18"></line>
                <line x1="6" x2="18" y1="6" y2="18"></line>
                </svg>
            </button>
        </div>

        <div class="drawer-body">
            <div class="form-row">
                <label class="form-label">Rule Name</label>
                <input class="form-input nrName" placeholder="e.g. Streak Milestone — 30 days" type="text"
                 v-model="addFromModel.name" />
            </div>
            <div class="form-row">
                <label class="form-label">Trigger</label>
                <select class="form-input form-select nrTrigger" 
                     v-model="typeChangeTrigger">
                    <option value="milestone-question-count">Milestone reached (question count)</option>
                    <option value="before-exam-days">Exam date approaching</option>
                    <option value="score-percent">Score drops below threshold</option>
                    <option value="user-inactivity-days">User inactive for N days</option>
                    <option value="study-streak-days">Study streak reached</option>
                </select>
            </div>

            <!-- Trigger-specific fields -->
            <div  v-if="typeChangeTrigger === 'milestone-question-count'"
                class="form-row nrFields-milestone">
                <label class="form-label">Question Count Threshold</label>
                <div style="display: flex; gap: 8px; flex-wrap: wrap">

                    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.82rem">
                        <input type="checkbox" style="accent-color: var(--teal)"
                        :value="100"
                        v-model="addFromModel.milestone_question_count" />
                        100 questions
                    </label>

                    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.82rem">
                        <input type="checkbox" style="accent-color: var(--teal)" 
                        :value="500"
                        v-model="addFromModel.milestone_question_count"/>
                        500 questions
                    </label>

                    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.82rem">
                        <input type="checkbox" style="accent-color: var(--teal)" 
                        :value="1000"
                        v-model="addFromModel.milestone_question_count"/>
                        1,000 questions
                    </label>

                    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.82rem">
                        <input type="checkbox" style="accent-color: var(--teal)"
                        :value="2500"
                        v-model="addFromModel.milestone_question_count" />
                        2,500 questions
                    </label>
                </div>
            </div>

               <!-- nrFields-exam_date -->
            <div v-if="typeChangeTrigger === 'before-exam-days'"
            class="form-row nrFields-before-exam-days">
                <label class="form-label">Days Before Exam</label>
                <div style="display: flex; gap: 8px; flex-wrap: wrap">
                    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.82rem">
                        <input type="checkbox" style="accent-color: var(--teal)"
                        :value="7" 
                        v-model="addFromModel.before_exam_days" />
                        7 days
                    </label>

                    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.82rem">
                        <input type="checkbox" style="accent-color: var(--teal)"
                        :value="3" 
                        v-model="addFromModel.before_exam_days" />
                        3 days
                    </label>

                    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.82rem">
                        <input type="checkbox" style="accent-color: var(--teal)"
                        :value="1"
                         v-model="addFromModel.before_exam_days" />
                        1 day
                    </label>
                </div>
            </div>

            <!-- SCORE -->
            <div v-if="typeChangeTrigger === 'score-percent'"
            id="nrFields-score-percent" class="form-row" >
                <label class="form-label">Score Threshold (%)</label>
                <div style="display: flex; align-items: center; gap: 8px">
                    <input class="form-input nrScoreThreshold" max="100" min="10" style="max-width: 80px"
                        type="number"
                    v-model="addFromModel.score_percent" />
                    <span style="font-size: 0.82rem; color: var(--ink-dim)">
                        % — trigger when avg drops below this
                    </span>
                </div>
            </div>

           <!-- INACTIVITY -->
            <div  v-if="typeChangeTrigger === 'user-inactivity-days'"
            id="nrFields-user-inactivity-days" class="form-row">
                <label class="form-label">Inactive for</label>
                <div style="display: flex; align-items: center; gap: 8px">
                    <input class="form-input nrInactiveDays" min="1"
                        style="max-width: 80px" type="number" 
                    v-model="addFromModel.user_inactivity_days"/>
                    <span style="font-size: 0.82rem; color: var(--ink-dim)">days</span>
                </div>
            </div>

            <!-- STREAK -->
            <div v-if="typeChangeTrigger === 'study-streak-days'"
           class="form-row nrFields-study-streak-days">
                <label class="form-label">Streak Length</label>
                <div style="display: flex; gap: 8px; flex-wrap: wrap">
                    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.82rem">
                        <input type="checkbox" style="accent-color: var(--teal)"
                        :value="7"
                         v-model="addFromModel.study_streak_days"/>
                         7 days
                    </label>
                    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.82rem">
                        <input type="checkbox" style="accent-color: var(--teal)" 
                        :value="30"
                         v-model="addFromModel.study_streak_days"
                        />
                         30 days
                    </label>
                    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.82rem">
                        <input type="checkbox" style="accent-color: var(--teal)"
                        :value="100"
                         v-model="addFromModel.study_streak_days"
                         />
                         100 days
                    </label>
                </div>
            </div>

            <!-- CHANNEL -->
            <div class="form-row">
                <label class="form-label">Delivery Channels</label>
                <div style="display: flex; gap: 16px">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.88rem">
                        <input type="checkbox" class="nrEmail" checked style="accent-color: var(--teal)" 
                        :true-value="1"
                        :false-value="0"
                        v-model="addFromModel.delivery_email"/>
                         Email
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.88rem">
                        <input type="checkbox" class="nrDashboard" style="accent-color: var(--teal)"
                       :true-value="1"
                        :false-value="0"
                          v-model="addFromModel.delivery_in_app"/>
                         In-app dashboard
                    </label>
                </div>
            </div>

            <div class="form-row">
                <label class="form-label">
                    Email Template
                    <span style="font-weight: 400; font-size: 0.72rem; color: var(--ink-dim)">
                        (optional — leave blank to use default)
                    </span>
                </label>
                <select class="form-input form-select nrTemplate"
                v-model="addFromModel.email_template">
                    <option value="auto-generate">Auto-generate</option>
                    <option v-for="t in templates" :key="t.id" :value="t.id">
                        {{ t.name }}<template v-if="t.type_name || t.type"> — {{ t.type_name || t.type }}</template>
                    </option>
                </select>
            </div>

            <div class="form-row" style="margin-bottom: 20px">
                <label class="form-label">Audience</label>
                <select class="form-input form-select" name="nrAudience"
                v-model="addFromModel.audience">
                    <option value="all">All users</option>
                    <option value="medical-students">Medical students only</option>
                    <option value="residents-doctors">Residents &amp; doctors only</option>
                    <option value="individual-subscribers">Individual subscribers only</option>
                    <option value="institutional-users">Institutional users only</option>
                    <option value="specific-institutions">Specific institutions…</option>
                </select>
            </div>

            <div class="form-row" style="margin-bottom: 20px" v-if="addFromModel.audience === 'specific-institutions'">
                <label class="form-label">Institutions (this rule fires only to their students)</label>
                <select class="form-input form-select" multiple size="6"
                    v-model="addFromModel.audience_institution_ids">
                    <option v-for="inst in institutions" :key="inst.institution_id" :value="inst.institution_id">
                        {{ inst.institution_name }}
                    </option>
                </select>
                <div style="font-size:0.72rem;color:var(--ink-dim,#6b7280);margin-top:4px">
                    Hold Ctrl/Cmd to select multiple. Leave none = fires to nobody.
                </div>
            </div>

            <div class="bottomwrapbtn" style="display: flex; gap: 8px">
                <button class="btn btn-primary" style="flex: 1" type="button"
                @click="submitForm">
                    Create Rule
                </button>
                <button class="btn btn-outline" type="button"
                 @click="closeModal">
                    Cancel
                </button>
            </div>

        </div>
    </div>
</div>

</template>