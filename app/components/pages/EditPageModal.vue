<script setup lang="ts">
import { ref, watch,computed  } from 'vue'
import Loading from '@/components/loaders/Loading.vue'
import HtmlSourcePreview from '@/components/pages/HtmlSourcePreview.vue'

const props = defineProps<{
  modelValue: boolean
  detail: any | null
}>()

const emit = defineEmits(['update:modelValue', 'saved'])

const { $api, $toast,$confirm } = useNuxtApp();
const pageDetail = ref<any>(null)

const fullLoading=ref<boolean>(false);
const activeTab = ref<string>('pe-general')
const setPageEditorTab = (tab:string)=>{
  activeTab.value = tab
}

const addform = reactive({
  title: '',
  status: '1',
  slug: '',
  seo_title: '',
  seo_keywords: '',
  seo_description: '',
  content_html: '',
  content_1: '',
  canonical_url: '',
  form_intro_html: '',
  form_success_html: '',
  hero_title: '',
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
});

// close modal
const closeModal = () => {
  emit('update:modelValue', false)
}

// submit
const submitSave = async () => {

 if (!props.detail?.id) return

  closeModal();
  fullLoading.value = true;

  try {
    const res:any = await $api.post('/pages/update/'+props.detail.id, addform);

    if (res.data.status === 'success') {
          const message = res?.data?.msg || 'Changes saved successfully.'

        fullLoading.value = false;
        
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

const fetchData = async () => {
  if (!props.detail?.id) return
  try {
    const res:any = await $api.get("/pages/details/"+props.detail.id)
    const obj:any = res.data

    if (obj.status === 'success') {
      const detail= obj.data;
      pageDetail.value=detail;

      addform.title=detail?.title??'';
      addform.slug=detail?.slug??'';
      addform.seo_title=detail?.seo_title??'';
      addform.seo_keywords=detail?.seo_keywords??'';
      addform.seo_description=detail?.seo_description??'';
      addform.content_html=detail?.content??'';
      addform.content_1=detail?.content_1??'';
      addform.canonical_url=detail?.canonical_url??'';
      addform.status=detail?.status??'1';
      addform.form_intro_html = detail?.form_intro_html ?? ''
      addform.form_success_html = detail?.form_success_html ?? ''
      addform.hero_title = detail?.hero_title ?? ''
      addform.form_submit_label = detail?.form_submit_label ?? 'Send message'
   
      addform.form_fields = (detail?.form_fields 
      ? (typeof detail.form_fields === 'string' 
      ? JSON.parse(detail.form_fields) 
      : detail.form_fields)
      : []
      ).map((f: any) => ({
      ...f,
      options: Array.isArray(f.options)? f.options.map((o: any) => 
        typeof o === 'string'? { value: o, label: o }: o): []
      }))
    }
  } catch (err: any) {
  }
}

const cleanHtml = (html: string) => {
    if (!html) return ''
   return html
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


const editLoadPage=()=>{
  const detail =pageDetail.value;
  if(detail){
    addform.title=detail?.title??'';
    addform.slug=detail?.slug??'';
    addform.seo_title=detail?.seo_title??'';
    addform.seo_keywords=detail?.seo_keywords??'';
    addform.seo_description=detail?.seo_description??'';
    addform.content_html=detail?.content??'';
    addform.content_1=detail?.content_1??'';
    addform.canonical_url=detail?.canonical_url??'';
    addform.status=detail?.status??'1';
    addform.form_intro_html = detail?.form_intro_html ?? ''
    addform.form_success_html = detail?.form_success_html ?? ''
    addform.hero_title = detail?.hero_title ?? ''
    addform.form_submit_label = detail?.form_submit_label ?? 'Send message'
    addform.form_fields = (detail?.form_fields 
    ? (typeof detail.form_fields === 'string' 
    ? JSON.parse(detail.form_fields) 
    : detail.form_fields)
    : []
    ).map((f: any) => ({
    ...f,
    options: Array.isArray(f.options)? f.options.map((o: any) => 
        typeof o === 'string'? { value: o, label: o }: o): []
    }))
  }
}

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

const onClickPreviewUrl=async()=>{
    const details = pageDetail.value;
    if (!details?.slug){
    return;
    }
   
    let url = baseUrl(details.slug);
    if (!url.startsWith('http')) {
    url = `https://${url}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
}

// counts
const titleCharCount = computed(() => addform.seo_title.length)
const descCharCount = computed(() => addform.seo_description.length)

// color class
const getSeoClass = (count:number, limit:number) => {
  if (count > limit) return 'seo-red'
  if (count >= limit - 10) return 'seo-amber'
  return 'seo-normal'
}

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

// progress bar (3 fields)
const seoProgress = computed(() => {
  let filled = 0
  if (addform.seo_title) filled++
  if (addform.seo_description) filled++
  if (addform.slug) filled++

  return (filled / 3) * 100
})


watch(() => props.modelValue, async (val) => {
  setPageEditorTab('pe-general');

   pageDetail.value =props.detail;

  if (val && props.detail?.id) {

    //instant UI fill fast Load
     editLoadPage();

     //fresh data in the background
      fetchData();
  } else {
    pageDetail.value = null
  }
})

</script>

<template>

  <Loading v-if="fullLoading"/>

  <div v-if="modelValue" class="overlay overlay-top open" @click.self="closeModal">
      <div class="drawer" style="width:820px;max-width:96vw">
          <div class="drawer-header">
              <div>
                  <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:4px">Page Editor</div>
                  <div id="pePageHeader" style="font-size:0.95rem;font-weight:700;color:var(--ink)">
                    Edit Page
                  </div>
              </div>

            <div style="display:flex;gap:8px;align-items:center">
                <button class="btn btn-outline btn-sm" id="examPreviewBtn"
                style="display:flex;align-items:center;gap:5px"
                type="button"
                @click="onClickPreviewUrl"
                >
                <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" 
                stroke-width="2.5" viewBox="0 0 24 24" width="12">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
                </svg>
                  Preview
                </button>

                <button class="drawer-close" 
                    type="button"
                    @click="closeModal">
                <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round"
                stroke-width="2.5" viewBox="0 0 24 24" width="13">
                <line x1="18" x2="6" y1="6" y2="18"></line>
                <line x1="6" x2="18" y1="6" y2="18"></line>
                </svg>
                </button>
             </div>

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
                      v-model="addform.canonical_url"
                      />
                  </div>
              </div>


              <!-- Content tab -->
              <div class="tab-content etab-content-pe-content"
              :class="{active:activeTab==='pe-content'}">
               
                <div class="form-row">
                  <label class="form-label">Hero Title</label>
                  <textarea class="form-input" rows="6" v-model="addform.hero_title"></textarea>
                </div>

                  <HtmlSourcePreview label="HTML Content" :rows="6" v-model="addform.content_html" />

                  <HtmlSourcePreview label="HTML Content 2" :rows="6" v-model="addform.content_1" />

                    <!-- rowFrmFldWrap -->
                    <div class="formrow rowFrmFldWrap"
                    v-if="['contact', 'institutions'].includes(pageDetail?.slug)">


                          <div class="columnFrmFldWrap">
                              <HtmlSourcePreview label="Form Intro" :rows="4"
                                placeholder="<p>Contact us and we'll get back to you...</p>"
                                v-model="addform.form_intro_html" />
                          </div>

                          <div class="columnFrmFldWrap">
                              <HtmlSourcePreview label="Form Success Message" :rows="4"
                                placeholder="<p>Thank you! We'll be in touch soon.</p>"
                                v-model="addform.form_success_html" />
                          </div>

                           <div class="form-row rowtitlePgfm">
                            <label class="form-label">
                              Form  Fields
                            </label>
                          </div>
                          
                            <!-- columnFrmFldWrap -->
                            <div class="columnFrmFldWrap" v-for="(field, index) in addform.form_fields"
                            :key="index">

                              <div class="form-row">
                                <label class="form-label">
                                  Click to checkbox and input filed is Required  
                                  <button
                                  class="btninputdelteFiled"
                                  @click="addform.form_fields.splice(index, 1)"
                                  type="button">
                                    <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" stroke-width="2.5"
                                    viewBox="0 0 24 24" width="12">
                                      <polyline points="3 6 5 6 21 6"></polyline>
                                      <path d="M19 6l-1 14H6L5 6"></path>
                                    </svg>
                                  </button>
                                </label>

                                <div class="frmchckbxFld">
                                    <input class="inptcheckbox" type="checkbox" v-model="field.required" />
                                    <label>Required</label>
                                </div>
                              </div>

                              <!-- Row  filed label -->
                              <div class="form-row">
                                <label class="form-label">Label Name</label>
                                <input class="form-input" style="flex:1;min-width:0"
                                placeholder="Field label (e.g. Your Name)"
                                v-model="field.label" />
                              </div>

                              <!-- Row  Placeholder + Type -->
                              <div class="form-row-2">
                                <!-- Row field_name -->
                                <div class="form-row">
                                <label class="form-label">
                                Input Field Name
                                <span style="text-transform: lowercase;font-weight:400;font-size:0.72rem;color:var(--ink-dim)">
                                your_name, email, message
                                </span>
                                </label>
                                <input class="form-input"
                                style="flex:1;min-width:0"
                                placeholder="field_name (e.g. your_name)"
                                v-model="field.field_name" />
                                </div>

                                <!-- Row type -->
                                <div class="form-row">
                                  <label class="form-label">
                                  Input field type
                                  </label>
                                  <select class="form-input form-select" style="flex-shrink:0"
                                  v-model="field.type">
                                  <option value="text">Text</option>
                                  <option value="select">Select</option>
                                  <option value="email">Email</option>
                                  <option value="textarea">Textarea</option>
                                  <option value="date">Date</option>
                                  <option value="time">Time</option>
                                  <option value="url">URL</option>
                                  <option value="checkbox">Checkbox</option>
                                  <option value="file">File</option>
                                  <option value="hidden">Hidden</option>
                                  <option value="number">Number</option>
                                  <option value="password">Password</option>
                                  <option value="radio">Radio</option>
                                  <option value="range">Range</option>
                                  <option value="reset">Reset</option>
                                  <option value="tel">Tel</option>
                                  </select>
                                </div>

                                <!-- Row placeholder -->
                                <div class="form-row">
                                  <label class="form-label">
                                  Input Field Placeholder
                                  </label>
                                  <input class="form-input"
                                  style="flex:1;min-width:0"
                                  placeholder="Placeholder (e.g. Jane Smith)"
                                  v-model="field.placeholder" />
                                </div>

                                <!-- Row CSS Class -->
                                <div class="form-row">
                                  <label class="form-label">
                                  Input Field Class Name
                                  </label>
                                  <input class="form-input"
                                  style="flex:1;min-width:0"
                                  placeholder="CSS class"
                                  v-model="field.class" />
                                </div>
                              </div>

                              <!-- ADD select option  -->
                              <div class="form-row"
                              v-if="field.type === 'select' || field.type === 'radio'">
                                  <label class="form-label">
                                  Options
                                  </label>

                                  <div class="rowinptfldot"
                                  v-for="(opt, oi) in field.options"
                                    :key="oi"
                                    >

                                    <input class="form-input inputfldot"
                                    :placeholder="'value_' + (oi + 1)"
                                    v-model="opt.value" />

                                    <input class="form-input inputfldot"
                                    :placeholder="'Option ' + (oi + 1)"
                                    v-model="opt.label" />

                                    <button class="fldotbtn"
                                    @click="field.options.splice(oi, 1)"
                                    type="button">
                                      <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" 
                                        stroke-width="2.5"
                                          viewBox="0 0 24 24" width="12">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6l-1 14H6L5 6"></path>
                                        </svg>
                                    </button>
                                  </div>

                                  <button type="button" class="btn btn-outline btn-sm addfldot"
                                  style="margin-top:4px"
                                  @click="field.options.push({ value: '', label: '' })">
                                  + Add Option
                                  </button>
                              </div>

                            </div>
                            <!-- columnFrmFldWrap -->

                          <div class="form-row">
                              <button type="button" class="btn btn-outline btn-sm inputfiledBtn"
                              style="margin-top:4px"
                              @click="addform.form_fields.push({
                              label: '',
                              class: '', placeholder: '', 
                              required: false,field_name: '', type: 'text',
                              options: [] 
                              })">
                              + Add Field
                              </button>
                          </div>

                          <!-- Submit Button Text -->
                          <div class="form-row">
                            <label class="form-label">
                              Submit Button Text
                              <span class="sub-form-label">
                              (e.g. Send message, Submit)
                              </span>
                            </label>
                            <input class="form-input"
                            placeholder="Send message"
                            v-model="addform.form_submit_label" />
                          </div>
                    </div>
                  <!-- rowFrmFldWrap end -->
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