<script setup lang="ts">
import Loading from '@/components/loaders/Loading.vue'
import { ref,reactive } from 'vue'

const props = defineProps({
  modelValue: Boolean 
});

const emit = defineEmits(["update:modelValue", "saved"]);
const { $toast, $api } = useNuxtApp()

//Close modal
const closeModal = () => {
  emit("update:modelValue", false);
};

const fullLoading=ref<boolean>(false);
const nameError = ref<string>('');

const initialForm={
  name: "",
  subject: "",
  content: "",
  type: "manual",
  status: "0",
};

const addFromModel = reactive<any>(initialForm );

// Reset form
const resetForm = () => {
  Object.assign(addFromModel, initialForm);
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

  nameError.value = '';
// VALIDATION CALL
  if (!validateForm()){
  return;
  }

   fullLoading.value=true;

  try {

    const res:any =await $api.post("/notification-templates/add",addFromModel);

    if (res.data.status === "success") {
        const message = res?.data?.msg || 'Add user successfully.'
        emit("saved", true);
        resetForm();
        $toast(message,'success');
        closeModal();
    }else{
      const message = res?.data?.msg || 'Failed to saved.'
      $toast(message,'error');
    }


  } catch (err:any) {
    const status = err?.response?.status;
    const message = err?.response?.data?.msg ||err?.response?.data?.message || 'Failed to saved.'
    if (status === 409 || /name already exists/i.test(message)) {
      nameError.value = message;
    }
    $toast(message,'error');

  } finally {
     fullLoading.value=false;
  }
};

const available_variables ="{{first_name}} {{exam_name}} {{plan_name}} {{expiry_date}} {{cta_button}}";
</script>

<template>
  <Loading v-if="fullLoading"/>

    <div v-if="modelValue"
    class="overlay open"  
    @click.self="closeModal">

        <div class="drawer" style="width:700px;max-width:97vw">
            <div class="drawer-header">
            <div>
                <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:6px">
                   Notifications Template
                </div>
                 <div  class="instEditorTitle">
                    Notifications Template
                </div>
            </div>
            <button class="drawer-close" type="button"
            @click="closeModal"
            >
              <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="13"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>
            </button>
            </div>
            <div class="drawer-body">
        
                <div class="form-row" style="margin: 0 0 12px">
                    <label class="form-label">Name</label>
                    <input class="form-input" name="name"
                    placeholder="new template"
                    type="text"
                    v-model="addFromModel.name"
                     @input="nameError = ''"
                    :class="{ 'is-invalid': nameError }"
                    />
                     <div v-if="nameError"
                         style="color:var(--red,#dc2626);font-size:0.72rem;margin-top:4px">
                      {{ nameError }}
                    </div>
                </div>
                <div class="form-row" style="margin: 0 0 12px">
                    <label class="form-label">Subject Line</label>
                    <input class="form-input" name="subject"
                    placeholder="e.g. Welcome to Passmed US"
                    type="text"
                    v-model="addFromModel.subject"
                    />
                </div>
                <div class="form-row">
                    <label class="form-label">
                    Body
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
                    <textarea class="form-input" id="content" rows="10" style=" resize: vertical;font-size: 0.78rem;line-height: 1.7;"
                    v-model="addFromModel.content"
                    ></textarea>
                    <div style="font-size:0.72rem;color:var(--ink-dim);margin-top:6px">
                      Rich text / HTML — tags like &lt;b&gt;, &lt;a&gt;, &lt;p&gt; and &lt;br&gt; render in the notification.
                    </div>
                </div>

                <div class="form-row" style="margin: 0 0 12px">
                    <label class="form-label">Email event</label>
                    <select class="form-input form-select" id="type"
                    v-model="addFromModel.type">
                    <option value="on-registration">On registration</option>
                    <option value="on-subscription">On subscription</option>
                    <option value="subscription-invite">Subscription invite</option>
                    <option value="subscription-payment-failure">Subscription payment failure</option>
                    <option value="subscription-expired">Subscription expired</option>
                    <option value="subscription-expire-soon">Subscription expires soon</option>
                    <option value="on-trial-start">On trial start</option>
                    <option value="2-days-before-trial-expires">2 days before trial expires</option>
                    <option value="7-days-before-subscription-expires">7 days before subscription expires</option>
                    <option value="3-days-before-subscription-expires">3 days before subscription expires</option>
                    <option value="on-payment-failure">On payment failure</option>
                    <option value="on-welcome">On welcome</option>
                    <option value="on-password-reset-request">On password reset request</option>
                    <option value="on-institutional-invite">On institutional invite</option>
                    <option value="manual">Manual / API trigger only</option>
                    </select>
                    <p class="form-hint" style="font-size:0.72rem;color:var(--ink-dim,#64748b);margin-top:5px;line-height:1.45;">
                        Binds this template to a transactional <strong>email</strong> event — when that event fires
                        (welcome, subscription confirmation, password reset, etc.) this template's subject &amp; content
                        are used for the email. This is the email content, <strong>not</strong> an in-app trigger —
                        in-app notification triggers are configured under Automated Rules.
                    </p>
                </div>
            
                <div class="form-row">
                    <label class="form-label">Status</label>
                    <select class="form-input form-select" name="status" 
                    v-model="addFromModel.status">
                        <option value="1">Active</option>
                        <option value="0">Draft</option>
                    </select>
                </div>

                  <div class="bottomwrapbtn" style="display: flex;gap: 8px;margin-top: 33px;margin-bottom:25px;">
                      <button class="btn btn-primary popupSubmitBtn" 
                      style="flex:1"
                      type="button"
                       @click="submitForm" >
                        Save Template
                      </button>

                      <button class="btn btn-outline popupSubmitBtn"  
                      type="button"
                      @click="closeModal">
                      Cancel
                    </button>
                  </div>

            </div>
        </div>
    </div>

</template>