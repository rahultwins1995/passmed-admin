<script setup lang="ts">
import Loading from '@/components/loaders/Loading.vue'
import { ref, computed,reactive, onMounted } from 'vue'
import Multiselect from '@vueform/multiselect'

const props = defineProps<{
  modelValue: boolean
  pageDetail: any | null
  detailId: any | null
}>()
const emit = defineEmits(["update:modelValue"]);

const { $api,$toast,$confirm } = useNuxtApp()
const fullLoading= ref<boolean>(false);

//Close modal
const closeModal = () => {
  emit("update:modelValue", false);
};
const detail=ref<any>(null);


// Form Model (addModel)
const addFormModel = reactive<any>({
  email: "",
  subject: "",
  content: "",
});

// Reset form
const resetForm = () => {
  Object.assign(addFormModel, {
   email: "",
  subject: "",
  content: "",
  });
};


const submitSendEmail =  async (e:any) => {
  e.preventDefault();

  const details=detail.value;
    
    if(!details){
       return;
    }

  if (!addFormModel.subject) {
     $toast("Subject required","error");
    return;
  }

    if(!details.email){
          $toast('Failed to send mail','error');
        return;
    }

    addFormModel.email=details.email;

    fullLoading.value = true;

  try {

    const res:any =await $api.post("/email-templates/send",addFormModel);

    if (res.data.status === "success") {
            $toast("Send mail successfully");
       
        resetForm();
        closeModal();
    }else{
      const message = res?.data?.msg || 'Failed to send mail.'
      $toast(message,'error');
    }


  } catch (err:any) {
    const message = err?.response?.data?.msg || err?.response?.data?.message || 'Failed to send mail.'
    $toast(message,'error');

  } finally {
    fullLoading.value = false;
  }

}

const loaderEmailTemplate = ref<boolean>(false)
const hasMoreEmailTemplate = ref<boolean>(false)
const pageEmailTemplate = ref(1)
const limitEmailTemplate= ref(10)

const getEmailTemplateData = ref<any[]>([])

const fetchEmailTemplateData = async (reset = false) => {
  loaderEmailTemplate.value = true;
  try {

      if (reset) {
      pageEmailTemplate.value = 1
      getEmailTemplateData.value = []
      hasMoreEmailTemplate.value = true
    }

    const res:any = await $api.post('/email-templates/list/', {
      page: pageEmailTemplate.value,
      limit: limitEmailTemplate.value
    })

    const obj:any = res.data

    if (obj.status === 'success') {

         const newData = res.data.data || []
          if (newData.length === 0) {
            hasMoreEmailTemplate.value = false
          } else {
             const existingIds = new Set(
            getEmailTemplateData.value.map((item:any) => item.id)
            );
            const filteredData = newData.filter((item:any) => !existingIds.has(item.id));
            getEmailTemplateData.value.push(...filteredData)
            pageEmailTemplate.value++
          }


    } else {
      getEmailTemplateData.value = []
     
    }
  } catch (err) {
   
    getEmailTemplateData.value = []

  } finally {
    loaderEmailTemplate.value = false
  }
}

const emailTemplateOptions = computed(() => {
  return [
    {
         id: '0', name: '— Custom message —'
         },
    ...getEmailTemplateData.value
  ]
})


const emailTemplate=ref<any>(null);
watch(emailTemplate, async (id) => {

  const template = getEmailTemplateData.value.find(
    (item:any) => item.id === id
  )

  if (!template || id == 0) {
    addFormModel.subject = ''
    addFormModel.content = ''
    return
  }

  // overwrite protection
  if (addFormModel.subject || addFormModel.content) {
    const confirmed = await $confirm('Replace existing content?')
    if (!confirmed) {
      return
    }
  
  }

  addFormModel.subject = template.subject ?? ''
  addFormModel.content = template.content ?? ''
})

onMounted(() => {
    detail.value=props.pageDetail;
    
    if(props.modelValue === false){
        detail.value=null;
    }else{
        fetchEmailTemplateData();
    }
});

</script>

<template>
    <Loading v-if="fullLoading" />
    <div
    v-if="modelValue"
    class="overlay overlay-top open"  
    @click.self="closeModal">

        <div class="drawer" style="width:480px;max-width:97vw">
            <div class="drawer-header">
                <div>
                    <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:4px">
                    Email Template
                    </div>
                    <div id="sendEmailUserName" style="font-size:1rem;font-weight:700;color:var(--ink)">
                    {{ detail?.name??"-" }}
                    </div>
                </div>
                <button class="drawer-close" type="button"
                @click="closeModal">
                    <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" 
                        stroke-width="2.5" viewBox="0 0 24 24" width="13">
                        <line x1="18" x2="6" y1="6" y2="18"></line>
                        <line x1="6" x2="18" y1="6" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="drawer-body">
                <div class="form-row" style="margin-bottom:14px">
                    <label class="form-label">Template</label>
            
                    <Multiselect
                    class="multiemlTmp-select-options emlTmpl-select"
                    v-model="emailTemplate"
                    :options="emailTemplateOptions"
                    label="name"
                    valueProp="id"
                    trackBy="id"
                    :searchable="true"
                    :loading="loaderEmailTemplate"
                    />

                </div>

                <div class="form-row" style="margin-bottom:14px">
                    <label class="form-label">Subject</label>
                    <input class="form-input" id="sendEmailSubject" type="text" 
                    placeholder="Your Passmed subscription"
                    v-model="addFormModel.subject" />
                </div>

                <div class="form-row" style="margin-bottom:20px">
                    <label class="form-label">Message</label>
                    <textarea class="form-input" id="sendEmailBody"
                     rows="6" style="resize:vertical;font-family:'Figtree',sans-serif" 
                    placeholder="Write your message here..."
                     v-model="addFormModel.content"></textarea>
                </div>

                <div style="display:flex;gap:8px">
                    <button class="btn btn-primary" style="flex:1" type="button"
                    @click="submitSendEmail">
                    Send Email
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