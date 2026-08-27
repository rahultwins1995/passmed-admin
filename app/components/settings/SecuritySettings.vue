<script setup lang="ts">
/**
 * security
*
*/

import Pagination from '@/components/Pagination.vue'
import Loader_small from '@/components/loaders/Loader_small.vue'
import Loading from '@/components/loaders/Loading.vue'
import Empty from '@/components/loaders/Empty.vue'
import AuditLog from '@/components/settings/AuditLog.vue'
import { ref, watch, reactive } from 'vue'

const props = defineProps({
  activeTab: String
});

const { $api, $toast,$confirm } = useNuxtApp()

const fullLoading = ref<boolean>(false);

const security_re_auth=ref<string|number>(0);
const security_maintenance_mode=ref<string|number>(0);

// securityForm 
const securityForm = reactive({
  security_2fa: 0,
  security_google_sso: 0,
  security_session_timeout: '30min'
})

// SAML form
const samlForm = reactive({
  idp_sso_url: '',
  idp_entity_id: '',
  x509_cert: ''
})

//  Toggle helper
const toggleRule = (key: 'security_2fa' | 'security_google_sso') => {
  securityForm[key] = securityForm[key] === 1 ? 0 : 1
}

const saveSecurity=async () => {
    try {
    fullLoading.value = true

    const res:any = await $api.post('/settings/security-save',securityForm)
    if(res.data.status === 'success'){
     $toast(res.data.msg || 'Security settings saved.', 'success')
    }else{
      $toast(res.data.msg || 'Failed to save changes.', 'error')
    }

  } catch(err:any){
    $toast(err?.response?.data?.msg || 'Failed to save changes.', 'error')
  } finally {
    fullLoading.value = false
  }
}

const saveSessionsPurge=async () => {
        const confirmed = await $confirm(
        'Sign everyone out — all users must log in again'
        )
        if (!confirmed) return

    try {
    fullLoading.value = true
        
    const res:any = await $api.post('/settings/security-purge-sessions-save',{
        'security_re_auth':security_re_auth.value
    })

    if(res.data.status === 'success'){
     $toast(res.data.msg || 'All sessions purged.', 'success')
    }else{
        $toast(res.data.msg || 'Failed to purge sessions.', 'error')
    }
  } catch(err:any){
    $toast(err?.response?.data?.msg || 'Failed to purge sessions.', 'error')
  } finally {
    fullLoading.value = false
  }
}

const saveMaintenanceMode=async () => {
    try {
    fullLoading.value = true
    const newVal = security_maintenance_mode.value === 1 ? 0 : 1
    const res:any = await $api.post('/settings/security-maintenance-mode-save',{
        'security_maintenance_mode':newVal
    })

    if(res.data.status === 'success'){
        security_maintenance_mode.value = newVal
        $toast(res.data.msg || 'Maintenance mode updated.', 'success')
    }else{
       $toast(res.data.msg || 'Failed to update maintenance mode.', 'error')
    }

  } catch(err:any){
    $toast(err?.response?.data?.msg || 'Failed to update maintenance mode.', 'error')
  } finally {
    fullLoading.value = false
  }
}

// SAML Save
const saveSamlSso = async () => {
  try {
    fullLoading.value = true
    const res: any = await $api.post('/settings/security-saml-sso-save', samlForm)
    if (res.data.status === 'success') {
      $toast(res.data.msg || 'SAML config saved.', 'success')
    } else {
      $toast(res.data.msg || 'SAML save failed.', 'error')
    }
  } catch (err: any) {
    $toast(err?.response?.data?.msg || 'SAML save failed.', 'error')
  } finally {
    fullLoading.value = false
  }
}

// SAML test login: the SAML auth flow isn't implemented on the backend yet,
// so there's nothing to launch. Be honest instead of faking a success.
const onClikTestLogin = () => {
    $toast('SAML test login isn’t available yet — SSO is not fully enabled.', 'warning')
}

// Admin IP allowlist enforcement is backend work that isn't built yet.
const onClickConfigureIpAllowlist = () => {
    $toast('Admin IP allowlist configuration is coming soon.', 'warning')
}


const detailsfetch=ref<any>(null);
const fetchData=async () => {
    try {
    fullLoading.value = true

    const res:any = await $api.get('/settings/security')
    if(res.data.status === 'success'){
      const obj:any = res.data.data
        detailsfetch.value=obj;

            securityForm.security_2fa = obj.security_2fa || 0
            securityForm.security_google_sso = obj.security_google_sso || 0
            securityForm.security_session_timeout = obj.security_session_timeout || '30min'
            
            security_re_auth.value = obj.security_re_auth || 0
            security_maintenance_mode.value = obj.security_maintenance_mode || 0
            samlForm.idp_sso_url = obj.saml_idp_sso_url || ''
            samlForm.idp_entity_id = obj.saml_idp_entity_id || ''
            samlForm.x509_cert = obj.saml_x509_cert || ''

    }else{
      detailsfetch.value=null;
    }

  } catch(e){
    detailsfetch.value=null;
  } finally {
    fullLoading.value = false
  }

}


watch(() => props.activeTab, async (val) => {
  if (val === "security") {
      await fetchData();
  } 
},{ immediate: true });

</script>
<template>

<Loading v-if="fullLoading" />
 <div v-if="props.activeTab === 'security'" 
  class="dashwrap settingwrappage">

     <div class="tab-section-content settingsSection-security active">
        <div class="card" style="margin-bottom:16px">
        <div style="font-size:0.78rem;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--ink-dim);margin-bottom:16px">
            Authentication
        </div>
        <div class="email-template-row">
            <div style="flex:1">
                <div style="font-size:0.82rem;font-weight:700">
                Two-Factor Authentication (Admin)
                </div>
                <div style="font-size:0.72rem;color:var(--ink-dim)">
                    Require 2FA for all admin logins
                </div>
            </div>
            
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                <div class="toggle-track toggle-2fa"
                :class="securityForm.security_2fa === 1 ? 'toggle-on' : ''"
                @click="toggleRule('security_2fa')"
                >
                    <div class="toggle-thumb"></div>
                </div>
            </label>
        </div>

        <div class="email-template-row">

            <div style="flex:1">
                <div style="font-size:0.82rem;font-weight:700">
                    Google SSO
                </div>
                <div style="font-size:0.72rem;color:var(--ink-dim)">
                    Allow users to sign in with Google
                </div>
            </div>

            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                <div class="toggle-track toggle-sso"
                :class="securityForm.security_google_sso === 1 ? 'toggle-on' : ''"
                @click="toggleRule('security_google_sso')">
                <div class="toggle-thumb"></div>
                </div>
            </label>
        </div>
            <div class="email-template-row">
                <div style="flex:1">
                    <div style="font-size:0.82rem;font-weight:700">
                        Session Timeout
                    </div>
                    <div style="font-size:0.72rem;color:var(--ink-dim)">
                        Auto-logout after inactivity
                    </div>
                </div>
                <select class="form-input form-select"
                v-model="securityForm.security_session_timeout"
                style="max-width:140px;font-size:0.8rem">
                <option value="30min">30 minutes</option>
                <option value="1hour">1 hour</option>
                <option value="4hour">4 hours</option>
                <option value="24hour">24 hours</option>
                </select>
            </div>

            <div class="email-template-row" style="border:none">
            <div style="flex:1">
                <div style="font-size:0.82rem;font-weight:700">
                Admin Login IP Allowlist
            </div>
                <div style="font-size:0.72rem;color:var(--ink-dim)">
                    Restrict admin access to specific IP ranges
                </div>
            </div>
                <button class="btn btn-outline btn-sm"
                type="button"
                @click="onClickConfigureIpAllowlist">
                Configure
                </button>
            </div>

            <div class="submtScrty" style="display:flex;gap:8px;margin-top: 10px;">
                <button class="btn btn-primary btn-sm"
                type="button"
                @click="saveSecurity">
                Save Changes
                </button>
            </div>
        </div>

        <div class="card" style="margin-bottom:16px">
                <div style="font-size:0.78rem;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--ink-dim);margin-bottom:16px">
                    SAML / SSO
                </div>
                <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:var(--r-sm);padding:14px 16px;margin-bottom:14px;font-size:0.82rem;color:var(--ink-dim);line-height:1.6">
                    Configure SAML 2.0 SSO for institutional users. Once configured, users from connected institutions can sign in via their identity provider (Okta, Azure AD, Google Workspace).
                </div>

                <div class="form-row-2">
                    <div class="form-row" style="margin-bottom:12px">
                        <label class="form-label">Entity ID (Issuer)</label>
                        <input class="form-input" 
                        :placeholder="baseUrl('saml/metadata')" 
                        type="text" 
                        :value="baseUrl('saml/metadata')"
                         readonly 
                        style="background:var(--surface);color:var(--ink-dim)" />
                    </div>
                    <div class="form-row" style="margin-bottom:12px">
                        <label class="form-label">ACS URL</label>
                        <input class="form-input"
                        :placeholder="baseUrl('saml/acs')" 
                        type="text" 
                        :value="baseUrl('saml/acs')" 
                        readonly style="background:var(--surface);color:var(--ink-dim)"/>
                    </div>
                    <div class="form-row" style="margin-bottom:12px">
                        <label class="form-label">IdP SSO URL</label>
                        <input class="form-input" id="samlIdpUrl"
                        placeholder="https://your-idp.com/sso"
                        type="text"
                         v-model="samlForm.idp_sso_url"/>
                    </div>
                    <div class="form-row" style="margin-bottom:12px">
                        <label class="form-label">IdP Entity ID</label>
                        <input class="form-input" id="samlIdpEntity" 
                        placeholder="https://your-idp.com/entity" type="text"
                         v-model="samlForm.idp_entity_id"/>
                    </div>
                </div>

                <div class="form-row" style="margin-bottom:12px">
                    <label class="form-label">X.509 Certificate</label>
                    <textarea class="form-input" id="samlCert" rows="3" style="font-family:'JetBrains Mono',monospace;font-size:0.72rem;resize:vertical"
                    v-model="samlForm.x509_cert"
                    placeholder="-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----"></textarea>

                </div>
                <div style="display:flex;gap:8px">
                    <button class="btn btn-primary btn-sm"
                    type="button"
                    @click="saveSamlSso">
                    Save SAML Config
                    </button>
                    <button class="btn btn-outline btn-sm" type="button"
                    @click="onClikTestLogin">
                    Test Login
                    </button>
                </div>
        </div>

        <div class="card">
            <div style="font-size:0.78rem;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--ink-dim);margin-bottom:16px">
                Danger Zone
            </div>
            <div style="display:flex;flex-direction:column;gap:10px">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border:1.5px solid rgba(220,38,38,0.2);border-radius:var(--r-sm);background:var(--red-light)">
                    <div>
                        <div style="font-size:0.82rem;font-weight:700;color:var(--red)">
                            Purge All Sessions
                        </div>
                        <div style="font-size:0.72rem;color:var(--ink-dim)">
                            Force all users to re-authenticate
                        </div>
                    </div>
                    <button class="btn btn-danger btn-sm" type="button"
                     @click="saveSessionsPurge">
                        Purge
                    </button>
                </div>

                <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border:1.5px solid rgba(220,38,38,0.2);border-radius:var(--r-sm);background:var(--red-light)">
                    <div>
                        <div style="font-size:0.82rem;font-weight:700;color:var(--red)">
                            Maintenance Mode
                        </div>
                        <div style="font-size:0.72rem;color:var(--ink-dim)">
                            Take the platform offline for maintenance
                        </div>
                    </div>
                    <button class="btn btn-danger btn-sm" 
                    type="button"
                     @click="saveMaintenanceMode">
                    {{ security_maintenance_mode === 1 ? 'Disable' : 'Enable' }}
                    </button>
                </div>
            </div>
        </div>

        <AuditLog />
    </div>
</div>
</template>

<style>
.toggle-track{
    width: 32px; height: 18px;
    background: var(--border);
    border-radius: 99px; cursor: pointer;
    position: relative; 
    transition: background 0.2s;
}

.toggle-track.toggle-on{
    width: 32px;
    height: 18px;
    background: var(--teal);
    border-radius: 99px;
    cursor: pointer;
    position: relative;
    transition: background 0.2s;
}

.toggle-track .toggle-thumb{
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    background: rgb(255, 255, 255);
    border-radius: 50%;
    transition: left 0.15s;
}

.toggle-track.toggle-on .toggle-thumb{
  position: absolute;
    top: 2px;
    left: 16px;
    width: 14px;
    height: 14px;
    background: rgb(255, 255, 255);
    border-radius: 50%;
    transition: left 0.15s;
}
</style>