<script setup lang="ts">
/*
* Integrations
*/
import Loading from '@/components/loaders/Loading.vue'
import { ref, reactive,watch } from 'vue';

const props = defineProps({
  activeTab: String
});

const { $api, $toast,$confirm } = useNuxtApp()
const fullLoading = ref<boolean>(false);

const addformForm = reactive({
  mode: 'sandbox',
  sandbox_key: '',
  sandbox_secret: '',
  sandbox_webhook_secret: '',
  live_key: '',
  live_secret: '',
  live_webhook_secret: ''
})

// The API no longer returns the stored secrets — only whether one is set and its
// last 4 characters — so the fields start empty and stay empty unless the admin
// types a new one. Leaving one blank on save means "keep the existing key".
const savedSecrets = reactive({
  sandbox_set: false, sandbox_last4: '',
  live_set: false,    live_last4: '',
  sandbox_webhook_set: false, sandbox_webhook_last4: '',
  live_webhook_set: false,    live_webhook_last4: '',
})

// Secrets are masked by default; the toggle only ever reveals what the admin
// just typed, never a stored value.
const showSandboxSecret = ref(false)
const showLiveSecret    = ref(false)
const showSandboxWebhook = ref(false)
const showLiveWebhook    = ref(false)

const secretPlaceholder = (isSet: boolean, last4: string) =>
  isSet ? `•••• ${last4} — saved, type to replace` : 'Secret Key'

/*
* save data
*/
const saveformData=async () => {
     fullLoading.value = true
try {

    const res:any = await $api.post('/integrations/save', addformForm);
     if (res.data.status === 'success') {
        const message = res?.data?.msg || 'saved.';
         $toast(message);
     }else{
         const message = res?.data?.msg || 'Failed to saved.';
         $toast(message,'error');
    }

  } catch(err:any){
   
    const message = err?.response?.data?.message || 'Failed to saved.'
     $toast(message,'error');
  } finally {
    fullLoading.value = false
  }
}

/*
* 
fetch data
*/
const detailsfetch=ref<any>(null);

const fetchData=async () => {
    try {
    fullLoading.value = true

    const res:any = await $api.get('/integrations')
    if(res.data.status === 'success'){
       const obj:any = res.data.data
        detailsfetch.value=obj;
     
        addformForm.mode = obj.mode??"sandbox"
        addformForm.sandbox_key = obj.sandbox_key ?? ""
        addformForm.live_key = obj.live_key??""

        // Secrets are deliberately NOT populated — the API doesn't send them.
        // Keep the inputs blank and show what's stored via the placeholder.
        addformForm.sandbox_secret = ""
        addformForm.live_secret = ""
        addformForm.sandbox_webhook_secret = ""
        addformForm.live_webhook_secret = ""
        savedSecrets.sandbox_set   = !!obj.sandbox_secret_set
        savedSecrets.sandbox_last4 = obj.sandbox_secret_last4 ?? ""
        savedSecrets.live_set      = !!obj.live_secret_set
        savedSecrets.live_last4    = obj.live_secret_last4 ?? ""
        savedSecrets.sandbox_webhook_set   = !!obj.sandbox_webhook_secret_set
        savedSecrets.sandbox_webhook_last4 = obj.sandbox_webhook_secret_last4 ?? ""
        savedSecrets.live_webhook_set      = !!obj.live_webhook_secret_set
        savedSecrets.live_webhook_last4    = obj.live_webhook_secret_last4 ?? ""
    }

  } catch(e){
    detailsfetch.value=null;
  } finally {
    fullLoading.value = false
  }

}

watch(() => props.activeTab, async (val) => {
    if (val === 'integrations') {
      await fetchData();
    }
  },{ immediate: true });

</script>
<template>

<Loading v-if="props.activeTab === 'integrations' && fullLoading"/>

 <div v-if="props.activeTab === 'integrations'" 
  class="dashwrap settingwrappage">
    <div class="tab-section-content settingsSection-integrations active"
    >   
    <div class="card" style="margin-bottom:16px">
            <div class="email-template-row">
                <div style="width:32px;height:32px;background:#635bff;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                    <svg fill="white" height="16" viewBox="0 0 24 24" width="16">
                    <path d="M13.9 12.847a2.5 2.5 0 11-3.8-3.243 2.5 2.5 0 013.8 3.243z"></path>
                    </svg>
                </div>
                <div style="font-size:0.85rem;font-weight:700">
                    Stripe Configuration
                </div>
            </div>
            
            <div class="form-row" style="margin:0 0 14px">
                <label class="form-label">Mode</label>
                <select class="form-input form-select"
                    v-model="addformForm.mode">
                <option value="sandbox">Test</option>
                <option value="live">Live</option>
                </select>
            </div>
            

            <div class="form-row-2">
                <div class="form-row" style="margin:0 0 14px">
                <label class="form-label">
                    Test Publishable Key
                    </label>
                <input class="form-input"
                v-model="addformForm.sandbox_key"
                placeholder="Publishable Key"
                autocomplete="off"
                data-lpignore="true"
                data-1p-ignore
                data-bwignore
                data-form-type="other"
                readonly
                onfocus="this.removeAttribute('readonly')"
                type="text"/>
                </div>

                <div class="form-row" style="margin:0 0 14px">
                <label class="form-label">
                    Live Publishable Key
                </label>
                <input class="form-input"
                v-model="addformForm.live_key"
                placeholder="Publishable Key"
                autocomplete="off"
                data-lpignore="true"
                data-1p-ignore
                data-bwignore
                data-form-type="other"
                readonly
                onfocus="this.removeAttribute('readonly')"
                type="text"/>
                </div>

               
            </div>
        
            <div class="form-row-2">
               <div class="form-row" style="margin:0 0 14px">
                <label class="form-label">Test Secret Key</label>
                <div style="display:flex;gap:6px;align-items:center">
                  <input class="form-input"
                  style="flex:1"
                  v-model="addformForm.sandbox_secret"
                  :placeholder="secretPlaceholder(savedSecrets.sandbox_set, savedSecrets.sandbox_last4)"
                  autocomplete="new-password"
                  spellcheck="false"
                  readonly
                  onfocus="this.removeAttribute('readonly')"
                  data-lpignore="true"
                  data-1p-ignore
                  data-bwignore
                  data-form-type="other"
                  :type="showSandboxSecret ? 'text' : 'password'"/>
                  <button class="btn btn-sm" type="button"
                    :aria-label="showSandboxSecret ? 'Hide sandbox secret key' : 'Show sandbox secret key'"
                    @click="showSandboxSecret = !showSandboxSecret">
                    {{ showSandboxSecret ? 'Hide' : 'Show' }}
                  </button>
                </div>
                </div>



                <div class="form-row" style="margin:0 0 14px">
                <label class="form-label">
                Live Secret Key
                </label>
                <div style="display:flex;gap:6px;align-items:center">
                  <input class="form-input"
                  style="flex:1"
                  v-model="addformForm.live_secret"
                  :placeholder="secretPlaceholder(savedSecrets.live_set, savedSecrets.live_last4)"
                  autocomplete="new-password"
                  spellcheck="false"
                  readonly
                  onfocus="this.removeAttribute('readonly')"
                  data-lpignore="true"
                  data-1p-ignore
                  data-bwignore
                  data-form-type="other"
                  :type="showLiveSecret ? 'text' : 'password'"/>
                  <button class="btn btn-sm" type="button"
                    :aria-label="showLiveSecret ? 'Hide live secret key' : 'Show live secret key'"
                    @click="showLiveSecret = !showLiveSecret">
                    {{ showLiveSecret ? 'Hide' : 'Show' }}
                  </button>
                </div>
                </div>
            </div>

            <!-- Webhook signing secrets (whsec_…) — from Stripe → Developers →
                 Webhooks. Used to verify incoming payment events. Blank = keep existing. -->
            <div class="form-row-2">
               <div class="form-row" style="margin:0 0 14px">
                <label class="form-label">Test Webhook Secret</label>
                <div style="display:flex;gap:6px;align-items:center">
                  <input class="form-input"
                  style="flex:1"
                  v-model="addformForm.sandbox_webhook_secret"
                  :placeholder="secretPlaceholder(savedSecrets.sandbox_webhook_set, savedSecrets.sandbox_webhook_last4)"
                  autocomplete="new-password"
                  spellcheck="false"
                  readonly
                  onfocus="this.removeAttribute('readonly')"
                  data-lpignore="true"
                  data-1p-ignore
                  data-bwignore
                  data-form-type="other"
                  :type="showSandboxWebhook ? 'text' : 'password'"/>
                  <button class="btn btn-sm" type="button"
                    :aria-label="showSandboxWebhook ? 'Hide test webhook secret' : 'Show test webhook secret'"
                    @click="showSandboxWebhook = !showSandboxWebhook">
                    {{ showSandboxWebhook ? 'Hide' : 'Show' }}
                  </button>
                </div>
                </div>

                <div class="form-row" style="margin:0 0 14px">
                <label class="form-label">Live Webhook Secret</label>
                <div style="display:flex;gap:6px;align-items:center">
                  <input class="form-input"
                  style="flex:1"
                  v-model="addformForm.live_webhook_secret"
                  :placeholder="secretPlaceholder(savedSecrets.live_webhook_set, savedSecrets.live_webhook_last4)"
                  autocomplete="new-password"
                  spellcheck="false"
                  readonly
                  onfocus="this.removeAttribute('readonly')"
                  data-lpignore="true"
                  data-1p-ignore
                  data-bwignore
                  data-form-type="other"
                  :type="showLiveWebhook ? 'text' : 'password'"/>
                  <button class="btn btn-sm" type="button"
                    :aria-label="showLiveWebhook ? 'Hide live webhook secret' : 'Show live webhook secret'"
                    @click="showLiveWebhook = !showLiveWebhook">
                    {{ showLiveWebhook ? 'Hide' : 'Show' }}
                  </button>
                </div>
                </div>
            </div>

            <div style="display:flex;gap:8px">
                <button class="btn btn-primary btn-sm" type="button"
                    @click="saveformData">
                    Save Changes
                </button>
            </div>
    </div>
    
  </div>
</div>
</template>