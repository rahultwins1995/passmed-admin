<script setup lang="ts">
import Loading from '@/components/loaders/Loading.vue'

import { ref, onMounted,reactive, watch } from 'vue'

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

  const initForm={
    title: "",
    message: "",
    user_id: "0",
    type: "default",
    status: "0",
};

const addFromModel = reactive<any>(initForm);

// Reset form
const resetForm =async () => {
  Object.assign(addFromModel,initForm);
};

// VALIDATION FUNCTION
const validateForm = () => {
    
  if (!addFromModel.title.trim()) {
    $toast("title required", "error");
    return false;
  }

  if (!addFromModel.user_id) {
    $toast("Sent To required", "error");
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

  closeModal();

   fullLoading.value=true;

  try {

    const res:any =await $api.post("/notifications/add",addFromModel);

    if (res.data.status === "success") {
       emit("saved", true);
          const message = res?.data?.msg || 'Sent message is successfully.'
          $toast(message,'success');

    }else{
      const message = res?.data?.msg || 'Failed to sent message.'
      $toast(message,'error');
    }


  } catch (err:any) {
    const message = err?.response?.data?.msg ||err?.response?.data?.message || 'Failed to sent message.'
    $toast(message,'error');

  } finally {
     fullLoading.value=false;
  }
};

/*
* FETCH DATA
*/


const filter_search = ref<any>('')
const limit_data = ref(500)
const getDataList = ref<any[]>([])
const fetchData = async () => {
  fullLoading.value = true

  try {
    const res:any = await $api.post("/notifications/usersList", {
      search: filter_search.value,
      limit: limit_data.value
    })
    const obj:any = res.data;

    if (obj.status === 'success') {
     
      const dataList= obj.data||[];
      getDataList.value = dataList;

    } else {
      getDataList.value = []
     
    }

  } catch (err) {
    
    getDataList.value = []
  } finally {
    fullLoading.value = false
  }
}
/* * FETCH DATA END */

watch(()=>props.modelValue, async(val) => {

   await resetForm();

    if(val){
       await fetchData();
    }
});

</script>

<template>
  <Loading v-if="fullLoading"/>

    <div v-if="modelValue" class="overlay open" @click.self="closeModal">

        <div class="drawer" style="width:700px;max-width:97vw">
            <div class="drawer-header">
            <div>
                <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:6px">
                   Notifications Message
                </div>
                 <div  class="instEditorTitle">
                    Notifications Message
                </div>
            </div>

                <button class="drawer-close" type="button"
                @click="closeModal" >
                    <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" 
                    viewBox="0 0 24 24" width="13">
                    <line x1="18" x2="6" y1="6" y2="18"></line>
                    <line x1="6" x2="18" y1="6" y2="18"></line>
                    </svg>
                </button>
            </div>

            <div class="drawer-body">
        
                <div class="form-row" style="margin: 0 0 12px">
                    <label class="form-label">Name</label>
                    <input class="form-input" name="title"
                    placeholder="title..."
                    type="text"
                    v-model="addFromModel.title"
                    />
                </div>
                <div class="form-row" style="margin: 0 0 12px">
                    <label class="form-label">Sent To</label>
                    <select class="form-input form-select" id="type"
                    v-model="addFromModel.user_id">
                    <option value="0"> !-- Select Users --! </option>
                    <option v-for="(vl, i) in getDataList" :key="i"
                    :value="vl.id">
                        {{ vl.email}}
                    </option>
                
                    </select>
                </div>

                <div class="form-row">
                    <label class="form-label">
                        Messages
                    </label>
                    <textarea class="form-input" id="content" rows="10" 
                    style=" resize: vertical;font-size: 0.78rem;line-height: 1.7;"
                    v-model="addFromModel.message"
                    ></textarea>
                </div>

                <div class="form-row-2">
                  <div class="form-row">
                      <label class="form-label">Status</label>
                      <select class="form-input form-select" name="status" 
                      v-model="addFromModel.status">
                          <option value="1">Active</option>
                          <option value="0">Draft</option>
                          <option value="2">Archive</option>
                      </select>
                  </div>

                  <div class="form-row">
                      <label class="form-label">Message Type</label>
                      <select class="form-input form-select" name="type" 
                      v-model="addFromModel.type">
                          <option value="milestone">Milestone</option>
                          <option value="new_content">New content</option>
                          <option value="account">Account</option>
                          <option value="reminder">Reminders</option>
                          <option value="default">Message</option>
                      </select>
                  </div>
                </div>

                  <div class="bottomwrapbtn" style="display: flex;gap: 8px;margin-top: 33px;margin-bottom:25px;">
                      <button class="btn btn-primary popupSubmitBtn" 
                      style="flex:1"
                      type="button"
                       @click="submitForm" >
                        Send Message
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