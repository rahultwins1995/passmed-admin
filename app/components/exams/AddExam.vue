<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import { ref,reactive, onMounted, watch,computed } from 'vue'
import Loader_small from '@/components/loaders/Loader_small.vue'
import Loading from '@/components/loaders/Loading.vue'
import Empty from '@/components/loaders/Empty.vue'
import AddExamCategory from '@/components/exams/AddExamCategory.vue'


const props = defineProps({
  modelValue: Boolean 
});

const emit = defineEmits(["update:modelValue", "examSaved"]);

const { $api,$toast, $confirm } = useNuxtApp()
// Market currency symbol (₱ / A$ / C$ / R / £ / $) for the price inputs.
const { localSymbol } = useDisplayCurrency()
const fullLoading = ref(false);

const isTrialEnabled = ref(false)
const getQuestionsDataList = ref<any[]>([])
const dataQuestionsloading= ref<boolean>(false);
const filterquestions= ref<string>("");

//Close modal
const closeModal = () => {
  emit("update:modelValue", false);
};

const activeTab = ref('details');
const setTab =(tab:string) => {
  activeTab.value = tab;

  if(tab == "questions"){
    fetchQuestionsData()
  }
};

const infinitExamModel = {
  name:"",
  exam_category:"0",
  type:"shelf",
  slug:"",
  accent_color:"#06b6d4",
  accent_title:"teal",
  icon:"", // exam-type icon key (picker); empty → frontend falls back to category icon
  is_external:0,     // external link-out card (International Board Registration): no internal exam/checkout
  external_url:"",   // absolute URL the card opens (new tab) when is_external = 1
  short_description:"",
  format:"",
  administered_by:"",
  free_trial:1,
  free_trial_duration:"",
  free_trial_questions_accessible:"",
  free_trial_restriction_mode:"",
  status:1,
  question_ids:[],
  associated_with:[],
  seo_title:"",
  seo_description:"",
  seo_keywords:"",
  price_1:0,
  price_2:0,
  price_3:0,
  price_6:0,
  price_12:0,
  content:"",
  content_1:"",
  content_2:"",
  content_3:"",
  content_6:"",
  content_12:"",

  content_bluehairline:"",
  content_greyhairline:"",
  content_hero_tags:"",
  content_question_bank:"",
  content_glance:"",
  content_features:""
};
const addExamModel = reactive<any>(infinitExamModel);


const toggleFreeTrial = () => {
  isTrialEnabled.value = !isTrialEnabled.value
}

const setTheme = (name:string, color:string) => {
  addExamModel.accent_title = name
  addExamModel.accent_color = color
}

// Reset form
const resetForm = () => {
  Object.assign(addExamModel, infinitExamModel);
};

const slugify = (val: string) => (val || '')
  .toLowerCase()
  .trim()
  .replace(/\s+/g, "-")
  .replace(/[^a-z0-9-]/g, "")

// Once the admin edits the slug by hand, stop overwriting it from the name —
// otherwise a deliberate slug would be silently replaced on the next keystroke
// in the name field.
const slugTouched = ref(false)

// Build the slug live while the name is typed. The slug used to be filled in
// only at save time, so the preview URL shown above the field stayed on
// "sample-exam" the whole time the exam was being set up.
watch(() => addExamModel.name, (val) => {
  if (!slugTouched.value) addExamModel.slug = slugify(val)
})

watch(() => addExamModel.slug, (val) => {
  if(val){
     const clean = slugify(val)
     if (clean !== val) addExamModel.slug = clean
  }
})

const submitSaveExam = async (updateStatus:number=1) => {
    addExamModel.status=updateStatus;
  if (!addExamModel.name) {
    $toast("name required",'error');
    return;
  }

   if(!addExamModel.slug){
      addExamModel.slug = addExamModel.name
      .toLowerCase().replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '');
    }

    fullLoading.value = true;
  try {

      const res:any = await $api.post("/exams/add", { ...addExamModel, bundle_offers: bundleOffersPayload() })
      if (res?.data?.status === "success") {
        emit("examSaved", true)
        resetForm()
        closeModal()
          $toast(res?.data?.msg || 'Saved changes is done')
       }else{
          $toast(res?.data?.msg || 'Saved changes is done')
       }

  } catch (err:any) {
    $toast(err?.response?.data?.msg ||err?.response?.data?.message|| 'Failed to update request', 'error')
  } finally {
    fullLoading.value = false;
  }
};


// add option
const onClickSelectAllQuestion = () => {
   if(getQuestionsDataList.value.length === 0){
    $toast('No data load.','error');
    return;
  }

   if (addExamModel.question_ids.length === getQuestionsDataList.value.length) {
    addExamModel.question_ids = []
  } else {
    addExamModel.question_ids = getQuestionsDataList.value.map(item => item.id)
  }
}


// add option
const addQuestion = (id: number) => {

  const index = addExamModel.question_ids.indexOf(id)

  if (index === -1) {
    addExamModel.question_ids.push(id);
  } else {
    addExamModel.question_ids.splice(index, 1)
  }

}

const pageQcurrent = ref(1);
const limitQdata = ref(500);
const fetchQuestionsData = async () => {

  dataQuestionsloading.value = true
  const params:any={
    search:filterquestions.value,
    page: pageQcurrent.value,
    limit: limitQdata.value
  }
  if (sourceExamId.value) params.source_exam_id = sourceExamId.value
  try {
    const res:any = await $api.post("/exams/assign-questions/0",params);
    if (res?.data?.status === 'success') {
      // OWN questions only — associated rendered separately at the top of the list.
      getQuestionsDataList.value = res.data.data || []
    } else {
      getQuestionsDataList.value = []
    }

  } catch (err) {
    getQuestionsDataList.value = []
  } finally {
    dataQuestionsloading.value = false
  }
}

/* =========================
 SEO 
========================= */

const TITLE_LIMIT = 60
const DESC_LIMIT = 155

// preview title
const previewTitle = computed(() => {
  if (!addExamModel.seo_title) return '';
  return addExamModel.seo_title.length > TITLE_LIMIT
    ? addExamModel.seo_title.slice(0, TITLE_LIMIT) + '...'
    : addExamModel.seo_title
})

// preview description
const previewDescription = computed(() => {
  if (!addExamModel.seo_description) return 'Meta description will appear here...'
  return addExamModel.seo_description.length > DESC_LIMIT
    ? addExamModel.seo_description.slice(0, DESC_LIMIT) + '...'
    : addExamModel.seo_description
})

// preview url
const previewUrl = computed(() => {
   if(addExamModel.type == 'shelf'){
     return baseUrl()+'/'+(addExamModel.slug || 'sample-exam');
  }else{
     return baseUrl()+'/exams/'+(addExamModel.slug || 'sample-exam');
  }
})

// counts
const titleCharCount = computed(() => addExamModel.seo_title.length)
const descCharCount = computed(() => addExamModel.seo_description.length)

// color class
const getSeoClass = (count:number, limit:number) => {
  if (count > limit) return 'seo-red'
  if (count >= limit - 10) return 'seo-amber'
  return 'seo-normal'
}

const cleanHtml = (html: string) => {
  if (!html) return '';

  return html
    // remove extra spaces between tags
    .replace(/>\s+</g, '><')

    // fix unclosed <p>
    .replace(/<p>(.*?)<p>/g, '<p>$1</p>')

    // trim
    .trim();
};

/* ============ Import from .md ============ */

const MD_SECTION_MAP: Record<string, string> = {
  'blue hairline'  : 'content_bluehairline',
  'grey hairline'  : 'content_greyhairline',
  'gray hairline'  : 'content_greyhairline',
  'hero tags'      : 'content_hero_tags',
  'middle content' : 'content',
  'question bank'  : 'content_question_bank',
  'at a glance'    : 'content_glance',
  'features'       : 'content_features',
  '1 month'        : 'content_1',
  '2 months'       : 'content_2',
  '3 months'       : 'content_3',
  '6 months'       : 'content_6',
  '12 months'      : 'content_12',
};

const parseExamMarkdown = (raw: string) => {
  const result: Record<string, string> = {};
  if (!raw) return result;

  const text = raw.replace(/\r\n/g, '\n');
  // split before every "## " heading
  const blocks = text.split(/\n(?=##\s)/);

  for (const block of blocks) {
   const m = block.match(/^##\s+([^\n]+)\n?([\s\S]*)$/);
    if (!m || !m[1]){
      continue;
    }

    const heading = m[1].trim().toLowerCase();
    const body = (m[2] || '').trim();
    const field = MD_SECTION_MAP[heading];
    if (field) result[field] = body;
  }
  return result;
};

const mdFileInput = ref<HTMLInputElement | null>(null);
const triggerMdImport = () => mdFileInput.value?.click();
const dragOver = ref(false);

const mdRawContent = ref<string>('');
const mdFileName = ref<string>('');

const handleMdFile = (file?: File | null) => {
  if (!file) return;
  if (!/\.(md|markdown)$/i.test(file.name)) {
    $toast('Please upload a .md file', 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    $toast('File too large (max 5MB)', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    mdRawContent.value = String(reader.result || '');
    mdFileName.value = file.name;
    $toast(`${file.name} loaded — click "Generate Page HTML"`);
  };
  reader.onerror = () => $toast('Failed to read file', 'error');
  reader.readAsText(file);
};

const confirmMdUpload = async () => {
  if (!mdRawContent.value) {
    $toast('Please upload a .md file first', 'error');
    return;
  }
  const parsed = parseExamMarkdown(mdRawContent.value);
  const keys = Object.keys(parsed);
  if (keys.length === 0) {
    $toast('No matching sections found in file', 'error');
    return;
  }

  const ok = await $confirm(
    `This will overwrite ${keys.length} page section(s) from "${mdFileName.value}". Continue?`
  );
  if (!ok) return;

  keys.forEach((k) => { addExamModel[k] = parsed[k]; });
  $toast(`Imported ${keys.length} section(s)`);
};

const onImportMd = (e: Event) => {
  const target = e.target as HTMLInputElement;
  handleMdFile(target.files?.[0]);
  target.value = '';
};

const onDropMd = (e: DragEvent) => {
  dragOver.value = false;
  handleMdFile(e.dataTransfer?.files?.[0]);
};

const exportMd = () => {
  // [heading, field, sample] — sample is used as a placeholder when the field is empty,
  // so an export from a blank exam is still a usable starter template.
  const order: [string, string, string][] = [
    ['Blue Hairline',  'content_bluehairline',   'Trusted by 10,000+ students'],
    ['Grey Hairline',  'content_greyhairline',   'Updated for 2026'],
    ['Hero Tags',      'content_hero_tags',      'USMLE, Step 2 CK, NBME'],
    ['Middle Content', 'content',                '<p>Main exam page content. HTML is supported.</p>'],
    ['Question Bank',  'content_question_bank',  '<p>Describe the question bank for this exam.</p>'],
    ['At a Glance',    'content_glance',         '<ul><li>3500+ questions</li><li>Detailed explanations</li></ul>'],
    ['Features',       'content_features',       '<p>List the key features of this exam.</p>'],
    ['1 Month',        'content_1',              '<p>What the 1-month plan includes.</p>'],
    ['2 Months',       'content_2',              '<p>What the 2-month plan includes.</p>'],
    ['3 Months',       'content_3',              '<p>What the 3-month plan includes.</p>'],
    ['6 Months',       'content_6',              '<p>What the 6-month plan includes.</p>'],
    ['12 Months',      'content_12',             '<p>What the 12-month plan includes.</p>'],
  ];
  const md = order.map(([h, f, sample]) => `## ${h}\n${addExamModel[f] || sample}`).join('\n\n');
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (addExamModel.slug || 'exam-page') + '.md';
  a.click();
  URL.revokeObjectURL(url);
};

/* ============ end Import from .md ============ */

watch(() =>addExamModel.content, (val) => {
   const cleaned = cleanHtml(val);
  if (cleaned !== val) {
  addExamModel.content=cleaned;
  }
})

watch(() =>addExamModel.content_1, (val) => {
   const cleaned = cleanHtml(val);
  if (cleaned !== val) {
     addExamModel.content_1=cleaned;
  }
})

watch(() =>addExamModel.content_2, (val) => {
  const cleaned = cleanHtml(val);
  if (cleaned !== val) {
    addExamModel.content_2=cleaned;
  }
})

watch(() =>addExamModel.content_3, (val) => {
  const cleaned = cleanHtml(val);
  if (cleaned !== val) {
  addExamModel.content_3=cleaned;
  }
})


watch(() =>addExamModel.content_6, (val) => {
 addExamModel.content_6=cleanHtml(val);
})

watch(() =>addExamModel.content_12, (val) => {
   const cleaned = cleanHtml(val);
  if (cleaned !== val) {
  addExamModel.content_12=cleaned;
  }
})


// progress bar (3 fields)
const seoProgress = computed(() => {
  let filled = 0
  if (addExamModel.seo_title) filled++
  if (addExamModel.seo_description) filled++
  if (addExamModel.slug) filled++

  return (filled / 3) * 100
})

watch(isTrialEnabled, (val) => {
  addExamModel.free_trial = val ? 1 : 0
}, { immediate: true })

// update search 
watch(() => filterquestions, () => {
  setTimeout(()=>{
    fetchQuestionsData
  },800);
})


/***********start exam cat***************/
const examCategoryLoading=ref<boolean>(false);
const getExamCategoryDataList=ref<any[]>([]);
const pageExamCategory = ref(1)
const hasMoreExamCategory = ref(true)
const limitExamCategorydata = ref(500);
const inputSearchExamCategory = ref<any>("");

const fetchExamCategoryData= async (reset = false)=>{
  examCategoryLoading.value=true;
    try{
       if (reset) {
        pageExamCategory.value = 1
        getExamCategoryDataList.value = []
        hasMoreExamCategory.value = true
        }

        const res:any = await $api.post("/exams-categories/list",{
          search:inputSearchExamCategory.value,
          page:pageExamCategory.value,
          limit:limitExamCategorydata.value
        })
        const obj:any = res.data;
    
        if(obj.status == 'success'){
          const newData = obj.data || []
          if (newData.length === 0) {
            hasMoreExamCategory.value = false
          } else {
             const existingIds = new Set(
            getExamCategoryDataList.value.map((item:any) => item.id)
            );
            const filteredData = newData.filter((item:any) => !existingIds.has(item.id));
            getExamCategoryDataList.value.push(...filteredData)
      
            pageExamCategory.value++
          }
       
        }else{
        getExamCategoryDataList.value=[];
        }
    } catch(err){
      getExamCategoryDataList.value=[];
    }finally{
        examCategoryLoading.value=false;
    }
}

const examCategoryOptions = computed(() => {
  return [
    { id: '0', name: '! -- Select -- !' },
    ...getExamCategoryDataList.value
  ]
})

// Inline "create exam category" — opens the AddExamCategory drawer from the
// New-Exam flow, then refreshes the list and auto-selects the new category.
const showAddCategory = ref(false)
const onCategoryCreated = async (name?: any) => {
  await fetchExamCategoryData(true)
  const created = String(name || '').trim().toLowerCase()
  if (created) {
    const match = getExamCategoryDataList.value.find(
      (c: any) => String(c.name || '').trim().toLowerCase() === created
    )
    if (match) addExamModel.exam_category = match.id
  }
}

onMounted(() => {
  
  fetchExamCategoryData();

  setTimeout(() => {
    const el = document.querySelector('.multiExamCategory-select-options')

    if (el) {
      el.addEventListener('scroll', async () => {
        if (
          el.scrollTop + el.clientHeight >= el.scrollHeight - 10 &&
          !examCategoryLoading.value &&
          hasMoreExamCategory.value
        ) {
          await fetchExamCategoryData()
        }
      })
    }
  }, 500)

});

/*********** end exam cat ***************/

// ── Associate questions from OTHER exams (bundle) — unified into the SAME picker.
// sourceExamId null → list shows questions to include in THIS new exam (question_ids).
// sourceExamId set  → list shows that exam's questions (checked = associate).
const examOptions  = ref<any[]>([])
const sourceExamId = ref<number | null>(null)
const associatedQuestions = ref<any[]>([])   // associated question OBJECTS (live display)

const loadExamOptions = async () => {
  try {
    const res: any = await $api.post('/exams/list', { limit: 1000 })
    examOptions.value = res?.data?.data || []
  } catch { examOptions.value = [] }
}

// ── Per-month bundle offers ───────────────────────────────────────────────────
const bundleOffers = ref<any[]>([])   // [{ suggested_exam_id, name, months:[{plan, price, discount_type, discount_value}] }]
const fetchPricedMonths = async (examId: number) => {
  try {
    const res: any = await $api.get('/exams/priced-months/' + examId)
    return res?.data?.plans || []
  } catch { return [] }
}
const addBundleExam = () => { bundleOffers.value.push({ suggested_exam_id: null, name: '', months: [] }) }
const removeBundleExam = (idx: number) => { bundleOffers.value.splice(idx, 1) }
const onBundleExamSelect = async (group: any) => {
  group.months = []
  if (!group.suggested_exam_id) return
  const opt = examOptions.value.find((e: any) => Number(e.id) === Number(group.suggested_exam_id))
  group.name = opt?.name || ''
  const plans = await fetchPricedMonths(Number(group.suggested_exam_id))
  group.months = plans.map((p: any) => ({ plan: String(p.plan), price: p.price, discount_type: 'percent', discount_value: 0 }))
}
const bundleOffersPayload = () => {
  const out: any[] = []
  for (const g of bundleOffers.value) {
    if (!g.suggested_exam_id) continue
    for (const m of (g.months || [])) {
      const v = Math.max(0, Number(m.discount_value) || 0)
      if (v <= 0) continue
      out.push({
        suggested_exam_id: Number(g.suggested_exam_id),
        plan: String(m.plan),
        discount_type: m.discount_type === 'fixed' ? 'fixed' : 'percent',
        discount_value: v,
      })
    }
  }
  return out
}

const toggleAssociated = (q: any) => {
  const id = Number(q.id)
  const i = addExamModel.associated_with.indexOf(id)
  if (i >= 0) {
    addExamModel.associated_with.splice(i, 1)
    const j = associatedQuestions.value.findIndex((x: any) => Number(x.id) === id)
    if (j >= 0) associatedQuestions.value.splice(j, 1)
  } else {
    addExamModel.associated_with.push(id)
    associatedQuestions.value.push({ ...q, is_associated: true })
  }
}

// Bulk associate / clear ALL questions of the selected source exam (one click).
const bulkAssocLoading = ref(false)
const fetchSourceIds = async (): Promise<number[]> => {
  const res: any = await $api.post('/exams/assign-questions/0', {
    source_exam_id: sourceExamId.value, all_source_ids: 1,
  })
  return (res?.data?.all_ids || []).map((x: any) => Number(x))
}
const addAllFromSource = async () => {
  if (!sourceExamId.value) return
  bulkAssocLoading.value = true
  try {
    const ids = await fetchSourceIds()
    let added = 0
    for (const id of ids) {
      if (!addExamModel.associated_with.includes(id)) { addExamModel.associated_with.push(id); added++ }
    }
    $toast(`${added} question(s) added from this exam`)
  } catch { $toast('Could not add questions', 'error') }
  finally { bulkAssocLoading.value = false }
}
const clearAllFromSource = async () => {
  if (!sourceExamId.value) return
  bulkAssocLoading.value = true
  try {
    const ids = await fetchSourceIds()
    addExamModel.associated_with = addExamModel.associated_with.filter((x: number) => !ids.includes(x))
    associatedQuestions.value = associatedQuestions.value.filter((q: any) => !ids.includes(Number(q.id)))
    $toast('Removed this exam\'s questions')
  } catch { $toast('Could not clear', 'error') }
  finally { bulkAssocLoading.value = false }
}

watch(sourceExamId, () => { pageQcurrent.value = 1; fetchQuestionsData() })

onMounted(() => {
  fetchQuestionsData()
  loadExamOptions()
})


</script>

<template>
<Loading v-if="fullLoading" />
<div  v-if="modelValue"
class="overlay open"  id="examEditorOverlay"
    @click.self="closeModal">

    <div class="drawer" style="width:780px;max-width:97vw">
    
        <div class="drawer-header" style="padding-bottom:16px;border-bottom:1px solid var(--border)">
      
        <div>
        <div id="examEditorMode" style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:4px">New Exam</div>
        <div id="examEditorTitle" style="font-family:'Figtree',sans-serif;font-size:1.1rem;font-weight:600;color:var(--ink)">New Exam</div>
        </div>
      
        <div style="display:flex;gap:8px;align-items:center">
        <button class="btn btn-outline btn-sm" id="examDeployBtn" style="display:none" type="button">Publish</button>
        <button class="drawer-close"
        @click="closeModal"
          type="button">
        <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="13"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>
        </button>
        </div>
      </div>

      <div class="drawer-body" style="padding-top:16px">
                <!-- Editor tabs -->
                <div style="margin-bottom:-1px">
                    <button id="etab-details" class="tab-btn"
                      :class="{ active: activeTab === 'details' }"
                      @click="setTab('details')" 
                      type="button">
                      Details
                    </button>
                    <button id="etab-pricing" class="tab-btn" type="button"
                    :class="{ active: activeTab === 'pricing' }"
                      @click="setTab('pricing')">
                      Pricing
                    </button>
                    <button id="etab-questions" class="tab-btn"  type="button"
                      :class="{ active: activeTab === 'questions' }"
                      @click="setTab('questions')">
                      Questions
                    </button>
                    <button id="etab-seo" class="tab-btn"  type="button"
                    :class="{ active: activeTab === 'seo' }"
                    @click="setTab('seo')">
                      SEO
                    </button>
                    <button id="etab-page" class="tab-btn" type="button"
                    :class="{ active: activeTab === 'page' }"
                    @click="setTab('page')">
                      Page
                    </button>
                </div>

                <!-- Details tab -->
                <div class="tab-content"
                :class="{ active: activeTab === 'details' }"
                id="etab-content-details"
                >
                        <div class="form-row-2">
                          <div class="form-row" style="margin:0 0 12px">
                            <label class="form-label">Exam Name</label>
                            <input class="form-input" id="examName" 
                            placeholder="e.g. Internal Medicine Shelf Exam" type="text"
                            v-model="addExamModel.name"  
                            required />
                          </div>
                          <div class="form-row" style="margin:0 0 12px">
                          <label class="form-label">Type</label>
                          <select class="form-input form-select" id="examType"
                          v-model="addExamModel.type" >
                          <option value="shelf">Shelf Exam (NBME)</option>
                          <option value="board">Board Certification</option>
                          <option value="in-service-and-training">In-Service / Training</option>
                          <option value="custom">Custom</option>
                          </select>
                          </div>
                        </div>

                      <div class="form-row" style="margin:0 0 12px">
                      <div style="display:flex;align-items:center;justify-content:space-between">
                        <label class="form-label">Exam Category</label>
                        <button type="button"
                          style="background:none;border:none;padding:0;cursor:pointer;font-size:0.72rem;font-weight:700;color:var(--teal,#0891b2)"
                          @click="showAddCategory = true">+ New category</button>
                      </div>
                        <Multiselect
                        class="multiExamCategory-select-options exam-category-select"
                        placeholder="e.g. exam category"
                        v-model="addExamModel.exam_category"
                        :options="examCategoryOptions"
                        label="name"
                        valueProp="id"
                        :searchable="true"
                        :loading="examCategoryLoading"
                        />
                      </div>

                      <AddExamCategory v-model="showAddCategory" @saved="onCategoryCreated" />

                        <div class="form-row-2">
                          <div class="form-row" style="margin:0 0 12px">
                          <label class="form-label">URL Slug</label>
                          <div style="display:flex;align-items:center;gap:0">
                          <span style="background:var(--surface);border:1.5px solid var(--border);border-right:none;border-radius:var(--r-sm) 0 0 var(--r-sm);padding:9px 10px;font-size:0.78rem;color:var(--ink-dim);white-space:nowrap">
                            {{  baseUrl('exams') }}
                          </span>
                          <input class="form-input" id="examSlug" placeholder="shelf-im"
                          style="border-radius:0 var(--r-sm) var(--r-sm) 0;flex:1" type="text"
                          v-model="addExamModel.slug"
                          @input="slugTouched = true"
                            />
                          </div>
                          </div>

                          <div class="form-row" style="margin:0 0 12px">
                            <label class="form-label">Accent Colour</label>
                            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:4px" id="examThemeSwatches">
                            <button class="theme-swatch"
                            :class="{ active: addExamModel.accent_title === 'teal' }"
                            data-theme="teal" 
                            style="background:#06b6d4"
                            title="Teal"
                            type="button"
                            @click="setTheme('teal', '#06b6d4')"></button>

                            <button class="theme-swatch" 
                            :class="{ active: addExamModel.accent_title === 'amber' }"
                            data-theme="amber"
                            style="background:#d97706" title="Amber"
                            type="button"
                              @click="setTheme('amber', '#d97706')"></button>
                            
                            <div style="width:1px;height:24px;background:var(--border);margin:0 2px"></div>
<!-- 
                            <label title="Custom colour" style="position:relative;display:flex;align-items:center;cursor:pointer">
                            <div id="customSwatchPreview" 
                            class="theme-swatch" 
                            :class="{ active: addExamModel.accent_title === 'custom' }"
                            style="background:#cccccc;position:relative;overflow:hidden"
                            title="Custom"
                            >
                              <input id="examThemeCustom" 
                              type="color"
                            v-model="customColor"
                              style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;border:none;padding:0"
                              @input="setTheme('custom', customColor)" />
                            </div>
                            </label> -->

                            </div>

                            <div class="examThemeLbel">
                              {{addExamModel.accent_title }} — {{ addExamModel.accent_color }}
                            </div>
                            <input type="hidden"
                            v-model="addExamModel.accent_title"
                             />
                          </div>

                          
                          

                        </div>

                        <!-- Exam-type icon picker → stored on exams.icon, resolved to
                               an SVG on the public site. "Auto" (empty) falls back to the
                               category's default icon. -->
                        <div class="form-row" style="margin:0 0 12px">
                            <label class="form-label">Exam Icon</label>
                            <div style="font-size:12px;color:var(--muted,#667085);margin:0 0 6px">
                              Shown on the public exams list &amp; exam page. "Auto" uses the category's default icon.
                            </div>
                            <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
                              <button type="button" title="Auto (use category icon)"
                                @click="addExamModel.icon = ''"
                                :style="{ height:'40px',padding:'0 12px',display:'flex',alignItems:'center',borderRadius:'8px',cursor:'pointer',fontSize:'12px',fontWeight:'600',background:'var(--white,#fff)', border: !addExamModel.icon ? '2px solid #06b6d4' : '1px solid var(--border,#e5e7eb)' }">
                                Auto
                              </button>
                              <button v-for="opt in EXAM_ICON_OPTIONS" :key="opt.key" type="button" :title="opt.label"
                                @click="addExamModel.icon = opt.key"
                                :style="{ width:'40px',height:'40px',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'8px',cursor:'pointer',background:'var(--white,#fff)', border: addExamModel.icon === opt.key ? '2px solid #06b6d4' : '1px solid var(--border,#e5e7eb)' }">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink,#111)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="examIconPath(opt.key)"></svg>
                              </button>
                            </div>
                          </div>

                        <!-- External link-out card (International Board Registration).
                             When on, the public card opens external_url in a new tab
                             instead of the internal exam page; pricing/Stripe skipped. -->
                        <div class="form-row" style="margin:0 0 12px">
                          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                            <input type="checkbox" v-model="addExamModel.is_external" :true-value="1" :false-value="0" />
                            <span class="form-label" style="margin:0">External link-out card (opens another site)</span>
                          </label>
                          <div style="font-size:12px;color:var(--muted,#667085);margin:4px 0 6px">
                            For "International Board Registration" cards (e.g. PLAB → UK, MCCQE → CA, AMC → AU). The card links to the URL below in a new tab; pricing &amp; checkout are skipped.
                          </div>
                          <input v-if="addExamModel.is_external" class="form-input" type="url"
                            placeholder="https://passmed.uk/exam/plab-1"
                            v-model="addExamModel.external_url" />
                        </div>

                        <div class="form-row">
                          <label class="form-label">Short Description</label>
                          <textarea class="form-input" id="examDesc"
                          placeholder="Shown in hero section and exam listing cards..." rows="2"
                          style="resize:vertical"
                          v-model="addExamModel.short_description" ></textarea>
                        </div>

                        <!-- Free Trial -->
                        <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:var(--r-sm);padding:14px 16px;margin-bottom:4px">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
                          <div>
                          <div style="font-size:0.78rem;font-weight:700;color:var(--ink)">Free Trial</div>
                          <div style="font-size:0.72rem;color:var(--ink-dim);margin-top:2px">Allow unsubscribed users to access a limited preview</div>
                          </div>

                          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                            <span id="trialToggleLabel" style="font-size:0.75rem;color:var(--ink-dim)">
                                {{ isTrialEnabled ? 'On' : 'Off' }}
                            </span>

                            <div class="toggle-track toggletrackbtn" 
                            :class="isTrialEnabled?' active ':''"
                            id="trialToggle"
                            @click="toggleFreeTrial">
                              <div class="trialThumb"></div>
                            </div>

                          </label>
                        </div>

                          <div id="trialFields" v-if="isTrialEnabled">

                              <div class="form-row-2">
                                <div class="form-row" style="margin:0 0 12px">
                                <label class="form-label">Trial Duration</label>
                                  <div style="display:flex;align-items:center;gap:6px">
                                  <input class="form-input" id="trialDays" max="30" min="1" style="max-width:80px" 
                                  type="number" 
                                  v-model="addExamModel.free_trial_duration" />
                                  <span style="font-size:0.82rem;color:var(--ink-dim)">days</span>
                                  </div>
                                </div>

                                <div class="form-row" style="margin:0 0 12px">
                                  <label class="form-label">Questions Accessible</label>
                                  <div style="display:flex;align-items:center;gap:6px">
                                  <input class="form-input" id="trialQuestions" min="1" style="max-width:80px"
                                  type="number" 
                                  v-model="addExamModel.free_trial_questions_accessible" />
                                  <span style="font-size:0.82rem;color:var(--ink-dim)">questions</span>
                                  </div>
                                </div>
                              </div>

                              <div class="form-row" style="margin:0">
                                <label class="form-label">Trial Restriction Mode</label>
                                <select class="form-input form-select" id="trialMode" 
                                style="max-width:260px"
                                v-model="addExamModel.free_trial_restriction_mode">
                                <option value="questions">Question count limit only</option>
                                <option value="days">Days limit only</option>
                                <option value="both">Both (whichever hits first)</option>
                                </select>
                              </div>
                          </div>

                        </div>
                        
                </div>
                <!-- end Details tab -->

                <!-- Pricing tab -->
                <div class="tab-content" 
                :class="{ active: activeTab === 'pricing' }"
                id="etab-content-pricing"
                >
                <div style="font-size:0.82rem;color:var(--ink-dim);margin-bottom:16px">Set subscription prices for each plan duration. 12-month is shown as "Best Value" by default.</div>
                <div class="pricing-grid">
                <div class="price-input-wrap">
                <div class="price-input-label">1 Month</div>
                <div style="display:flex;align-items:center;gap:4px">
                <span style="font-size:1rem;font-weight:700;color:var(--ink-dim)">{{ localSymbol }}</span>
                <input class="price-input" id="price1m" placeholder="39" type="number"
                v-model="addExamModel.price_1">
                </div>
                </div>
                <div class="price-input-wrap">
                <div class="price-input-label">2 Months</div>
                <div style="display:flex;align-items:center;gap:4px">
                <span style="font-size:1rem;font-weight:700;color:var(--ink-dim)">{{ localSymbol }}</span>
                <input class="price-input" id="price2m" placeholder="0 = not offered" type="number"
                v-model="addExamModel.price_2">
                </div>
                </div>
                <div class="price-input-wrap">
                <div class="price-input-label">3 Months</div>
                <div style="display:flex;align-items:center;gap:4px">
                <span style="font-size:1rem;font-weight:700;color:var(--ink-dim)">{{ localSymbol }}</span>
                <input class="price-input" id="price3m" placeholder="59" type="number"
                 v-model="addExamModel.price_3">
                </div>
                </div>
                <div class="price-input-wrap">
                <div class="price-input-label">6 Months</div>
                <div style="display:flex;align-items:center;gap:4px">
                <span style="font-size:1rem;font-weight:700;color:var(--ink-dim)">{{ localSymbol }}</span>
                <input class="price-input" id="price6m" placeholder="75" type="number"
                 v-model="addExamModel.price_6">
                </div>
                </div>
                <div class="price-input-wrap" style="border-color:rgba(6,182,212,0.3)">
                <div class="price-input-label" style="color:var(--teal)">12 Months (Best Value)</div>
                <div style="display:flex;align-items:center;gap:4px">
                <span style="font-size:1rem;font-weight:700;color:var(--ink-dim)">{{ localSymbol }}</span>
                <input class="price-input" id="price12m" placeholder="89" type="number"
                 v-model="addExamModel.price_12">
                </div>
                </div>
                </div>
                <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:var(--r-sm);padding:12px 14px;font-size:0.8rem;color:var(--ink-dim);line-height:1.6">
                Savings percentages vs 1-month rate are calculated automatically and displayed on pricing cards. The 12-month plan is always marked as Best Value.
                </div>

                <!-- ── Bundle offers (per month) ─────────────────────────────────── -->
                <div style="margin-top:18px;border-top:1.5px solid var(--border);padding-top:14px">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                    <div>
                      <div style="font-size:0.9rem;font-weight:800;color:var(--ink)">Bundle offers</div>
                      <div style="font-size:0.76rem;color:var(--ink-dim)">Suggest other exams to buy together on this exam's checkout. Pick an exam, then set a discount for the months you want to offer.</div>
                    </div>
                    <button type="button" class="btn btn-primary btn-sm" style="font-size:0.74rem" @click="addBundleExam">+ Add exam</button>
                  </div>

                  <div v-if="bundleOffers.length === 0" style="font-size:0.78rem;color:var(--ink-dim);padding:8px 0">No bundle offers yet.</div>

                  <div v-for="(grp, gi) in bundleOffers" :key="'bo-'+gi" style="border:1.5px solid var(--border);border-radius:var(--r-sm);padding:10px 12px;margin-bottom:10px">
                    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
                      <select class="filter-input form-select" style="font-size:0.8rem;padding:6px 10px;min-width:240px" v-model="grp.suggested_exam_id" @change="onBundleExamSelect(grp)">
                        <option :value="null">Select exam…</option>
                        <option v-for="ex in examOptions" :key="'boex-'+ex.id" :value="Number(ex.id)">{{ ex.name }}</option>
                      </select>
                      <button type="button" class="btn btn-outline btn-sm" style="font-size:0.72rem;padding:6px 10px" @click="removeBundleExam(gi)">Remove exam</button>
                    </div>

                    <div v-if="grp.suggested_exam_id && grp.months.length === 0" style="font-size:0.75rem;color:var(--ink-dim)">This exam has no priced months.</div>

                    <div v-for="(m, mi) in grp.months" :key="'m-'+mi" style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
                      <span style="width:78px;font-size:0.78rem;font-weight:700;color:var(--ink)">{{ m.plan }} month</span>
                      <span style="width:90px;font-size:0.76rem;color:var(--ink-dim)">{{ localSymbol }}{{ m.price }}</span>
                      <select class="filter-input form-select" style="font-size:0.76rem;padding:5px 8px" v-model="m.discount_type">
                        <option value="percent">% off</option>
                        <option value="fixed">Fixed off</option>
                      </select>
                      <input class="filter-input" type="number" min="0" style="font-size:0.76rem;padding:5px 8px;width:100px" :placeholder="m.discount_type==='fixed' ? 'Amount' : 'Percent'" v-model.number="m.discount_value" />
                      <span style="font-size:0.74rem;color:var(--ink-dim)">{{ m.discount_type==='fixed' ? localSymbol : '%' }}</span>
                    </div>
                    <div v-if="grp.suggested_exam_id" style="font-size:0.72rem;color:var(--ink-dim);margin-top:4px">Only months with a discount &gt; 0 are offered on checkout.</div>
                  </div>
                </div>
                </div>
                <!-- Questions tab -->
                <div  class="tab-content"
                :class="{ active: activeTab === 'questions' }"
                id="etab-content-questions"
                >
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
                

                <div style="display:flex;gap:8px;align-items:center">
                  <input class="filter-input" placeholder="Filter questions..."
                  style="font-size:0.78rem;padding:5px 10px" type="text"
                  v-model="filterquestions"
                  />
                  <select class="filter-input form-select" style="font-size:0.78rem;padding:5px 10px" v-model="sourceExamId">
                    <option :value="null">This exam's questions</option>
                    <option v-for="ex in examOptions" :key="ex.id" :value="Number(ex.id)">{{ ex.name }} ({{ ex.total_question ?? 0 }})</option>
                  </select>
                  <button v-if="sourceExamId" type="button" class="btn btn-primary btn-sm" style="font-size:0.72rem;padding:5px 9px;white-space:nowrap"
                    :disabled="bulkAssocLoading" @click="addAllFromSource">
                    {{ bulkAssocLoading ? 'Adding…' : 'Add all from this exam' }}
                  </button>
                  <button v-if="sourceExamId" type="button" class="btn btn-outline btn-sm" style="font-size:0.72rem;padding:5px 9px;white-space:nowrap"
                    :disabled="bulkAssocLoading" @click="clearAllFromSource">
                    Clear this exam
                  </button>
                </div>

                </div>

                <div style="max-height:320px;overflow-y:auto;padding-right:4px">

                  <!-- Associated (referenced from other exams) — top of the same list -->
                  <template v-if="!sourceExamId">
                    <div v-for="(aq, aky) in associatedQuestions" :key="`aq-${aq?.id}`" class="q-assign-row assigned">
                      <span>A{{ aky+1 }}</span>
                      <input class="q-assign-check" type="checkbox"
                        :checked="addExamModel.associated_with.includes(Number(aq.id))"
                        @change="toggleAssociated(aq)" />
                      <div class="q-assign-text" v-html="safeHtmlContent(aq.question_stem)"></div>
                      <div class="q-assign-meta">
                        <span class="badge badge-teal" style="font-size:0.63rem">Associated: {{ aq.exam_name }}</span>
                        <span v-if="aq.cat_name" class="badge badge-gray" style="font-size:0.63rem">{{ aq.cat_name }}</span>
                      </div>
                    </div>
                  </template>

                  <div v-if="dataQuestionsloading || getQuestionsDataList.length === 0">
                      <Empty v-if="!dataQuestionsloading && getQuestionsDataList.length === 0" />
                      <Loader_small v-else />
                    </div>

                <div v-else
                  v-for="itm in getQuestionsDataList" 
                  :key="`q-${itm?.id}`"
                  class="q-assign-row assigned" 
                  >
                  <input class="q-assign-check" type="checkbox"
                    :checked="(sourceExamId || itm.is_associated) ? addExamModel.associated_with.includes(Number(itm.id)) : addExamModel.question_ids.includes(itm.id)"
                    @change="(sourceExamId || itm.is_associated) ? toggleAssociated(itm) : addQuestion(itm.id)"
                    />
                    <div class="q-assign-text" v-html="safeHtmlContent(itm.question_stem)">
                    </div>
                      <div class="q-assign-meta">
                      <span v-if="itm.is_associated" class="badge badge-teal" style="font-size:0.63rem">
                      Associated: {{ itm.exam_name }}
                      </span>
                      <span class="badge"
                      :class="itm.status == '1' ? 'badge-green' : 'badge-amber'">
                    {{ itm.status == '1' ? 'Published' : 'Flagged' }}
                      </span>
                      <span v-if="itm.cat_name"
                      class="badge badge-gray" style="font-size:0.63rem">
                        {{ itm.cat_name??"-" }}
                      </span>
                      </div>
                  </div>
              
                </div>

                  <div style="margin-top:10px;font-size:0.78rem;color:var(--ink-dim)">
                    <template v-if="sourceExamId">
                      {{ addExamModel.associated_with.length }} question(s) associated from other exams.
                    </template>
                    <template v-else>
                      {{ addExamModel.question_ids.length }} of {{ getQuestionsDataList.length }} questions assigned.
                      <button class="card-action" type="button" @click="onClickSelectAllQuestion">Select all</button>
                    </template>
                  </div>
                </div>

                <!-- SEO tab -->
                <div  class="tab-content"
                :class="{ active: activeTab === 'seo' }"
                  id="etab-content-seo"
                  >
                <div class="form-row">
                    <label class="form-label">
                      Page Title 
                      <span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:0.72rem;color:var(--ink-dim)">
                        (shown in browser tab &amp; Google)
                      </span>
                    </label>
                    <input class="form-input" 
                    placeholder="e.g. Internal Medicine Shelf Exam Questions | Passmed US"
                     type="text" 
                    v-model="addExamModel.seo_title"
                    />

                    <div class="seoTitleCount"
                    :class="getSeoClass(titleCharCount, 60)"
                      >
                       {{ titleCharCount }} / 60 characters
                    </div>
                </div>
                <div class="form-row">
                    <label class="form-label">Keywords</label>
                    <input class="form-input" 
                    placeholder="internal medicine shelf, NBME shelf exam, IM clerkship questions..." 
                    type="text"
                    v-model="addExamModel.seo_keywords"/>
                </div>

                <div class="form-row">
                    <label class="form-label">Meta Description</label>
                    <textarea 
                    class="form-input seoDesc" 
                    placeholder="Practice IM Shelf Exam questions with detailed explanations..." 
                    rows="2" style="resize:vertical"
                    v-model="addExamModel.seo_description"
                    ></textarea>
                    <div class="seoDescCount"
                    :class="getSeoClass(descCharCount, 155)"
                    >
                      {{ descCharCount }} / 155 characters
                    </div>
                </div>
                
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

                <!-- Page tab -->
                <div class="tab-content" 
                :class="{ active: activeTab === 'page' }"
                id="etab-content-page"
                >
              <div class="form-row">

                  <div style="font-size:0.82rem;color:var(--ink-dim);margin-bottom:16px">
                    Upload a Markdown file to auto-generate the exam page HTML. This will overwrite the current page content on next deploy.
                  </div>

                      <div class="drop-zone" id="mdDropZone" style="margin-bottom:16px"
                      :class="{ 'drag-over': dragOver }"
                      @click="triggerMdImport"
                      @dragover.prevent="dragOver = true"
                      @dragleave.prevent="dragOver = false"
                      @drop.prevent="onDropMd">
                      <div class="drop-zone-icon" style="background:rgba(217,119,6,0.08);color:var(--amber)">
                        <svg fill="none" height="20" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" 
                        viewBox="0 0 24 24" width="20">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" x2="8" y1="13" y2="13"></line>
                        <line x1="16" x2="8" y1="17" y2="17"></line>
                        </svg>
                      </div>
                        <div style="font-size:0.9rem;font-weight:700;color:var(--ink);margin-bottom:4px">
                          Drop your .md file here
                        </div>
                        <div style="font-size:0.78rem;color:var(--ink-dim)">
                          or click to browse — Markdown files only, max 5MB
                        </div>
                          <input ref="mdFileInput" accept=".md,.markdown"
                          style="display:none" type="file"
                          @change="onImportMd">
                  </div>

                  <div style="display:flex;gap:8px">
                        <button id="mdUploadBtn" style="flex:1" class="btn btn-amber"
                        :disabled="!mdRawContent"
                        @click="confirmMdUpload"
                        type="button">
                        Generate Page HTML
                        </button>
                      <button class="btn btn-outline" 
                      type="button"
                       @click="exportMd">
                      Export Current as MD
                    </button>
                  </div>

                </div>
              
              <div class="form-row-2">
                      <div class="form-row">
                            <label class="form-label">
                              Blue Hairline Text
                            </label>                          
                            <input class="form-input" id="content_bluehairline" 
                            placeholder="" type="text"
                            v-model="addExamModel.content_bluehairline"  
                            required />
                      </div>
                      <div class="form-row">
                            <label class="form-label">
                             Grey Hairline Text
                            </label>
                            <input class="form-input" id="content_greyhairline" 
                            placeholder="" type="text"
                            v-model="addExamModel.content_greyhairline"  
                            required />
                      </div>
                    </div>

                <div class="form-row examAppEditr">
                  <label class="form-label">Hero Tags</label>
                  <textarea class="form-input" rows="3" 
                  style="resize:vertical"
                  v-model="addExamModel.content_hero_tags"
                  ></textarea>
                </div>
                
                  <div class="form-row examAppEditr">
                    <label class="form-label">Content</label>
                    <!-- <AppEditor v-model="addExamModel.content"/> -->
                     <textarea class="form-input" rows="3" 
                  style="resize:vertical"
                  v-model="addExamModel.content"
                  ></textarea>
                  </div>

                   <div class="form-row-2">
                      <div class="form-row">
                            <label class="form-label">
                              Sidebar Question Bank Section
                            </label>
                            <textarea class="form-input content_question_bank" rows="3" 
                            style="resize:vertical"
                            v-model="addExamModel.content_question_bank"
                            ></textarea>
                      </div>
                      <div class="form-row">
                            <label class="form-label">
                            Sidebar At a Glance Section

                            </label>
                            <textarea class="form-input content_glance" rows="3" 
                            style="resize:vertical"
                            v-model="addExamModel.content_glance"
                            ></textarea>
                      </div>
                    </div>

                    <div class="form-row examAppEditr">
                      <div class="form-row">
                            <label class="form-label">
                              Sidebar Included features
                            </label>
                            <textarea class="form-input content_features" rows="3" 
                            style="resize:vertical"
                            v-model="addExamModel.content_features"
                            ></textarea>
                      </div>
                    </div>
                    <div class="form-row-2">
                      <div class="form-row">
                            <label class="form-label">
                            1 Month Checklist
                            </label>
                            <textarea class="form-input" rows="3"
                            style="resize:vertical"
                            v-model="addExamModel.content_1"
                            ></textarea>
                      </div>
                      <div class="form-row">
                            <label class="form-label">
                            2 Months Checklist
                            </label>
                            <textarea class="form-input content_2" rows="3"
                            style="resize:vertical"
                            v-model="addExamModel.content_2"
                            ></textarea>
                      </div>
                    </div>
                    <div class="form-row-2">
                      <div class="form-row">
                            <label class="form-label">
                             3 Months  Checklist
                            </label>
                            <textarea class="form-input content_3" rows="3"
                            style="resize:vertical"
                            v-model="addExamModel.content_3"
                            ></textarea>
                      </div>
                    </div>

                    <div class="form-row-2">
                      <div class="form-row">
                            <label class="form-label">
                              6 Months Checklist
                            </label>
                            <textarea class="form-input" rows="3" 
                            style="resize:vertical"
                            v-model="addExamModel.content_6"
                            ></textarea>
                      </div>

                      <div class="form-row">
                            <label class="form-label">
                              12 Months Checklist
                            </label>
                            <textarea class="form-input content_12" rows="3" 
                            style="resize:vertical"
                            v-model="addExamModel.content_12"
                            ></textarea>
                      </div>
                    </div>

                </div>

              <div style="display:flex;gap:8px;padding-top:4px">
                <button class="btn btn-primary btn-sm" id="examPublishBtn" 
                type="button"
                 @click="submitSaveExam(1)">
                  Publish
                </button>
                <button class="btn btn-outline btn-sm" type="button"
                @click="submitSaveExam(0)">
                Save Draft
                </button>
                <button class="btn btn-danger btn-sm" type="button"
                @click="submitSaveExam(2)" >Archive</button>
              </div>
      </div>
  <!---------end body --------->
    </div>
</div>
</template>
<style>
.seo-normal {
  color: var(--ink-dim);
}

.seo-amber {
  color: #f59e0b;
}

.seo-red {
  color: #ef4444;
  font-weight: bold;
}
</style>