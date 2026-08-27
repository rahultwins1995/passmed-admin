<script setup lang="ts">
/*
* GeneralSettings.vue
*/
import Loading from '@/components/loaders/Loading.vue'

import { ref, reactive,watch } from 'vue';
const props = defineProps({
  activeTab: String
});

const { $api, $toast,$confirm } = useNuxtApp()

const { timezone: appTimezone, loadTimezone } = useAppTimezone()
const timezones = getTimezones()

const fullLoading = ref<boolean>(false);
const btnLoading = ref<boolean>(false)

  onMounted(loadTimezone)

/*
* 
Platform Info fetch data
*/
const detailsfetch=ref<any>(null);
const fetchData=async () => {
    try {
    fullLoading.value = true

    const res:any = await $api.get('/settings')
    if(res.data.status === 'success'){
      const obj:any = res.data.data
      detailsfetch.value=obj;
      platformForm.name=obj?.name??'';
      platformForm.banner=obj?.banner??'';
      platformForm.domain=obj?.domain??'';
      platformForm.support_email=obj?.support_email??'';
      platformForm.from_name=obj?.from_name??'';
      platformForm.timezone = obj?.timezone ?? 'Asia/Kolkata';
      
      trialformForm.free_trial_duration = obj.free_trial_duration ?? '7'
      trialformForm.free_trial_questions_accessible = obj.free_trial_questions_accessible ?? '25'
      trialformForm.free_trial_restriction_mode = obj.free_trial_restriction_mode ?? 'both'

    }else{
      detailsfetch.value=null;
    }

  } catch(e){
    detailsfetch.value=null;
  } finally {
    fullLoading.value = false
  }

}

/* ---------------- FORM ---------------- */
const platformForm = reactive({
  name: '',
  domain: '',
  support_email: '',
  from_name: '',
  banner: '',
  timezone: 'Asia/Kolkata' 
})
const trialformForm = reactive({
    free_trial_duration:"7",
    free_trial_questions_accessible:"25",
    free_trial_restriction_mode:"questions",
})

/*
 * ── Live clock beside the timezone picker ───────────────────────────────────
 *
 * The dropdown is ~420 raw IANA strings and nothing else, so picking one is an act of
 * faith — `America/Phoenix` and `America/Denver` look equally plausible until you know
 * only one of them observes DST. Showing the current time in the selected zone makes
 * the choice verifiable at a glance, which matters because this value drives every
 * date/time display in the admin portal.
 *
 * Ticks once a second: a clock that doesn't move doesn't read as "the time there now",
 * it reads as a static label you can't trust. It's one zone and the Intl formatters are
 * cached in utils/timezones.ts, so the cost is nil.
 */
const tzNow = ref(new Date())
let tzTimer: ReturnType<typeof setInterval> | null = null

// Guarded: `timezone` comes from the settings table and could hold anything. An
// unknown zone must show a warning, not crash the panel.
const zoneValid  = computed(() => isValidTimezone(platformForm.timezone))
const zoneTime   = computed(() => zoneValid.value ? timeIn(platformForm.timezone, tzNow.value) : '')
const zoneMetaLn = computed(() => zoneValid.value ? zoneMeta(platformForm.timezone, tzNow.value) : '')

onMounted(() => { tzTimer = setInterval(() => { tzNow.value = new Date() }, 1000) })
onBeforeUnmount(() => { if (tzTimer) clearInterval(tzTimer) })

/*
* save Platform Info
*/
const savePlatformInfo=async () => {

    if(platformForm.name == ""){
        $toast('name is required', 'error')
        return;
    }
      btnLoading.value = true
   
try {

    const res:any = await $api.post('/settings/save', platformForm);
     if (res.data.status === 'success') {
       appTimezone.value = platformForm.timezone 
        const message = res?.data?.msg || 'Platform settings saved.';
         $toast(message);
     }else{
         const message = res?.data?.msg || 'Failed to saved.';
         $toast(message,'error');
    }

  } catch(err:any){
   
    const message = err?.response?.data?.message || 'Failed to saved.'
     $toast(message,'error');
  } finally {
    btnLoading.value = false
  }
}

/*
* save Free Trial Defaults
*/
const btntrialLoading=ref<boolean>(false);
const saveTrialDefaults=async () => {
      btntrialLoading.value = true
try {

    const res:any = await $api.post('/settings/trial-save', trialformForm);
     if (res.data.status === 'success') {
        const message = res?.data?.msg || 'Trial defaults saved.';
         $toast(message);
     }else{
         const message = res?.data?.msg || 'Failed to saved.';
         $toast(message,'error');
    }

  } catch(err:any){
   
    const message = err?.response?.data?.message || 'Failed to saved.'
     $toast(message,'error');
  } finally {
    btntrialLoading.value = false
  }
}

watch(() => props.activeTab, async (val) => {
    if (val === 'general') {
      await fetchData();
    }
  },{ immediate: true });


</script>
<template>
<Loading v-if="fullLoading || btntrialLoading || btnLoading" />
 <div v-if="props.activeTab === 'general'" class="dashwrap settingwrappage">
     <div class="tab-section-content settingsSection-general active">

        <div class="card" style="margin-bottom:16px">
            <div style="font-size:0.78rem;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--ink-dim);margin-bottom:16px">
              Platform Info
            </div>
            
              <div class="form-row-2">
                <div class="form-row" style="margin:0 0 14px">
                  <label class="form-label">Platform Name</label>
                  <input class="form-input" v-model="platformForm.name"
                  type="text"/>
                </div>

                <div class="form-row" style="margin:0 0 14px">
                  <label class="form-label">Primary Domain</label>
                  <input class="form-input"
                  v-model="platformForm.domain"
                  type="text"/>
                </div>
                <div class="form-row" style="margin:0 0 14px">
                  <label class="form-label">Support Email</label>
                  <input class="form-input" 
                  v-model="platformForm.support_email"
                  type="text"/>
                </div>

                <div class="form-row" style="margin:0 0 14px">
                  <label class="form-label">From Name (emails)</label>
                  <input class="form-input"
                   v-model="platformForm.from_name" 
                   type="text"/>
                </div>
              </div>

              <div class="form-row" style="margin:0 0 14px">
                <label class="form-label">
                  Platform Announcement Banner 
                  <span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:0.72rem;color:var(--ink-dim)">
                    (shown at top of app, leave blank to hide)
                  </span>
                </label>
                <input 
                class="form-input" id="bannerText"
                placeholder="e.g. USMLE Step 1 question bank now available — explore now"
                v-model="platformForm.banner"
                type="text"/>
              </div>

              <div class="form-row">
                <label class="form-label">
                 Timezone
                </label>

                <!-- The dropdown is 400+ bare IANA strings; the clock is what makes the
                     choice checkable. Phoenix vs Denver is one hour apart for half the
                     year and identical for the other half — you cannot tell from the
                     name, only from the time. -->
                <div class="tz-picker">
                  <select id="app-timezone" class="form-input form-select"
                  v-model="platformForm.timezone" >
                  <option v-for="tz in timezones" :key="tz" :value="tz">
                    {{ tz }}
                  </option>
                  </select>

                  <div v-if="zoneValid" class="tz-clock" aria-live="off">
                    <span class="tz-clock-time">{{ zoneTime }}</span>
                    <span class="tz-clock-meta">{{ zoneMetaLn }}</span>
                  </div>
                  <div v-else class="tz-clock tz-clock-bad">
                    <span class="tz-clock-time">—</span>
                    <span class="tz-clock-meta">Unknown timezone</span>
                  </div>
                </div>

                <small style="font-weight:400;text-transform:none;letter-spacing:0;font-size:0.72rem;color:var(--ink-dim)">
                 Used for all date/time displays across the admin portal. Saves with "Save Changes" above.
                </small>

              </div>

              <div style="display:flex;gap:8px">
                  <button class="btn btn-primary btn-sm" 
                    @click="savePlatformInfo"
                    type="button"
                    :disabled="btnLoading">
                    Save Changes
                  </button>
              </div>
        </div>

       
            <div class="card">
            <div style="font-size:0.78rem;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--ink-dim);margin-bottom:16px">Free Trial Defaults</div>
                <div class="form-row-2">
                    <div class="form-row" style="margin:0 0 14px">
                        <label class="form-label">
                            Default Trial Days
                        </label>
                        <input class="form-input" 
                        style="max-width:100px"
                        type="number" 
                        v-model="trialformForm.free_trial_duration" />
                    </div>
                    <div class="form-row" style="margin:0 0 14px">
                    <label class="form-label">
                        Default Trial Questions
                    </label>
                    <input class="form-input" style="max-width:100px" type="number"
                    v-model="trialformForm.free_trial_questions_accessible"/>
                    </div>
                </div>

              <div class="form-row" style="margin:0 0 14px">
                    <label class="form-label">
                      Require Credit Card for Trial
                    </label>
                    <select
                     class="form-input form-select" 
                    style="max-width:200px"
                    v-model="trialformForm.free_trial_restriction_mode"
                    >
                      <option value="questions">Question count limit only</option>
                      <option value="both">Both (whichever hits first)</option>
                      <option value="days">Days limit only</option>
                    </select>
                  </div>
                  
                  <button class="btn btn-primary btn-sm" 
                  type="button"
                   @click="saveTrialDefaults"   
                   :disabled="btntrialLoading">
                    Save
                  </button>
            </div>
        </div>
</div>

</template>

<style scoped>
/* Select and clock side by side; the clock collapses under the select on narrow
   screens rather than squeezing the dropdown. */
.tz-picker {
  display: flex;
  align-items: stretch;
  gap: 10px;
  flex-wrap: wrap;
}
.tz-picker > .form-select {
  flex: 1 1 240px;
  min-width: 0;
}

.tz-clock {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: var(--r-sm, 6px);
  background: var(--surface);
  min-width: 130px;
}
.tz-clock-time {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ink);
  /* Tabular numerals — without them the whole line jitters left and right every
     second as the digit widths change, which is maddening next to a form field. */
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}
.tz-clock-meta {
  font-size: 0.66rem;
  color: var(--ink-dim);
  white-space: nowrap;
}
.tz-clock-bad {
  border-color: var(--rose-border, #fecdd3);
  background: #fff1f2;
}
.tz-clock-bad .tz-clock-time,
.tz-clock-bad .tz-clock-meta {
  color: var(--rose, #e11d48);
}
</style>