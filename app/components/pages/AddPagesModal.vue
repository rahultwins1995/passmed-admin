<script setup lang="ts">
import { ref , watch,computed } from 'vue'
import Loading from '@/components/loaders/Loading.vue'
import HtmlSourcePreview from '@/components/pages/HtmlSourcePreview.vue'

const props = defineProps({
  modelValue: Boolean
});

const { $api, $toast,$confirm } = useNuxtApp()
const emit = defineEmits(['update:modelValue', 'saved'])

// close modal
const closeModal = () => {
  emit('update:modelValue', false)
}

const fullLoading=ref<boolean>(false);
const activeTab = ref<string>('pe-general')
const setPageEditorTab = (tab:string)=>{
  activeTab.value = tab
}

const initialForm = {
  title: '',
  status: '1',
  slug: '',
  seo_title: '',
  seo_keywords: '',
  seo_description: '',
  content_html: '',
  content_1: '',
  canonical_url: '',
  hero_title:'',
  form_intro_html: '',
  form_success_html: '',
  form_submit_label: 'Send message', 
 form_fields: [] as { 
  label: string;
  class: string;
  placeholder: string;
   required: boolean;
   type: string;
   field_name: string; 
  options: { value: string; label: string }[];
   }[]
}

const addform = reactive({ ...initialForm })
const resetForm = () => {
  Object.assign(addform, initialForm)
  activeTab.value = 'pe-general';
}

// submit
const submitSave = async () => {

  closeModal();
  fullLoading.value = true;

  try {
    const res:any = await $api.post('/pages/add', addform);

    if (res.data.status === 'success') {
          const message = res?.data?.msg || 'Changes saved successfully.'

        fullLoading.value = false;
        resetForm();
         $toast(message);
          emit('saved', true); 

     }else{
           $toast('Failed to saved','error');
    }

  } catch (err:any) {
   
    fullLoading.value = false;
      const message = err?.response?.data?.message || 'Failed to saved.'
     $toast(message,'error');

  }
}

const cleanHtml = (val: string) => {
  if (!val) return ''
   return val
    .replace(/[ \t]{2,}/g, ' ')
};

watch(() =>addform.content_html, (val) => {
   const cleaned = cleanHtml(val);
  if (cleaned !== val) {
  addform.content_html=cleaned;
  }
})

watch(() =>addform.hero_title, (val) => {
   const cleaned = cleanHtml(val);
  if (cleaned !== val) {
  addform.hero_title=cleaned;
  }
})

watch(() =>addform.content_1, (val) => {
   const cleaned = cleanHtml(val);
  if (cleaned !== val) {
  addform.content_1=cleaned;
  }
})


const pageSlug=ref<any>('');
watch(() => addform.slug, (val) => {
  if(val){
     pageSlug.value = (val || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
  }else{
    pageSlug.value="";
  }
})


/* =========================
 SEO 
========================= */

const TITLE_LIMIT = 60
const DESC_LIMIT = 155

// preview title
const previewTitle = computed(() => {

  if (!addform.seo_title){
    if(!addform.title){
       return '';
    }else{
      return addform.title;
    }
  }

  return addform.seo_title.length > TITLE_LIMIT
    ? addform.seo_title.slice(0, TITLE_LIMIT) + '...'
    : addform.seo_title
})

// preview description
const previewDescription = computed(() => {
  if (!addform.seo_description) return 'Meta description will appear here...'
  return addform.seo_description.length > DESC_LIMIT
    ? addform.seo_description.slice(0, DESC_LIMIT) + '...'
    : addform.seo_description
})

// preview url
const previewUrl = computed(() => {
  return baseUrl(pageSlug.value || 'sample-page')
})

// counts
const titleCharCount = computed(() => addform.seo_title.length)
const descCharCount = computed(() => addform.seo_description.length)

// color class
const getSeoClass = (count:number, limit:number) => {
  if (count > limit) return 'seo-red'
  if (count >= limit - 10) return 'seo-amber'
  return 'seo-normal'
}

// progress bar (3 fields)
const seoProgress = computed(() => {
  let filled = 0
  if (addform.seo_title) filled++
  if (addform.seo_description) filled++
  if (addform.slug) filled++

  return (filled / 3) * 100
})

watch(() => props.modelValue, (val) => {
  if (val) {
    resetForm();
  }
});

</script>

<template>
   <Loading v-if="fullLoading"/>
<div v-if="modelValue" class="overlay overlay-top open" @click.self="closeModal">
    <div class="drawer" style="width:720px;max-width:96vw">
        <div class="drawer-header">
            <div>
                <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:4px">Page Editor</div>
                <div id="pePageHeader" style="font-size:0.95rem;font-weight:700;color:var(--ink)">New Page</div>
            </div>
            <button class="drawer-close" 
                type="button"
                @click="closeModal">
            <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="13"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>
            </button>
        </div>
        <div class="drawer-body">
            <!-- Tabs -->
            <div style="display:flex;border-bottom:2px solid var(--border);margin-bottom:20px">
                <button class="tab-btn"
                :class="{active:activeTab==='pe-general'}"
                id="etab-pe-general" type="button"
                @click="setPageEditorTab('pe-general')">
                General
            </button>
                <button class="tab-btn"
                :class="{active:activeTab==='pe-seo'}"
                id="etab-pe-seo" type="button"
                @click="setPageEditorTab('pe-seo')">
                SEO
            </button>
                <button class="tab-btn"
                 :class="{active:activeTab==='pe-content'}"
                 id="etab-pe-content" type="button"
                 @click="setPageEditorTab('pe-content')">
                 Content
                </button>
            </div>

            <!-- General tab -->
            <div class="tab-content etab-content-pe-general"
            :class="{active:activeTab==='pe-general'}"
             >
                <div class="form-row-2">
                    <div class="form-row" style="margin-bottom:12px">
                        <label class="form-label">
                        Page Title</label>
                        <input class="form-input" id="pePageTitle" type="text"
                         v-model="addform.title" />
                    </div>
                    <div class="form-row" style="margin-bottom:12px">
                        <label class="form-label">Status</label>
                        <select class="form-input form-select" id="pePageStatus"
                        v-model="addform.status">
                            <option value="1">Live</option>
                            <option value="0">Draft</option>
                            <option value="2">Archived</option>
                        </select>
                    </div>
                </div>
                <div class="form-row" style="margin-bottom:12px"><label class="form-label">URL Slug</label>
                    <div style="display:flex;align-items:center">
                        <span style="background:var(--surface);border:1.5px solid var(--border);border-right:none;border-radius:var(--r-sm) 0 0 var(--r-sm);padding:9px 10px;font-size:0.78rem;color:var(--ink-dim)">
                          {{ baseUrl() }}
                        </span>
                        <input class="form-input" 
                        style="border-radius:0 var(--r-sm) var(--r-sm) 0" type="text"
                        v-model="addform.slug"/>
                    </div>
                </div>
                <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:var(--r-sm);padding:12px 14px;font-size:0.78rem;color:var(--ink-dim)"
                >
                    Saving with status <strong>Live</strong> publishes the page to the site straight away.
                    Choose <strong>Draft</strong> to keep working on it without it going public — you can
                    publish it later from the Pages list.
                </div>
            </div>

            <!-- SEO tab -->
            <div class="tab-content etab-content-pe-seo"
             :class="{active:activeTab==='pe-seo'}"
            >
                <div class="form-row">
                    <label class="form-label">Meta Title</label>
                    <input class="form-input"
                     placeholder="Page title for search engines"
                     v-model="addform.seo_title"
                     />
                    <div class="seoTitleCount"
                    :class="getSeoClass(titleCharCount, 60)">
                    {{ titleCharCount }} / 60
                    </div>
                </div>
                <div class="form-row">
                    <label class="form-label">Meta keywords</label>
                    <input class="form-input"
                     placeholder="Page keyword for search engines"
                     v-model="addform.seo_keywords"
                     />
                </div>
                <div class="form-row">
                    <label class="form-label">
                        Meta Description
                    </label>
                    <textarea class="form-input" id="peSeoDesc" 
                    rows="3" 
                    placeholder="Short description shown in search results..." 
                    style="resize:vertical"
                      v-model="addform.seo_description"></textarea>
                    <div class="seoDescCount"
                    :class="getSeoClass(descCharCount, 155)">
                    {{ descCharCount }} / 155 characters
                    </div>
                </div>
                <div class="seowraps">
                    <!-- PROGRESS BAR -->
                    <div class="seoprogressbar">
                        <div class="seoprogressitm"
                        :style="{ width: seoProgress + '%' }"
                        ></div>
                    </div>

                    <div class="seoGoogwrap">
                        <div class="seoGoogAreaPreview">
                            Google Preview
                            </div>

                        <!-- TITLE -->
                        <div class="seoGoogleTitlePreview">
                            {{ previewTitle }}
                        </div>

                            <!-- URL -->
                        <div class="seopreviewUrl">
                        {{ previewUrl }}
                        </div>
                        <!-- DESCRIPTION -->
                        <div id="googleDescPreview">
                            {{ previewDescription }}
                        </div>
                    </div>
                </div>

                <div class="form-row">
                    <label class="form-label">
                    Canonical URL 
                    <span style="font-weight:400;font-size:0.72rem;color:var(--ink-dim)">
                    (leave blank to use page URL)
                    </span>
                    </label>
                    <input class="form-input"
                    :placeholder="baseUrl()+'...'"
                    type="text"
                    v-model="addform.canonical_url"/>
                </div>
            </div>

            <!-- Content tab -->
            <div class="tab-content etab-content-pe-content"
            :class="{active:activeTab==='pe-content'}">
            
                <div class="form-row">
                <label class="form-label">Hero Title</label>
                <textarea class="form-input" rows="6" v-model="addform.hero_title"></textarea>
                </div>

                <HtmlSourcePreview label="HTML Content 1" :rows="6" v-model="addform.content_html" />

                <HtmlSourcePreview label="HTML Content 2" :rows="6" v-model="addform.content_1" />
            </div>
            <!-- end Content tab -->


             <div style="display:flex;gap:8px;padding-top:4px">
                <button class="btn btn-primary btn-sm"
                @click="submitSave">
                Save Changes
                </button>
            </div>
        </div>
    </div>
</div>

</template>