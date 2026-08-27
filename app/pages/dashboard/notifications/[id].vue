<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})


import Loader_small from '@/components/loaders/Loader_small.vue'

import { ref, onMounted} from 'vue'
import { useRoute } from 'vue-router'

const { $toast,$api,$confirm } = useNuxtApp()
const route = useRoute()
const id = route.params.id;

const pageDetail = ref<any>(null);

const fullLoading=ref<boolean>(false);


/**
 *  fetch data by id
 */ 
const fetchData = async () => {

  fullLoading.value = true
 
  try {
    const res:any = await $api.get("/notifications/show/" +id)
    
    if (res?.data?.status === 'success') {
        const detail = res.data.data;
        pageDetail.value=detail;
    }else{
          pageDetail.value = null;
          const message = res?.data?.msg || 'No data found.'
          $toast(message,'error');
    }

  } catch (err:any) {
         pageDetail.value = null;
        const message = err?.response?.data?.message || 'No data found.'
        $toast(message,'error');
        
  } finally {
    fullLoading.value = false
  }
}

/**
 *  read notify
*/
const fetchread = async () => {
  try {
   await $api.get('/notifications/read/'+id)
  } catch {}
}

onMounted(async ()=> {
   await fetchData()
   // read mark 
    await fetchread()          
   // topbar count ko turant refresh and signal sent immediately 
   window.dispatchEvent(new CustomEvent('notif:refresh'))
});

</script>

<template>
 <div class="dashwrap">

        <div class="section-hdr">
            <div class="section-hdr-left">
                <h2>Notifications View</h2>
            </div>

            <div class="section-hdr-right">
                <NuxtLink class="btn btn-primary btn-sm" 
                to="/dashboard/notifications/">
                    Go Back
                </NuxtLink>
            </div>
        </div>

         <div class="card" style="margin-bottom:20px"
             v-if="fullLoading ||!pageDetail">
            <Loader_small />
        </div>

         <div v-else
         class="card" style="margin-bottom:20px">
            
                <div class="form-row-2" style="margin: 0 0 12px">
                    <div class="form-row" style="margin: 0 0 12px">
                        <label class="form-label">Title</label>
                        <div class="fieldinput">
                            {{  pageDetail?.title??'-' }}
                        </div>
                    </div>
                    <div class="form-row">
                        <label class="form-label">Status</label>
                        <span v-if="Number(pageDetail.status) === 1" class="badge badge-green">
                            Active
                        </span>
                        <span v-else class="badge badge-danger">
                            Deactive
                        </span>
                    </div>
                </div>

                <div class="form-row-2" style="margin: 0 0 12px">
                <div class="form-row" style="margin: 0 0 12px">
                    <label class="form-label">From:</label>
                    <div class="fieldinput">
                        {{  pageDetail?.parent?.email??'-' }}
                    </div>
                </div>
                <div class="form-row" style="margin: 0 0 12px">
                    <label class="form-label">To:</label>
                    <div class="fieldinput">
                        {{  pageDetail?.user?.email??'-' }}
                    </div>
                </div>
         </div>

                <div class="form-row">
                    <label class="form-label">
                    Message
                    </label>
                    <div class="fieldinput" v-html="safeHtmlContent(pageDetail?.message)"></div>
                </div>
             
        </div>

    </div>
</template>