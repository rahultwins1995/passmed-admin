<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import { ref,reactive, onMounted, watch, computed } from 'vue'
import Loading from '@/components/loaders/Loading.vue'
import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'
import EditQuestionModal from '@/components/questions/EditQuestionModal.vue';
import AddExamCategory from '@/components/exams/AddExamCategory.vue'
import Pagination from '@/components/Pagination.vue'

const props = defineProps({
  modelValue: Boolean,
  details: Object
})

const emit = defineEmits(["update:modelValue",'saved'])

const { $api, $toast,$confirm } = useNuxtApp()
// Market currency symbol (₱ / A$ / C$ / R / £ / $) for the price inputs.
const { localSymbol } = useDisplayCurrency()

const examDetail = ref<any>(null)
const data_loading = ref(false)
const getQuestionsDataList = ref<any[]>([])
const dataQuestionsloading= ref<boolean>(false);
const activeTab = ref('details');
const isTrialEnabled = ref(false)


const closeModal = () => {
  emit("update:modelValue", false)
}

const fetchData = async () => {
  
  if (!props.details?.id) return
  data_loading.value = true

  try {
    const res:any = await $api.get("/exams/details/" + props.details.id)
    const obj:any = res.data
    if (obj.status === 'success') {
     const detail = obj.data;
            examDetail.value = detail;
            // SAVE truth — seed the associated ids straight from the exam's OWN db
            // value. This is what Save persists, so a slow/empty display fetch can
            // never wipe existing associations. (Display objects load separately.)
            associatedIds.value = Array.isArray(detail?.associated_with)
              ? detail.associated_with.map((x: any) => Number(x)) : []
            addExamModel.name=detail?.name??'';
            addExamModel.type=detail?.type??'single';
            addExamModel.exam_category=detail?.exam_category??'0';
            addExamModel.slug=detail.slug;
            // Remember whether this exam already had a public URL, so the name
            // watcher knows not to rewrite it. Reset on every load — the modal is
            // reused for different exams.
            hadSlugOnLoad.value = !!detail.slug;
            slugTouched.value   = false;
            addExamModel.accent_color=detail?.accent_color??'#06b6d4';
            addExamModel.accent_title=detail?.accent_title??'teal';
            addExamModel.icon=detail?.icon??''; // restore picked icon on edit
            addExamModel.is_external = Number(detail?.is_external ?? 0) ? 1 : 0;
            addExamModel.external_url = detail?.external_url ?? '';
            customColor.value = detail?.accent_color ?? '#06b6d4';
            addExamModel.short_description=detail?.short_description??'';
            addExamModel.format=detail.format??'';
            addExamModel.administered_by=detail?.administered_by??'';
            addExamModel.free_trial=detail?.free_trial??1;
            addExamModel.free_trial_duration=detail?.free_trial_duration??'';
            addExamModel.free_trial_questions_accessible=detail?.free_trial_questions_accessible??'';
            addExamModel.free_trial_restriction_mode=detail?.free_trial_restriction_mode??'';
            addExamModel.status=detail?.status??1;
            addExamModel.seo_title=detail?.seo_title??'';
            addExamModel.seo_description=detail.seo_description??'';
            addExamModel.seo_keywords=detail?.seo_keywords??'';
            addExamModel.price_1=detail?.exam_pricing?.price_1??'0';
            addExamModel.price_2=detail?.exam_pricing?.price_2??'0';
            addExamModel.price_3=detail?.exam_pricing?.price_3??'0';
            addExamModel.price_6=detail?.exam_pricing?.price_6??'0';
            addExamModel.price_12=detail?.exam_pricing?.price_12??'0';

            // Load saved per-month bundle offers (async — fetches each exam's months).
            loadBundleOffersFromDetail(detail?.bundle_offers || [])

            addExamModel.content=detail?.content??'';
            addExamModel.content_1=detail?.content_1??"";
            addExamModel.content_2=detail?.content_2??"";
            addExamModel.content_3=detail?.content_3??"";
            addExamModel.content_6=detail?.content_6??"";
            addExamModel.content_12=detail?.content_12??"";


            addExamModel.content_bluehairline=detail?.content_bluehairline??"";
            addExamModel.content_greyhairline=detail?.content_greyhairline??"";
            addExamModel.content_hero_tags=detail?.content_hero_tags??"";
            addExamModel.content_question_bank=detail?.content_question_bank??"";
            addExamModel.content_glance=detail?.content_glance??"";
            addExamModel.content_features=detail?.content_features??"";



    } else {
      examDetail.value = null
    }

  } catch (err) {
    examDetail.value = null
  } finally {
    data_loading.value = false
  }
}

const setTab = (tab:string) => {
  activeTab.value = tab
}

const selectedQuestionIds = ref<number[]>([])

// ── Associate questions from OTHER exams (bundle) — unified into the SAME picker.
// sourceExamId null → the list shows THIS exam's own questions (exam_marks).
// sourceExamId set  → the list shows that exam's questions (checked = associate).
const examOptions           = ref<any[]>([])
const sourceExamId          = ref<number | null>(null)
const associatedQuestions   = ref<any[]>([])       // associated question OBJECTS (display only)
// SAVE source of truth — the associated (referenced) question ids. Seeded from the
// exam's OWN db value (detail.associated_with) in fetchData, so a failed/empty/late
// display fetch can NEVER wipe existing associations when the admin hits Save.
const associatedIds         = ref<number[]>([])
const associatedQuestionIds = associatedIds        // alias: template checks + save read this

const loadExamOptions = async () => {
  try {
    const res: any = await $api.post('/exams/list', { limit: 1000 })
    const all = res?.data?.data || []
    examOptions.value = all.filter((e: any) => Number(e.id) !== Number(props.details?.id))
  } catch { examOptions.value = [] }
}

// ── Per-month bundle offers ───────────────────────────────────────────────────
// Each group = one suggested exam + a discount row per month that exam prices.
const bundleOffers = ref<any[]>([])   // [{ suggested_exam_id, name, months:[{plan, price, discount_type, discount_value}] }]

const fetchPricedMonths = async (examId: number) => {
  try {
    const res: any = await $api.get('/exams/priced-months/' + examId)
    return res?.data?.plans || []
  } catch { return [] }
}
const addBundleExam = () => {
  bundleOffers.value.push({ suggested_exam_id: null, name: '', months: [] })
}
const removeBundleExam = (idx: number) => { bundleOffers.value.splice(idx, 1) }

// When an exam is picked in a group, load its priced months as discount rows.
const onBundleExamSelect = async (group: any) => {
  group.months = []
  if (!group.suggested_exam_id) return
  const opt = examOptions.value.find((e: any) => Number(e.id) === Number(group.suggested_exam_id))
  group.name = opt?.name || ''
  const plans = await fetchPricedMonths(Number(group.suggested_exam_id))
  group.months = plans.map((p: any) => ({ plan: String(p.plan), price: p.price, discount_type: 'percent', discount_value: 0 }))
}

// Rebuild groups from saved flat offers (edit load): group by exam, fetch months, prefill.
const loadBundleOffersFromDetail = async (flat: any[]) => {
  bundleOffers.value = []
  if (!Array.isArray(flat) || !flat.length) return
  const byExam: any = {}
  for (const r of flat) {
    const id = Number(r.suggested_exam_id)
    if (!byExam[id]) byExam[id] = { suggested_exam_id: id, name: r.name || '', saved: {} }
    byExam[id].saved[String(r.plan)] = { discount_type: r.discount_type || 'percent', discount_value: Number(r.discount_value) || 0 }
  }
  const groups: any[] = []
  for (const id of Object.keys(byExam)) {
    const g = byExam[id]
    const plans = await fetchPricedMonths(Number(id))
    const months = plans.map((p: any) => {
      const s = g.saved[String(p.plan)]
      return { plan: String(p.plan), price: p.price, discount_type: s?.discount_type || 'percent', discount_value: s?.discount_value || 0 }
    })
    groups.push({ suggested_exam_id: Number(id), name: g.name, months })
  }
  bundleOffers.value = groups
}

// Flatten for save — only months that actually carry a discount value.
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

// Own question (exam_marks) toggle — used when viewing THIS exam's own questions.
const toggleOwn = (qid: number) => {
  const id = Number(qid)
  const i = selectedQuestionIds.value.indexOf(id)
  if (i >= 0) selectedQuestionIds.value.splice(i, 1)
  else selectedQuestionIds.value.push(id)
}

// Associated question (associated_with) toggle — used when viewing ANOTHER exam.
const toggleAssociated = (q: any) => {
  const id = Number(q.id)
  const idx = associatedIds.value.indexOf(id)
  if (idx >= 0) {
    // remove — from the SAVE id-list AND the display list
    associatedIds.value.splice(idx, 1)
    const oi = associatedQuestions.value.findIndex((x: any) => Number(x.id) === id)
    if (oi >= 0) associatedQuestions.value.splice(oi, 1)
  } else {
    // add — to the SAVE id-list AND the display list
    associatedIds.value.push(id)
    if (!associatedQuestions.value.some((x: any) => Number(x.id) === id)) {
      associatedQuestions.value.push({ ...q, is_associated: true })
    }
  }
}

const infinitExamModel ={
  name:"",
  type:"",
  exam_category:"0",
  slug:"",
  accent_color:"#06b6d4",
  accent_title:"teal",
  icon:"", // exam-type icon key (picker); empty → frontend falls back to category icon
  is_external:0,     // external link-out card (International Board Registration)
  external_url:"",   // absolute URL the card opens (new tab) when is_external = 1
  short_description:"",
  format:"",
  administered_by:"",
  free_trial:1,
  free_trial_duration:"",
  free_trial_questions_accessible:"",
  free_trial_restriction_mode:"",
  status:1,
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
// Reset form
const resetForm = () => {
  Object.assign(addExamModel,infinitExamModel);
};

// ── Import from .md ──────────────────────────────────────────────────────────
// Populate page-content fields from a markdown file. Each section starts with an
// H1 heading ("# Heading"); the heading (case-insensitive) maps to a field below.
const mdFileInput = ref<HTMLInputElement | null>(null)

// Same format/headings as the New-Exam (AddExam) importer, so one .md works in both.
const mdHeadingMap: Record<string, string> = {
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
}

const parseMarkdownSections = (text: string): Record<string, string> => {
  const out: Record<string, string> = {}
  let current: string | null = null
  let buf: string[] = []
  const flush = () => { if (current !== null) out[current] = buf.join('\n').trim() }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^##\s+(.+?)\s*$/) // H2 headings (## Heading)
    if (m) { flush(); current = m[1].trim().toLowerCase(); buf = [] }
    else if (current !== null) { buf.push(line) }
  }
  flush()
  return out
}

const onImportMd = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const sections = parseMarkdownSections(text)
    let matched = 0  // headings that matched the map (even if empty)
    let applied = 0  // non-empty sections actually written
    for (const [heading, field] of Object.entries(mdHeadingMap)) {
      const val = sections[heading]
      if (val === undefined) continue
      matched++
      // only overwrite when the section has content — empty sections (e.g. from an
      // exported blank exam) must NOT wipe existing field values
      if (val !== '') { addExamModel[field] = val; applied++ }
    }
    if (matched === 0) $toast('No matching sections found in the file.', 'error')
    else if (applied === 0) $toast('File recognised, but all sections were empty — nothing imported.')
    else {
      // Upload feedback — remember the filename + how many sections landed, so the
      // UI can show a success state instead of a bare "Import from .md" button.
      mdFileName.value = file.name
      mdImportedCount.value = applied
      $toast(`Imported ${applied} section(s) from markdown. Review and Save.`)
    }
  } catch {
    $toast('Could not read the markdown file.', 'error')
  } finally {
    input.value = '' // allow re-selecting the same file
  }
}

// ── .md template + download-current ──────────────────────────────────────────
// Uploaded-file feedback state.
const mdFileName = ref<string>('')
const mdImportedCount = ref<number>(0)

// [heading, field, sample] — canonical section order. `sample` is the placeholder
// used for the TEMPLATE (and as a fallback when exporting an empty field).
const MD_SECTIONS: [string, string, string][] = [
  ['Blue Hairline',  'content_bluehairline',  'Trusted by 10,000+ students'],
  ['Grey Hairline',  'content_greyhairline',  'Updated for 2026'],
  ['Hero Tags',      'content_hero_tags',     'USMLE, Step 2 CK, NBME'],
  ['Middle Content', 'content',               '<p>Main exam page content. HTML is supported.</p>'],
  ['Question Bank',  'content_question_bank', '<p>Describe the question bank for this exam.</p>'],
  ['At a Glance',    'content_glance',        '<ul><li>3500+ questions</li><li>Detailed explanations</li></ul>'],
  ['Features',       'content_features',      '<p>List the key features of this exam.</p>'],
  ['1 Month',        'content_1',             '<p>What the 1-month plan includes.</p>'],
  ['2 Months',       'content_2',             '<p>What the 2-month plan includes.</p>'],
  ['3 Months',       'content_3',             '<p>What the 3-month plan includes.</p>'],
  ['6 Months',       'content_6',             '<p>What the 6-month plan includes.</p>'],
  ['12 Months',      'content_12',            '<p>What the 12-month plan includes.</p>'],
]

const downloadMd = (filename: string, useCurrent: boolean) => {
  const md = MD_SECTIONS
    .map(([h, f, sample]) => `## ${h}\n${(useCurrent && addExamModel[f]) ? addExamModel[f] : sample}`)
    .join('\n\n')
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Blank structure (samples only) so admins learn the heading format.
const downloadMdTemplate = () => downloadMd('exam-page-template.md', false)
// Current exam's page content → edit offline and re-upload.
const downloadCurrentMd = () => downloadMd((addExamModel.slug || 'exam-page') + '.md', true)


const toggleFreeTrial = () => {
  isTrialEnabled.value = !isTrialEnabled.value
}

const setTheme = (name:string, color:string) => {
  addExamModel.accent_title = name
  addExamModel.accent_color = color
}

// Free custom colour (Custom type). Kept in sync with the saved accent on load.
const customColor = ref<string>('#06b6d4')

// Auto-apply the accent from the exam type: Board / In-service → teal,
// Shelf → amber, Custom → free colour picker. Only fires on a USER type change
// (@change), so it never clobbers a saved colour on initial load. Preset swatches
// stay clickable, so a manual override is still allowed afterwards.
const TYPE_THEME: Record<string, [string, string]> = {
  'board': ['teal', '#06b6d4'],
  'in-service-and-training': ['teal', '#06b6d4'],
  'shelf': ['amber', '#d97706'],
}
const onTypeChange = () => {
  const t = addExamModel.type
  if (t === 'custom') {
    setTheme('custom', customColor.value || addExamModel.accent_color || '#06b6d4')
  } else if (TYPE_THEME[t]) {
    setTheme(TYPE_THEME[t][0], TYPE_THEME[t][1])
  }
}

const fullLoading=ref<boolean>(false);
const submitEditExam = async (updateStatus:number=1) => {
    addExamModel.status=updateStatus;

  if (!props.details?.id) return

  if (!addExamModel.name) {
    $toast('name required','error');
    return;
  }

   if(!addExamModel.slug){
      addExamModel.slug = addExamModel.name
      .toLowerCase().replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '');
    }

  fullLoading.value = true

  try {
        const payload = {
        ...addExamModel,
        question_ids: selectedQuestionIds.value,
        associated_with: associatedQuestionIds.value,
        bundle_offers: bundleOffersPayload(),
        }
      const res:any = await $api.post("/exams/update/"+props.details.id, payload)
    if (res?.data?.status === "success") {
       fullLoading.value=false;
        closeModal();
        resetForm();
       emit('saved', true)
       $toast(res?.data?.msg || 'Saved changes is done')
    
      }else{
          $toast('Failed to update request', 'error')
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
   if (selectedQuestionIds.value.length === getQuestionsDataList.value.length) {
    selectedQuestionIds.value = []
  } else {
   selectedQuestionIds.value = getQuestionsDataList.value.map(item => item.id)
  }

}

// Bulk-DELETE the checked questions from the DATABASE (hard delete via
// /questions/bulkDelete) — NOT an un-assign. Careful confirm required.
const deletingQuestions = ref(false)
const onClickDeleteSelected = async () => {
  const ids = selectedQuestionIds.value.slice()
  if (ids.length === 0) {
    $toast('No questions selected.', 'error')
    return
  }

  const ok = await $confirm(
    `This will PERMANENTLY DELETE ${ids.length} question${ids.length === 1 ? '' : 's'} from the database — `
    + `including their options and their links to every exam. This is NOT an un-assign, `
    + `and deleted questions cannot be recovered. Continue?`,
    { lable: 'Delete questions permanently', confirmText: 'Delete permanently', cancelText: 'Cancel' }
  )
  if (!ok) return

  deletingQuestions.value = true
  try {
    const res: any = await $api.post('/questions/bulkDelete', { ids })
    if (res?.data?.status === 'success') {
      $toast(res?.data?.msg || 'Questions deleted.')
      selectedQuestionIds.value = []
      isInitialLoad.value = true       // re-sync the assigned set from fresh data
      await fetchQuestionsData()
      emit('saved', true)              // refresh parent list / counts
    } else {
      $toast(res?.data?.msg || 'Failed to delete questions', 'error')
    }
  } catch (err: any) {
    $toast(err?.response?.data?.msg || err?.response?.data?.message || 'Failed to delete questions', 'error')
  } finally {
    deletingQuestions.value = false
  }
}

const isInitialLoad = ref(true)

/*********Q start **********/
const pageWatchCurnt = ref(1);
const pageQcurrent = ref(1);
const totalQdata = ref(1);
const totalQPages = ref(1);
const limitQdata = ref(50);
const fetchQuestionsData = async () => {
 if (!props.details?.id) return
  dataQuestionsloading.value = true
  const params:any={
    search:filterquestions.value,
    page: pageQcurrent.value,
    limit: limitQdata.value
  };
  if (sourceExamId.value) params.source_exam_id = sourceExamId.value

  try {
     const res:any = await $api.post("/exams/assign-questions/"+props.details.id,params);
      const obj:any = res.data||{};
    if (obj?.status === 'success') {
        // OWN questions only — associated are rendered as a SEPARATE block at the
        // top of the same list (kept OUT of this array so Select all / Delete /
        // count only ever act on this exam's own questions).
        getQuestionsDataList.value = obj.data || [];

        // Seed the ASSOCIATED set once from the saved backend list (default view only).
        if (!sourceExamId.value && isInitialLoad.value) {
          associatedQuestions.value = obj.associated || []
        }
        pageWatchCurnt.value = obj.current_page
        // Displayed total = own questions + associated (referenced) on the default
        // view, so the exam's effective question count shows (e.g. 3340 + 7 = 3347).
        // Page count stays based on OWN only (associated render as a fixed block).
        totalQdata.value = obj.total + (!sourceExamId.value ? associatedIds.value.length : 0)
        totalQPages.value = Math.ceil(obj.total / obj.limit)

        if (!examOptions.value.length) loadExamOptions()

        // Seed own-checked (exam_marks) ONCE — from THIS exam's OWN questions only
        // (obj.data), so prepended associated rows (no exam_marks) aren't included.
        if (!sourceExamId.value && isInitialLoad.value) {
          selectedQuestionIds.value = (obj.data || [])
            .filter((q: any) => Number(q.exam_marks) === 1)
            .map((q: any) => Number(q.id))
          isInitialLoad.value = false
        }

    } else {
      getQuestionsDataList.value = []
      selectedQuestionIds.value = []
      totalQdata.value = 0
    }

  } catch (err) {
    getQuestionsDataList.value = []
    selectedQuestionIds.value = []
    totalQdata.value = 0
  } finally {
    dataQuestionsloading.value = false
  }
}

// Switching the source-exam dropdown reloads the picker (own vs that exam's Qs).
watch(sourceExamId, () => { pageQcurrent.value = 1; fetchQuestionsData() })

// Default-view row order: this exam's CHECKED (assigned, exam_marks=1) questions
// first, then the ASSOCIATED (referenced) block, then the remaining unchecked pool.
// Source-pull view = plain list. Grouping uses exam_marks (saved) so ticking a box
// doesn't make the row jump. Associated block shows once, on page 1, right after
// the checked group. Backend already orders own checked-first so they cluster early.
const displayRows = computed(() => {
  const list = getQuestionsDataList.value || []
  if (sourceExamId.value) return list.map((q: any) => ({ q }))
  const checked   = list.filter((q: any) => Number(q.exam_marks) === 1)
  const unchecked = list.filter((q: any) => Number(q.exam_marks) !== 1)
  const rows: any[] = checked.map((q: any) => ({ q }))
  if (Number(pageWatchCurnt.value) === 1) rows.push({ assoc: true })
  unchecked.forEach((q: any) => rows.push({ q }))
  return rows
})

watch(pageWatchCurnt, (newPage) => {
  pageQcurrent.value = newPage
  fetchQuestionsData()
})

/**********Q end**************/

watch(limitQdata,async (val) => {
  pageQcurrent.value =1;
  await fetchQuestionsData()
})

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


const qstnId=ref<any>(0);
const showEditQModal=ref<boolean>(false);
const activeQTab=ref<number|string>(0);

const onClickQEdit=(qid=0,status=0)=>{
   activeQTab.value=status;
   qstnId.value=qid;
   showEditQModal.value=true;
}

const savedQCallBack=async(tems:any)=>{
  pageQcurrent.value=1;
  await fetchQuestionsData();
}

/*********Q end **********/

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
watch(() =>addExamModel.content, (val) => {
   const cleaned = cleanHtml(val);
  if (cleaned !== val) {
  addExamModel.content=cleaned;
  }
})


const filterquestions= ref<string>("");
// update search 
watch(filterquestions, () => {
  setTimeout(() => {
    fetchQuestionsData()
  }, 800)
})

const slugify = (val: string) => (val || '')
  .toLowerCase()
  .trim()
  .replace(/\s+/g, "-")
  .replace(/[^a-z0-9-]/g, "")

// Set once the exam is loaded: true when it already has a slug, i.e. a public
// URL that is already out there.
const hadSlugOnLoad = ref(false)
const slugTouched   = ref(false)

// Live-slugify from the name ONLY while this exam has no slug yet. The slug is
// the public URL (see previewUrl), so auto-updating it on an exam that already
// has one would silently 404 every existing link the moment an admin fixed a
// typo in the name. For those, the admin regenerates deliberately via the
// button next to the field.
watch(() => addExamModel.name, (val) => {
  if (hadSlugOnLoad.value || slugTouched.value) return
  addExamModel.slug = slugify(val)
})

watch(() => addExamModel.slug, (val) => {
  if(val){
     const clean = slugify(val)
     if (clean !== val) addExamModel.slug = clean
  }
})

// Explicit opt-in: rebuild the slug from the current name. Confirmed first,
// because it changes a live URL.
const regenerateSlug = async () => {
  const next = slugify(addExamModel.name)
  if (!next) { $toast('Enter a name first', 'error'); return }
  if (next === addExamModel.slug) return

  const ok = await $confirm(
    `Change the URL from "${addExamModel.slug}" to "${next}"? Existing links to this exam will stop working.`
  )
  if (!ok) return

  addExamModel.slug = next
  slugTouched.value = true
}


/* =========================
 SEO 
========================= */

const TITLE_LIMIT = 60
const DESC_LIMIT = 155

// preview title
const previewTitle = computed(() => {
  if (!addExamModel.seo_title) return ''
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


// counts
const titleCharCount = computed(() => addExamModel.seo_title.length)
const descCharCount = computed(() => addExamModel.seo_description.length)

// color class
const getSeoClass = (count:number, limit:number) => {
  if (count > limit) return 'seo-red'
  if (count >= limit - 10) return 'seo-amber'
  return 'seo-normal'
}

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

// Inline "create exam category" — same drawer the New-Exam flow uses, so an admin
// editing an exam no longer has to leave the modal (losing unsaved changes) just
// to add a missing category. AddExamCategory only emits the NAME, so the new
// category is matched back by name after the list refreshes.
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

let searchTimeout: any = null;
const onExamCategorySearch = (query: string) => {
    inputSearchExamCategory.value = query;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        fetchExamCategoryData(true);
    }, 500); // debounce
};

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

// preview url
const previewUrl = computed(() => {
  if(addExamModel.type == 'shelf'){
     return baseUrl()+'/'+(addExamModel.slug || 'sample-exam');
  }else{
     return baseUrl()+'/exams/'+(addExamModel.slug || 'sample-exam');
  }
})

const onClickPreviewUrl=async()=>{
   const details = examDetail.value;

    if (!details?.slug){
      return;
    }

    let url =  baseUrl(`/exam/${details.slug}`);

    if (!url.startsWith('http')) {
      url = `https://${url}`;
    }
  
    window.open(url, '_blank', 'noopener,noreferrer');
}

onMounted(async () => {
   examDetail.value = null;
    selectedQuestionIds.value = [];
    loadExamOptions();          // needed by the Bundle-offers picker (pricing tab)
    await fetchData();
    await fetchQuestionsData();
})

</script>

<template>
  
  <Loading v-if="fullLoading" />
  <div v-if="!fullLoading && modelValue" class="overlay overlay-top open" @click.self="closeModal">

    <div class="drawer" style="width:780px;max-width:97vw">

      <div class="drawer-header">
        <div class="titledrop">Exam Summary</div>

        <div style="display:flex;gap:8px;align-items:center">

        <span v-if="addExamModel.status === 1"
        class="badge badge-green examEditorStatus">
        Live
      </span>
       <span v-else-if="addExamModel.status === 2"
        class="badge badge-danger examEditorStatus">
        Archive
      </span>
       <span v-else
        class="badge badge-amber examEditorStatus">
        Draft
      </span>

        <input ref="mdFileInput" type="file"
          accept=".md,.markdown,text/markdown,text/plain"
          style="display:none" @change="onImportMd" />

        <div style="display:flex;align-items:center;gap:5px">
        <button class="btn btn-outline btn-sm" type="button"
          style="display:flex;align-items:center;gap:5px"
          @click="mdFileInput?.click()"
          title="Populate page sections from a markdown file">
          <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round"
            stroke-width="2.5" viewBox="0 0 24 24" width="12">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" x2="12" y1="15" y2="3"></line>
          </svg>
          Import from .md
        </button>

        <button class="btn btn-outline btn-sm" type="button"
          @click="downloadMdTemplate"
          title="Download a .md template showing the heading structure">
          Template
        </button>

        <button class="btn btn-outline btn-sm" type="button"
          @click="downloadCurrentMd"
          title="Download this exam's page content as .md to edit and re-upload">
          Download current
        </button>

        <span v-if="mdFileName"
          style="display:inline-flex;align-items:center;gap:4px;font-size:0.72rem;color:#16a34a;font-weight:600;white-space:nowrap"
          :title="`${mdFileName} — ${mdImportedCount} section(s) imported`">
          ✓ {{ mdFileName }} <span style="color:var(--ink-dim);font-weight:500">({{ mdImportedCount }})</span>
        </span>
        </div>

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

        <button class="btn btn-outline btn-sm"  id="examDeployBtn" style="display:none" type="button">
            Redraft
        </button>
        <button 
        @click="closeModal"
        class="drawer-close" data-action="close-overlay" type="button">
            <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" 
            stroke-width="2.5" viewBox="0 0 24 24" width="13">
            <line x1="18" x2="6" y1="6" y2="18"></line>
            <line x1="6" x2="18" y1="6" y2="18"></line>
        </svg>
        </button>
        </div>
      </div>

        <div class="drawer-body" >

            <div v-if="data_loading || !examDetail" class="p-4">
            <Loader_small v-if="data_loading" />
            <Empty v-if="!data_loading && !examDetail"/>
            </div>

              <div  v-else  class="drawerbody">

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
                  <select class="form-input form-select" id="examType" v-model="addExamModel.type" @change="onTypeChange" >
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
                @search-change="onExamCategorySearch"
                />
              </div>

              <AddExamCategory v-model="showAddCategory" @saved="onCategoryCreated" />

              <div class="form-row-2">
              <div class="form-row" style="margin:0 0 12px">
              <label class="form-label">URL Slug</label>
              <div style="display:flex;align-items:center;gap:0">
              <span style="background:var(--surface);border:1.5px solid var(--border);border-right:none;border-radius:var(--r-sm) 0 0 var(--r-sm);padding:9px 10px;font-size:0.78rem;color:var(--ink-dim);white-space:nowrap">
                {{ baseUrl('exams') }}
              </span>
              <input class="form-input" id="examSlug" placeholder="shelf-im"
              style="border-radius:0 var(--r-sm) var(--r-sm) 0;flex:1" type="text"
              v-model="addExamModel.slug"
              @input="slugTouched = true"  />
              </div>
              <div v-if="hadSlugOnLoad" style="margin-top:6px;font-size:0.72rem;color:var(--ink-dim)">
                Renaming the exam does not change this URL.
                <button type="button"
                  style="background:none;border:none;padding:0;font:inherit;color:var(--accent,#0891b2);cursor:pointer;text-decoration:underline"
                  @click="regenerateSlug">
                  Regenerate from name
                </button>
                — existing links will break.
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

              <!-- Custom colour — free picker (adds any colour). -->
              <label title="Custom colour" style="position:relative;display:flex;align-items:center;gap:6px;cursor:pointer">
              <div id="customSwatchPreview"
              class="theme-swatch"
              :class="{ active: addExamModel.accent_title === 'custom' }"
              :style="{ background: customColor, position:'relative', overflow:'hidden' }"
              title="Custom colour">
              <input id="examThemeCustom"
              type="color"
              v-model="customColor"
              style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;border:none;padding:0"
              @input="setTheme('custom', customColor)" />
              </div>
              <span style="font-size:0.72rem;color:var(--ink-dim)">+ Custom</span>
              </label>
              </div>

              <div class="examThemeLbel">
              {{addExamModel.accent_title }} — {{ addExamModel.accent_color }}
              </div>
              <input type="hidden"
              v-model="addExamModel.accent_title"
              />
              </div>

             

              </div>
               <!-- Exam-type icon picker → stored on exams.icon; "Auto" (empty) falls
                   back to the category's default icon on the public site. -->
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

              <!-- External link-out card (International Board Registration): opens
                   external_url in a new tab instead of the internal exam page. -->
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
              v-model="addExamModel.short_description" >
              </textarea>
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
              v-model="addExamModel.free_trial_duration" 
              />
              <span style="font-size:0.82rem;color:var(--ink-dim)">
                days
              </span>
              </div>
              </div>

              <div class="form-row" style="margin:0 0 12px">
              <label class="form-label">Questions Accessible</label>
              <div style="display:flex;align-items:center;gap:6px">
              <input class="form-input" id="trialQuestions" min="1" style="max-width:80px"
              type="number" 
              v-model="addExamModel.free_trial_questions_accessible"
                />
              <span style="font-size:0.82rem;color:var(--ink-dim)">
                questions
              </span>
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
              <div style="font-size:0.82rem;color:var(--ink-dim);margin-bottom:16px">
                Set subscription prices for each plan duration. 12-month is shown as "Best Value"
                  by default.
              </div>
              <div class="pricing-grid">
              <div class="price-input-wrap">
              <div class="price-input-label">1 Month</div>
              <div style="display:flex;align-items:center;gap:4px">
              <span style="font-size:1rem;font-weight:700;color:var(--ink-dim)">{{ localSymbol }}</span>
              <input class="price-input" id="price1m" placeholder="39" type="number"
              v-model="addExamModel.price_1"/>
              </div>
              </div>
              <div class="price-input-wrap">
              <div class="price-input-label">2 Months</div>
              <div style="display:flex;align-items:center;gap:4px">
              <span style="font-size:1rem;font-weight:700;color:var(--ink-dim)">{{ localSymbol }}</span>
              <input class="price-input" id="price2m" placeholder="0 = not offered" type="number"
              v-model="addExamModel.price_2"/>
              </div>
              </div>
              <div class="price-input-wrap">
              <div class="price-input-label">3 Months</div>
              <div style="display:flex;align-items:center;gap:4px">
              <span style="font-size:1rem;font-weight:700;color:var(--ink-dim)">{{ localSymbol }}</span>
              <input class="price-input" id="price3m" 
                placeholder="59"
                type="number"
              v-model="addExamModel.price_3" />
              </div>
              </div>
              <div class="price-input-wrap">
              <div class="price-input-label">6 Months</div>
              <div style="display:flex;align-items:center;gap:4px">
              <span style="font-size:1rem;font-weight:700;color:var(--ink-dim)">{{ localSymbol }}</span>
              <input class="price-input" id="price6m" placeholder="75"
                type="number"
              v-model="addExamModel.price_6" />
              </div>
              </div>
              <div class="price-input-wrap" style="border-color:rgba(6,182,212,0.3)">
              <div class="price-input-label" style="color:var(--teal)">12 Months (Best Value)</div>
              <div style="display:flex;align-items:center;gap:4px">
              <span style="font-size:1rem;font-weight:700;color:var(--ink-dim)">{{ localSymbol }}</span>
              <input class="price-input" id="price12m" placeholder="89"
                type="number"
              v-model="addExamModel.price_12" />
              </div>
              </div>
              </div>
              <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:var(--r-sm);padding:12px 14px;font-size:0.8rem;color:var(--ink-dim);line-height:1.6">
              Savings percentages vs 1-month rate are calculated automatically and
              displayed on pricing cards. The 12-month plan is always marked as Best Value.
              </div>

              <!-- ── Bundle offers (per month) ─────────────────────────────────────── -->
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
              id="etab-content-questions">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
                      <div style="font-size:0.82rem;color:var(--ink-mid)">
                      Assign existing questions
                      <div class="headswraplabl form-row" style="margin-top: 5px;">
                        <label class="form-label">Limit</label> 
                        <select class="filter-input form-select" v-model="limitQdata" >
                        <option :value="10">10</option>
                        <option :value="20">20</option>
                        <option :value="50">50</option>
                        <option :value="100">100</option>
                        <option :value="500">500</option>
                        <option :value="1000">1000</option>
                        </select>
                        </div>
                      </div>
                      <div style="display:flex;gap:8px;align-items:center">
                          <input class="filter-input"
                          placeholder="Filter questions..."
                          style="font-size:0.78rem;padding:5px 10px"
                          type="text"
                          v-model="filterquestions"
                          />
                          <select class="filter-input form-select" style="font-size:0.78rem;padding:5px 10px" v-model="sourceExamId">
                            <option :value="null">This exam's questions</option>
                            <option v-for="ex in examOptions" :key="ex.id" :value="Number(ex.id)">{{ ex.name }} ({{ ex.total_question ?? 0 }})</option>
                          </select>
                      </div>
                  </div>

                <div style="max-height:320px;overflow-y:auto;padding-right:4px">

                  <div v-if="dataQuestionsloading || getQuestionsDataList.length === 0">
                    <Empty v-if="!dataQuestionsloading && getQuestionsDataList.length === 0" />
                    <Loader_small v-else />
                  </div>

                  <template v-else>
                   <template v-for="(row, ky) in displayRows"
                     :key="row.assoc ? 'assoc-block' : `q-${row.q?.id}`">

                    <!-- ASSOCIATED (referenced from other exams) — right after this
                         exam's CHECKED questions, on the default view (page 1). -->
                    <template v-if="row.assoc">
                      <div v-for="(aq, aky) in associatedQuestions" :key="`aq-${aq?.id}`" class="q-assign-row assigned">
                        <span>A{{ aky+1 }}</span>
                        <span>
                        <input class="q-assign-check" type="checkbox"
                        :checked="associatedQuestionIds.includes(Number(aq.id))"
                        @change="toggleAssociated(aq)" />
                        </span>
                        <span>Q#{{ aq.qid??'-' }}</span>
                        <div class="q-assign-text" v-html="safeHtmlContent(aq.question_stem)"></div>
                        <div class="q-assign-meta">
                        <span class="badge badge-teal" style="font-size:0.63rem">Associated: {{ aq.exam_name }}</span>
                        <span v-if="aq.cat_name" class="badge badge-gray" style="font-size:0.63rem">{{ aq.cat_name }}</span>
                        </div>
                      </div>
                    </template>

                    <!-- OWN question row -->
                    <div v-else class="q-assign-row assigned">
                        <span>{{ ky+1 }} </span>
                        <span>
                        <input class="q-assign-check" type="checkbox"
                        :checked="(sourceExamId || row.q.is_associated) ? associatedQuestionIds.includes(Number(row.q.id)) : selectedQuestionIds.includes(Number(row.q.id))"
                        @change="(sourceExamId || row.q.is_associated) ? toggleAssociated(row.q) : toggleOwn(row.q.id)" />
                        </span>
                        <span>Q#{{ row.q.qid??'-' }}</span>
                        <div class="qbtnActn"
                        @click="onClickQEdit(row.q.id, row.q.status)">
                        <div class="q-assign-text"
                        v-html="safeHtmlContent(row.q.question_stem)"
                        ></div>
                        </div>

                        <div class="q-assign-meta">
                        <span v-if="row.q.is_associated" class="badge badge-teal" style="font-size:0.63rem">
                        Associated: {{ row.q.exam_name }}
                        </span>
                        <span v-if="row.q.status == '1'" class="badge  badge-green">
                        Published
                        </span>
                        <span v-else-if="row.q.status == '2'" class="badge badge-archived">
                        Archived
                        </span>
                        <span v-else-if="row.q.status == '3'" class="badge badge-review">
                        Flagged
                        </span>
                        <span v-else-if="row.q.status == '4'" class="badge badge-teal">
                        To Approve
                        </span>
                        <span v-else class="badge badge-draft">
                        Draft
                        </span>
                        <span v-if="row.q.cat_name" class="badge badge-gray" style="font-size:0.63rem">
                        {{ row.q.cat_name?? '' }}
                        </span>
                        </div>
                    </div>

                   </template>
                  </template>

                </div>
                 <!-- PAGINATION -->
                <Pagination
                  v-model:page="pageWatchCurnt"
                  :totalData="totalQdata" 
                  :totalPages="totalQPages"
                />

                <div style="margin-top:10px;font-size:0.78rem;color:var(--ink-dim)">
                  <template v-if="sourceExamId">
                    {{ associatedQuestionIds.length }} question(s) associated from other exams.
                  </template>
                  <template v-else>
                  {{ selectedQuestionIds.length }} of {{ getQuestionsDataList.length }} questions assigned.
                  <button class="card-action" type="button"
                  @click="onClickSelectAllQuestion">Select all</button>
                  <button v-if="selectedQuestionIds.length > 0" class="card-action" type="button"
                  :disabled="deletingQuestions"
                  style="color:#dc2626;font-weight:700;margin-left:10px"
                  @click="onClickDeleteSelected">
                  {{ deletingQuestions ? 'Deleting…' : `Delete selected (${selectedQuestionIds.length})` }}
                  </button>
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
                placeholder="e.g. Internal Medicine Shelf Exam Questions | Passmed US" type="text" 
                v-model="addExamModel.seo_title"
                />
                <div class="seoTitleCount"
                    :class="getSeoClass(titleCharCount, 60)">
                {{ titleCharCount }} / 60 characters
                </div>
              </div>

              <div class="form-row">
                <label class="form-label">Keywords</label>
                <input class="form-input" 
                placeholder="internal medicine shelf, NBME shelf exam, IM clerkship questions..." 
                type="text"
                v-model="addExamModel.seo_keywords"
                />
              </div>

              <div class="form-row">
                <label class="form-label">Meta Description</label>
                <textarea class="form-input" 
                id="seoDesc" placeholder="Practice IM Shelf Exam questions with detailed explanations..." 
                rows="2" style="resize:vertical"
                v-model="addExamModel.seo_description"
                ></textarea>
                <div class="seoDescCount"
                  :class="getSeoClass(descCharCount, 155)">
                {{ descCharCount }} / 155 characters</div>
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
                    <label class="form-label">Middle Content</label>
                    <!-- <AppEditor v-model="addExamModel.content" /> -->
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
                            <textarea class="form-input content_question_bank" rows="3" 
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
                @click="submitEditExam(1)">
              Publish
              </button>
              <button class="btn btn-outline btn-sm" type="button"
              @click="submitEditExam(0)">
              Save Draft
              </button>
              <button class="btn btn-danger btn-sm" type="button"
              @click="submitEditExam(2)">Archive</button>
              </div>
              </div>
        </div>
    </div>
  </div>
<!------- question Modal ----------->
  <EditQuestionModal
   v-if="showEditQModal"
  v-model="showEditQModal"
   @saved="savedQCallBack"
   :id="qstnId"
   :activeTab="activeQTab"
   />  
<!-------- question modal ---------->
</template>