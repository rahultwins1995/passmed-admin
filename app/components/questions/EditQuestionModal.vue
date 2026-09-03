<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import { ref, watch ,onMounted } from 'vue'
import Loading from '@/components/loaders/Loading.vue'
import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'
import AppEditor from '@/components/editor/AppEditor.vue'


const { $toast, $api } = useNuxtApp()

const props = defineProps<{
  modelValue: Boolean,
    id:any|null,
    activeTab: number|string,
    /**
     * Embedded mode (used by the Review & Approve flow): render ONLY the form —
     * no overlay, no drawer chrome, no footer buttons — and never self-close.
     * The host drives saving via the exposed save()/isDirty(). Default false, so
     * every existing "open as a modal" usage behaves exactly as before.
     */
    embedded?: boolean,
}>();

const emit = defineEmits(['update:modelValue', 'saved'])

const modelDetails=ref<any>(null)

const addForm = ref<any>({
  exam_id: '0',
  // Slug from the difficulties table — see AddQuestionModal.
  difficulty: '',
  status: '1',
  type: 'single', // single | multiple
  question_stem: '',
  question_image_ids: '',
  explanation: '',
  reference: '',
  subject_id: '0',
  category_id: '0',
  domain_id: '0',
  discipline_id: '0',
  learning_outcome_id: '0',
})

// ── Learning Outcome + Difficulty vocabularies ───────────────────────────────
// Both were hardcoded <option> lists here. See AddQuestionModal for the full story.
const learningOutcomeList = ref<any[]>([])
const difficultyList      = ref<any[]>([])

const fetchLearningOutcomes = async () => {
  try {
    const res: any = await $api.post('/learning-outcomes/list', { limit: 500 })
    learningOutcomeList.value = res?.data?.status === 'success' ? (res.data.data || []) : []
  } catch { learningOutcomeList.value = [] }
}

const fetchDifficulties = async () => {
  try {
    const res: any = await $api.post('/difficulties/list', { limit: 500 })
    difficultyList.value = res?.data?.status === 'success' ? (res.data.data || []) : []
  } catch { difficultyList.value = [] }
}

const options = ref([
  { text: '', correct: false },
  { text: '', correct: false },
  { text: '', correct: false },
  { text: '', correct: false }
])

const getExamDataList = ref<any[]>([])
const dataExamloading= ref<boolean>(false);
const pageExam = ref(1)
const hasMoreExam = ref(true)

const fetchExamList= async (reset = false)=>{
  dataExamloading.value=true;
try{

    if (reset) {
      pageExam.value = 1
      getExamDataList.value = []
      hasMoreExam.value = true
    }

        const res:any = await $api.get(`/exams/list?page=${pageExam.value}`)
        const obj:any = res.data;
    
        if(obj.status == 'success'){
          const newData = res.data.data || []
          if (newData.length === 0) {
            hasMoreExam.value = false
          } else {
            const existingIds = new Set(
            getExamDataList.value.map((item:any) => item.id)
            );
            const filteredData = newData.filter((item:any) => !existingIds.has(item.id));
            getExamDataList.value.push(...filteredData)

            pageExam.value++
          }

        }else{
        getExamDataList.value=[];
        }

    } catch(err){
      getExamDataList.value=[];

    }finally{
       dataExamloading.value=false;
    }
}

const examOptions = computed(() => {
  return [
    { id: 0, name: '! -- Select Option -- !' },
    ...getExamDataList.value
  ]
})

const getCategoryDataList=ref<any[]>([]);
const categoryLoading=ref<boolean>(false);

const pageCategory = ref(1)
const hasMoreCategory = ref(true)
const limitCategorydata = ref(1000);
const inputSearchCategory = ref<any>("");

const fetchCategoryData= async (reset = false)=>{
  categoryLoading.value=true;
    try{  

        if (reset) {
        pageCategory.value = 1
        getCategoryDataList.value = []
        hasMoreCategory.value = true
        }

        const res:any = await $api.post("/categories/list",{
          search:inputSearchCategory.value,
          page:pageCategory.value,
          limit:limitCategorydata.value
        })
        const obj:any = res.data;
    
        if(obj.status == 'success'){

          const newData = obj.data || []
          if (newData.length === 0) {
            hasMoreCategory.value = false
          } else {
            const existingIds = new Set(
            getCategoryDataList.value.map((item:any) => item.id)
            );
            const filteredData = newData.filter((item:any) => !existingIds.has(item.id));
            getCategoryDataList.value.push(...filteredData)

            pageCategory.value++
          }
  
        }else{
        getCategoryDataList.value=[];
        }
    } catch(err){
      getCategoryDataList.value=[];
    }finally{
        categoryLoading.value=false;
    }
}

const categoryOptions = computed(() => {
  return [
    { id: '0', name: '! -- Select -- !' },
    ...getCategoryDataList.value
  ]
})

const subjectOptions = computed(() => {
  return [
    { id: '0', name: '! -- Select -- !' },
    ...getSubjectDataList.value
  ]
})

const subjectLoading=ref<boolean>(false);
const getSubjectDataList=ref<any[]>([]);
const pageSubject = ref(1)
const hasMoreSubject = ref(true)
const limitSubjectdata = ref(1000);
const inputSearchSubject = ref<any>("");

const fetchSubjectData= async (reset = false)=>{
  subjectLoading.value=true;
    try{
       if (reset) {
        pageSubject.value = 1
        getSubjectDataList.value = []
        hasMoreSubject.value = true
        }

        const res:any = await $api.post("/subjects/list",{
          search:inputSearchSubject.value,
          page:pageSubject.value,
          limit:limitSubjectdata.value
        })
        const obj:any = res.data;
    
        if(obj.status == 'success'){
          const newData = obj.data || []
          if (newData.length === 0) {
            hasMoreSubject.value = false
          } else {
            const existingIds = new Set(
            getSubjectDataList.value.map((item:any) => item.id)
            );
            const filteredData = newData.filter((item:any) => !existingIds.has(item.id));
            getSubjectDataList.value.push(...filteredData)
           
            pageSubject.value++
          }
       
        }else{
        getSubjectDataList.value=[];
        }
    } catch(err){
      getSubjectDataList.value=[];
    }finally{
        subjectLoading.value=false;
    }
}

const domainLoading=ref<boolean>(false);
const getDomainsDataList=ref<any[]>([]);
const pageDomain = ref(1)
const hasMoreDomain = ref(true)
const limitDomaindata = ref(1000);
const inputSearchDomain = ref<any>("");
const fetchDomainData= async (reset = false)=>{
  domainLoading.value=true;
    try{
       if (reset) {
        pageDomain.value = 1
        getDomainsDataList.value = []
        hasMoreDomain.value = true
        }

        const res:any = await $api.post("/domains/list",{
          search:inputSearchDomain.value,
          page:pageDomain.value,
          limit:limitDomaindata.value
        });

        const obj:any = res.data;
    
        if(obj.status == 'success'){
          const newData = obj.data || []
          if (newData.length === 0) {
          hasMoreDomain.value = false
          } else {
            const existingIds = new Set(
            getDomainsDataList.value.map((item:any) => item.id)
            );
            const filteredData = newData.filter((item:any) => !existingIds.has(item.id));
            getDomainsDataList.value.push(...filteredData)
          pageDomain.value++
          }
 
        }else{
        getDomainsDataList.value=[];
        }
    } catch(err){
      getDomainsDataList.value=[];
    }finally{
        domainLoading.value=false;
    }
}

const domainOptions = computed(() => {
  return [
    { id: '0', name: '! -- Select -- !' },
    ...getDomainsDataList.value
  ]
})

const disciplineLoading=ref<boolean>(false);
const getDisciplineDataList=ref<any[]>([]);
const pageDiscipline = ref(1)
const hasMoreDiscipline = ref(true)
const limitDisciplinedata = ref(1000);
const inputSearchDiscipline = ref<any>("");

const fetchDisciplineData= async (reset = false)=>{
  disciplineLoading.value=true;
    try{
       if (reset) {
        pageDiscipline.value = 1
        getDisciplineDataList.value = []
        hasMoreDiscipline.value = true
        }

        const res:any = await $api.post("/disciplines/list",{
          search:inputSearchDiscipline.value,
          page:pageDiscipline.value,
          limit:limitDisciplinedata.value
        });

        const obj:any = res.data;
    
        if(obj.status == 'success'){
          const newData = obj.data || []
          if (newData.length === 0) {
            hasMoreDiscipline.value = false
          } else {
            
             const existingIds = new Set(
            getDisciplineDataList.value.map((item:any) => item.id)
            );
            const filteredData = newData.filter((item:any) => !existingIds.has(item.id));
            getDisciplineDataList.value.push(...filteredData)
            
            pageDiscipline.value++
          }
        }else{
        getDisciplineDataList.value=[];
        }
    } catch(err){
      getDisciplineDataList.value=[];
    }finally{
        disciplineLoading.value=false;
    }
}

const disciplineOptions = computed(() => {
  return [
    { id: '0', name: '! -- Select -- !' },
    ...getDisciplineDataList.value
  ]
})

const tagLoading=ref<boolean>(false);
const tag_ids=ref<any[]>([]);
const getTagDataList=ref<any[]>([]);
const pageTag = ref(1)
const hasMoreTag = ref(true)
const limitTagdata = ref(1000);
const inputSearchTag = ref<any>("");

const fetchTagData= async (reset = false)=>{
  tagLoading.value=true;
    try{
       if (reset) {
        pageTag.value = 1
        getTagDataList.value = []
        hasMoreTag.value = true
        }

        const res:any = await $api.post("/tags/list",{
          search:inputSearchTag.value,
          page:pageTag.value,
          limit:limitTagdata.value
        });

        const obj:any = res.data;
    
        if(obj.status == 'success'){
          const newData = obj.data || []

            // remove duplicates by id
            const existingIds = new Set(getTagDataList.value.map(i => i.id));
            const filtered = newData.filter((i:any) => !existingIds.has(i.id));

          if (filtered.length === 0) {
            hasMoreTag.value = false
          } else {
            getTagDataList.value.push(...filtered)
            pageTag.value++
          }
        }else{
        getTagDataList.value=[];
        }

    } catch(err){
      getTagDataList.value=[];
    }finally{
        tagLoading.value=false;
    }
}
const tagOptions = computed(() => {
  return getTagDataList.value.map(item => ({
      ...item,
      id: Number(item.id) // force number
    }))
})


// close modal
const closeModal = () => {
  emit('update:modelValue', false)
}

// add option
const addOption = () => {
  options.value.push({ text: '', correct: false })
}

// remove option
const removeOption = (index:number) => {
  options.value.splice(index, 1)
}

// select correct (single)
const setSingleCorrect = (index:number) => {
  options.value.forEach((opt, i) => {
    opt.correct = i === index
  })
}

// toggle multiple correct
const toggleMultiple = (index: number) => {
    const opt = options.value[index]
    if (!opt) return
    opt.correct = !opt.correct
}

// submit
const submitAsQuestion = async (status ='1') => {
  addForm.value.status=status;
  await submitQuestion();
}
const fullLoading=ref<boolean>(false);

const questionFlagcleared = async () => {
  if (!props.id) return

    closeModal();
    fullLoading.value = true;
  try {

      const res:any = await $api.post("/questions/update-status/"+props.id, {
      status:'1',
      });
         const obj:any = res.data
        if (obj.status === 'success') {

           fullLoading.value = false
            emit('saved', true); 
           $toast('Clear flag request is successfully')

        }else {
           
           fullLoading.value = false
          $toast('Clear flag request is failed', 'error')
        }

    } catch (err) {
   
     fullLoading.value = false
     $toast('Clear flag request is failed', 'error')
    }
}

const submitQuestion = async (): Promise<boolean> => {

   if (!props.id) return false

  if(options.value.length === 0){
    $toast('Please add any answer', 'error')
    return false;
  }

  if (!options.value.some(o => o.correct)) {
    $toast('Please select correct answer', 'error')
    return false
  }

  if (!options.value.every(o => o.text)) {
    $toast('All options must be filled', 'error')
    return false
  }

  // Close moved to the success branch — on failure the drawer must stay open with
  // input intact. (Embedded/Review & Approve never self-closes: the host owns it.)
  fullLoading.value = true;

  const payload = {
    ...addForm.value,
    options: options.value,
    tag_ids: tag_ids.value
  }

  try {
    const res:any = await $api.post("/questions/update/"+ props.id, payload);

    if (res.data.status === 'success') {
       fullLoading.value = false;

      if(addForm.value.status == "0"){
         $toast('Saved as draft');
      } else if(addForm.value.status == "2"){
         $toast('Question archived');
      } else if(addForm.value.status == "3"){
         $toast('Flagged saved');
      }else if(addForm.value.status == "4"){
         $toast('To Approve saved');
      }else{
         $toast('Question saved');
      }
     
      emit('saved', true);

      // Embedded: keep the form populated (the host may still be showing it) and
      // re-baseline so it's no longer "dirty". Modal mode keeps the old reset.
      if (props.embedded) {
        baseline.value = snapshot()
      } else {
        // reset
        addForm.value.question_stem = ''
        options.value = [
          { text: '', correct: false },
          { text: '', correct: false }
        ]
        // Close only now that the server has confirmed the update.
        closeModal();
      }
      return true

    }else{
           fullLoading.value = false;
           $toast('Failed to saved');
           return false;
    }

  } catch (err:any) {

     fullLoading.value = false;
     const message = err?.response?.data?.message || 'Failed to saved.'
     $toast(message);
     return false;
  }
}

// ── Dirty tracking (embedded mode) ───────────────────────────────────────────
// Snapshot the loaded question; the host uses isDirty() to skip a pointless save
// (and the revision entry it would create) when the reviewer changed nothing.
const snapshot = () => JSON.stringify({
  f: addForm.value,
  o: options.value,
  t: tag_ids.value,
})
const baseline = ref<string>('')
const isDirty = () => baseline.value !== '' && snapshot() !== baseline.value

defineExpose({ save: submitQuestion, isDirty })

const data_loading = ref(false);
const fetchData = async () => {
   const propsActive=String(props.activeTab?? '1');

  if (!props.id) return

  data_loading.value = true

  try {
    const res:any = await $api.get("/questions/details/" + props.id)
    const obj:any = res.data

    if (obj.status === 'success') {
      const detail= obj.data;
      modelDetails.value=detail;
       const tagsdata= detail?.tags ??[];
       const addFormstatus=String(detail?.status ?? '1');
      tag_ids.value =tagsdata.map((i:any) => Number(i.id));

      addForm.value.exam_id = Number(detail?.exam_id ?? 0)
      addForm.value.difficulty = detail?.difficulty ?? ''
      addForm.value.subject_id = Number(detail?.subject_id ?? 0)
      addForm.value.category_id = Number(detail?.category_id ?? 0)
      addForm.value.domain_id = Number(detail?.domain_id ?? 0)
      addForm.value.discipline_id = Number(detail?.discipline_id ?? 0)

      addForm.value.type = detail?.type ?? 'single'
      addForm.value.question_stem = detail?.question_stem ?? ''
      addForm.value.question_image_ids = detail?.question_image_ids ?? ''
      addForm.value.explanation = detail?.explanation ?? ''
      addForm.value.reference = detail?.reference ?? ''
      // Taxonomy id now. `show()` returns it flat on the question record.
      addForm.value.learning_outcome_id = String(detail?.learning_outcome_id ?? 0)
      

        if(propsActive === '0'){
        addForm.value.status="1";
        }else{
        addForm.value.status=addFormstatus;
        }


      options.value = (detail?.question_option || [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((opt: any) => ({
      text: opt.option_text || '',
      correct: opt.is_correct === 'true'
      }));

      // Baseline for isDirty() — set AFTER the form is fully populated.
      baseline.value = snapshot()

    } else {
      modelDetails.value=null;
      tag_ids.value =[];
       const message = obj?.msg || 'Fetch Data Failed.'
      $toast(message);
    }

  } catch (err: any) {
       modelDetails.value=null;
       tag_ids.value =[];
     const message = err?.response?.data?.message || 'Failed to saved.'
     $toast(message);

  } finally {
    data_loading.value = false
  }
}

const finalStatus=ref<string>('0');

watch(() => addForm.value.status, (val) => {
   finalStatus.value=val;
});

onMounted(() => {
  modelDetails.value=null;

  // Vocabularies for the two dropdowns that used to be hardcoded.
  fetchLearningOutcomes();
  fetchDifficulties();

  if (props.modelValue) {
     const bactrigerstatus=String(props.activeTab?? '1');
      if(bactrigerstatus == "0"){
       finalStatus.value="1";
      }else{
        finalStatus.value="0";
      }

    options.value = [
    { text: '', correct: false },
    { text: '', correct: false },
    { text: '', correct: false },
    { text: '', correct: false }
    ];

    fetchData();

  //first time load data
  fetchExamList();
  fetchCategoryData();
  fetchSubjectData();
  fetchDomainData();
  fetchDisciplineData();
  fetchTagData();
 
      setTimeout(() => {
        const el = document.querySelector('.multiexam-select-options')

        if (el) {
          el.addEventListener('scroll', async () => {
            if (
              el.scrollTop + el.clientHeight >= el.scrollHeight - 10 &&
              !dataExamloading.value &&
              hasMoreExam.value
            ) {
              await fetchExamList()
            }
          })
        }
      }, 500)

      setTimeout(() => {
        const el = document.querySelector('.multiCategory-select-options')

        if (el) {
          el.addEventListener('scroll', async () => {
            if (
              el.scrollTop + el.clientHeight >= el.scrollHeight - 10 &&
              !categoryLoading.value &&
              hasMoreCategory.value
            ) {
              await fetchCategoryData()
            }
          })
        }
      }, 500)

      setTimeout(() => {
        const el = document.querySelector('.multiSubject-select-options')

        if (el) {
          el.addEventListener('scroll', async () => {
            if (
              el.scrollTop + el.clientHeight >= el.scrollHeight - 10 &&
              !subjectLoading.value &&
              hasMoreSubject.value
            ) {
              await fetchSubjectData()
            }
          })
        }
      }, 500)

        setTimeout(() => {
        const el = document.querySelector('.multiDomain-select-options')

        if (el) {
          el.addEventListener('scroll', async () => {
            if (
              el.scrollTop + el.clientHeight >= el.scrollHeight - 10 &&
              !domainLoading.value &&
              hasMoreDomain.value
            ) {
              await fetchDomainData()
            }
          })
        }
      }, 500)

      setTimeout(() => {
        const el = document.querySelector('.multiDiscipline-select-options')

        if (el) {
          el.addEventListener('scroll', async () => {
            if (
              el.scrollTop + el.clientHeight >= el.scrollHeight - 10 &&
              !disciplineLoading.value &&
              hasMoreDiscipline.value
            ) {
              await fetchDisciplineData()
            }
          })
        }
      }, 500)

      setTimeout(() => {
        const el = document.querySelector('.multiTag-select-options')

        if (el) {
          el.addEventListener('scroll', async () => {
            if (
              el.scrollTop + el.clientHeight >= el.scrollHeight - 10 &&
              !tagLoading.value &&
              hasMoreTag.value
            ) {
              await fetchTagData()
            }
          })
        }
      }, 500)
   }
});

</script>

<template>
   <Loading v-if="fullLoading"/>

<!-- embedded → plain container (no overlay / no backdrop-close); modal → unchanged -->
<div v-if="modelValue"
  :class="embedded ? 'question-editor-embedded' : 'question-modal overlay overlay-top open'"
  @click.self="embedded ? null : closeModal()">

  <div :class="embedded ? '' : 'drawer'" :style="embedded ? '' : 'width:800px;max-width:96vw'">

    <!-- HEADER -->
    <div v-if="!embedded" class="drawer-header">
      <div>
        <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:4px">
          Question Editor
        </div>
        <div v-if="!data_loading && modelDetails" style="font-size:0.88rem;font-weight:700;color:var(--ink)">
         Q#{{(modelDetails?.qid)??'-' }}
        </div>
      
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <div v-if="!data_loading && modelDetails" class="wrapbadge">
          <span v-if="modelDetails.status == '1'" class="badge badge-green">
          Published
          </span>
           <span v-if="modelDetails.status == '3'" class="badge badge-amber">
          Flagged
          </span>
          
          <span v-if="modelDetails.status == '0'" class="badge badge-gray">
            Draft
          </span>

          <span v-if="modelDetails.status == '2'" class="badge badge-danger">
            Archive
          </span>

          <span v-if="modelDetails.status == '4'" class="badge badge-gray">
           To Approve
          </span>

        </div>

        <button class="drawer-close" data-action="close-overlay" type="button"
        @click="closeModal">
        <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="13">
        <line x1="18" x2="6" y1="6" y2="18"></line>
        <line x1="6" x2="18" y1="6" y2="18"></line>
        </svg>
        </button>
        </div>
    </div>

    <!-- BODY -->
      <div v-if="data_loading || !modelDetails" class="drawer-body">
            <Loader_small v-if="data_loading" />
            <Empty v-if="!data_loading && !modelDetails"/>
        </div>
        <div v-else class="drawer-body">

          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:18px">
          
              <div class="form-row" style="margin:0">
                <label class="form-label">Exam</label>
                <Multiselect
                  class="multiexam-select-options exam-select"
                placeholder="e.g. Exam"
                v-model="addForm.exam_id"
                :options="examOptions"
                label="name"
                valueProp="id"
                :searchable="true"
                :loading="dataExamloading"
                />
              </div>

              <div class="form-row" style="margin:0">
                <label class="form-label">Status</label>
                <select 
                class="form-input form-select" 
                v-model="addForm.status"
                >
                <option value="1">Published</option>
                <option value="0">Draft</option>
                <option value="3">Flagged</option>
                <option value="2">Archived</option>
                <option value="4">To Approve</option>
                </select>
              </div>
              <div class="form-row" style="margin:0">
                <label class="form-label">Subject</label>
                <Multiselect
                class="multiSubject-select-options subject-select"
                placeholder="e.g. name"
                v-model="addForm.subject_id"
                :options="subjectOptions"
                label="name"
                valueProp="id"
                :searchable="true"
                :loading="subjectLoading"
                />
              </div>

               <div class="form-row" style="margin:0">
                  <label class="form-label">Category</label>
                  <Multiselect
                  class="multiCategory-select-options category-select"
                  placeholder="e.g. name"
                  v-model="addForm.category_id"
                  :options="categoryOptions"
                  label="name"
                  valueProp="id"
                  :searchable="true"
                  :loading="categoryLoading"
                  />
                </div>

          </div>
           <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:18px">
             
              <div class="form-row" style="margin:0">
                <label class="form-label">Domain</label>
                <Multiselect
                class="multiDomain-select-options domain-select"
                placeholder="e.g. name"
                v-model="addForm.domain_id"
                :options="domainOptions"
                label="name"
                valueProp="id"
                :searchable="true"
                :loading="domainLoading"
                />
              </div>
              <div class="form-row" style="margin:0">
                <label class="form-label">Discipline</label>
                <Multiselect
                class="multiDiscipline-select-options discipline-select"
                placeholder="e.g. name"
                v-model="addForm.discipline_id"
                :options="disciplineOptions"
                label="name"
                valueProp="id"
                :searchable="true"
                :loading="disciplineLoading"
                />
              </div>
              <div class="form-row" style="margin:0">
                <label class="form-label">Learning Outcome</label>
                <!-- Was a hardcoded list of the nine rows in the topics table. -->
                <select class="form-input form-select" id="nqLearning"
                 v-model="addForm.learning_outcome_id"
                >
                  <option value="0">— None —</option>
                  <option v-for="lo in learningOutcomeList" :key="lo.id" :value="String(lo.id)">
                    {{ lo.name }}
                  </option>
                </select>
               </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:18px">
          <div class="form-row" style="margin:0">
            <label class="form-label">Tags</label>
            <Multiselect
            mode="multiple"
            class="multiTag-select-options tag-select"
            placeholder="e.g. name"
            v-model="tag_ids"
           :options="tagOptions"
            label="name"
            valueProp="id"
            :close-on-select="false" 
            :object="false" 
            :searchable="true"
             :show-options="true"
             :hide-selected="false"
            :multipleLabel="() => ''"
            :loading="tagLoading"
            />
          </div>
          <div class="form-row" style="margin:0">
              <label class="form-label">Difficulty</label>
              <select class="form-input form-select" id="nqDifficulty"
              v-model="addForm.difficulty">
              <!-- Bound on `slug` — that is what questions.difficulty stores. -->
              <option v-for="d in difficultyList" :key="d.id" :value="d.slug">
                {{ d.name }}
              </option>
              </select>
            </div>
        </div>

          <!-- STEM -->
            <div class="form-row">
              <label class="form-label">Question Stem</label>
              <AppEditor v-model="addForm.question_stem" />
            </div>

            <div v-if="isImageUrl(addForm.question_image_ids)" class="qc-question-image qc-question-image--admin-edit">
            <img :src="addForm.question_image_ids" alt="Question image" loading="lazy" />
          </div>


            <!-- type -->
          <!-- <div class="form-row">
            <label class="form-label">Question Type</label>
            <select class="form-input form-select" 
            v-model="addForm.type">
              <option value="single">Single Correct</option>
              <option value="multiple">Multiple Correct</option>
            </select>
          </div> -->

            <!-- OPTIONS -->
            <div class="form-row">
            <label class="form-label">Answer Choices 
              <span style="font-weight:400;font-size:0.72rem;color:var(--ink-dim)">
              — click {{ (addForm.type == 'single')?'radio':'check box' }} to set correct answer</span>
            </label>

            <div v-for="(opt, i) in options" :key="i" class="q-choice-row">

              <!-- SINGLE -->
              <input style="margin-right:8px;accent-color:var(--green)"
                v-if="addForm.type === 'single'"
                type="radio"
                :checked="opt.correct"
                @change="setSingleCorrect(i)"
              />

              <!-- MULTIPLE -->
              <input 
              style="margin-right:8px;accent-color:var(--green)"
                v-else
                type="checkbox"
                :checked="opt.correct"
                @change="toggleMultiple(i)"
              />

              <span>{{ String.fromCharCode(65 + i) }}.</span>

              <input class="form-input"
                v-model="opt.text"
                :placeholder="`Answer ${String.fromCharCode(65 + i)}`"
                style="flex:1"
              />

              <button v-if="(i>=2)" class="btnremoveOption"
              @click="removeOption(i)">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              </button>

            </div>
            <div class="drawhdr">
              <div></div>
              <button class="btn btn-primary" @click="addOption">
                + Add Option
              </button>
            </div>

          </div>

          <!-- EXPLANATION -->
          <div class="form-row">
          <label class="form-label">
            Explanation / Teaching Point
          </label>
          <AppEditor v-model="addForm.explanation"/>
          </div>
            
          <div class="form-row" style="margin-bottom:20px">
              <label class="form-label">
              Reference 
              <span style="font-weight:400;font-size:0.72rem;color:var(--ink-dim)">(optional)</span>
              </label>
                <AppEditor v-model="addForm.reference"/>

          </div>

          <!-- Flag notes (if flagged) -->
                  <div class="formrow qFlagSection" v-if="(modelDetails?.user_total_flag ?? 0) > 0">
                      <div class="form-row" id="qFlagSection" style="display: block;">
                          <label class="form-label" style="color:var(--red)">
                              Flag Reports
                          </label>
                          <div style="background:var(--red-light);border:1.5px solid rgba(220,38,38,0.2);border-radius:var(--r-sm);padding:12px 14px;font-size:0.8rem;color:var(--red)">
                              <div style="margin-bottom:6px">
                                  <strong>{{ modelDetails?.user_total_flag ?? 0 }} users flagged this question:</strong>
                              </div>

                              <div style="color:var(--ink-mid);font-size:0.78rem;line-height:1.6">
                                  <template v-if="modelDetails?.flag_reasons?.length">
                                      <span v-for="(fr, i) in modelDetails.flag_reasons" :key="i">
                                      "{{ fr.reason }}" ({{ fr.user_count }} {{ Number(fr.user_count) === 1 ? 'user' : 'users' }})
                                      <span v-if="Number(i) < modelDetails.flag_reasons.length - 1"> · </span>
                                      </span>
                                  </template>
                                  <template v-else>
                                      No specific reasons provided.
                                  </template>
                              </div>
                          </div>
                      </div>
            
                  <!-- Stats box — HAMESHA dikhega (flag v-if ke bahar) -->
                  <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:var(--r-sm);padding:12px 16px;display:flex;gap:24px;margin-bottom:18px">
                      <div>
                          <div style="font-size:0.62rem;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--ink-dim)">
                              Attempts
                          </div>
                          <div id="qEditAttempts" style="font-weight:700;font-size:0.95rem;color:var(--ink)">
                              {{ modelDetails?.attempts ?? 0 }}
                          </div>
                      </div>

                      <div>
                          <div style="font-size:0.62rem;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--ink-dim)">
                              Avg Score
                          </div>
                          <div id="qEditAvgScore" style="font-weight:700;font-size:0.95rem;color:var(--ink)">
                              {{ modelDetails?.avg_score ?? 0 }}%
                          </div>
                      </div>

                      <div>
                          <div style="font-size:0.62rem;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--ink-dim)">
                              Flag Count
                          </div>
                          <div id="qEditFlags" style="font-weight:700;font-size:0.95rem"
                              :style="{ color: (modelDetails?.flag_count ?? 0) > 0 ? 'var(--red)' : 'var(--ink)' }">
                              {{ modelDetails?.flag_count ?? 0 }}
                          </div>
                      </div>

                      <div style="margin-left:auto;display:flex;align-items:center">
                          <button v-if="(modelDetails?.flag_count ?? 0) > 0"
                                  class="btn btn-danger btn-sm"
                                  type="button"
                                  @click="questionFlagcleared">
                              Clear Flag
                          </button>
                      </div>
                  </div>
            </div>

            <!-- ACTIONS — hidden when embedded: the Review & Approve host owns the buttons -->
            <div v-if="!embedded" style="display:flex;gap:8px">
              <button class="btn btn-primary"
                style="flex:1"
                @click="submitQuestion()">
                {{ (finalStatus == '1')?'Publish':'Save Question' }}
                </button>

                <button class="btn btn-outline" 
                @click="submitAsQuestion('0')">
                Save as Draft
                </button>
                <button class="btn btn-danger btn-sm"   
                  type="button"
                  @click="submitAsQuestion('2')">
                  Archive
                </button>

            </div>
            <!-- end ACTIONS -->
        </div>

  </div>
</div>
</template>