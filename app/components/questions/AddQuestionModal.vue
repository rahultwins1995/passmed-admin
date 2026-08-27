<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import { ref, watch ,onMounted, computed } from 'vue'
import Loading from '@/components/loaders/Loading.vue'
import AppEditor from '@/components/editor/AppEditor.vue'

const props = defineProps({
  modelValue: Boolean
})

const { $api, $toast} = useNuxtApp()

const emit = defineEmits(['update:modelValue', 'saved'])

const addForm = ref({
  exam_id: '0',
  // Difficulty is a slug from the difficulties table now, not a hardcoded string.
  // Left blank until the vocabulary loads, then defaulted to the first (lowest-ranked)
  // level — hardcoding 'foundation' would break the moment someone renames or retires
  // it in the Difficulty Manager.
  difficulty: '',
  status: '1',
  type: 'single', // single | multiple
  question_stem: '',
  explanation: '',
  reference: '',
  subject_id: '0',
  category_id: '0',
  domain_id: '0',
  discipline_id: '0',
  // Was a free-text string matched against a hardcoded <option> list. It is a real
  // taxonomy now — this carries the id.
  learning_outcome_id: '0',
})

// ── Learning Outcome + Difficulty vocabularies ───────────────────────────────
// Both dropdowns used to be hardcoded <option> lists in this file. The Learning
// Outcome one listed the exact nine rows that were sitting in the (unrouted, unmanaged)
// topics table — so adding a value in the admin did nothing, and the list drifted from
// the database the moment anyone touched it.
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
    // Default to the lowest-ranked level (the API returns them in rank order).
    if (!addForm.value.difficulty && difficultyList.value.length) {
      addForm.value.difficulty = difficultyList.value[0].slug
    }
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
const limitExdata = ref(500);
const inputSearchExam = ref<any>("");

const fetchExamList= async (reset = false)=>{
  dataExamloading.value=true;
try{

    if (reset) {
      pageExam.value = 1
      getExamDataList.value = []
      hasMoreExam.value = true
    }

        const res:any = await $api.post("/exams/list",{
          search:inputSearchExam.value,
          page:pageExam.value,
          limit:limitExdata.value
        })
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
    { id: '0', name: '! -- Select -- !' },
    ...getExamDataList.value
  ]
})


const getCategoryDataList=ref<any[]>([]);
const categoryLoading=ref<boolean>(false);

const pageCategory = ref(1)
const hasMoreCategory = ref(true)
const limitCategorydata = ref(500);
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
const limitSubjectdata = ref(500);
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
const limitDomaindata = ref(500);
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
const limitDisciplinedata = ref(500);
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

const tag_id=ref<any[]>([]);
const tagLoading=ref<boolean>(false);
const getTagDataList=ref<any[]>([]);
const pageTag = ref(1)
const hasMoreTag = ref(true)
const limitTagdata = ref(500);
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

          const existingIds = new Set(getTagDataList.value.map(i => i.id))
          const filtered = newData.filter((i:any) => !existingIds.has(i.id))
          if (filtered.length === 0) {
            hasMoreTag.value = false
          } else {
          
            const existingIds = new Set(
            getTagDataList.value.map((item:any) => item.id)
            );
            const filteredData = newData.filter((item:any) => !existingIds.has(item.id));
            getTagDataList.value.push(...filteredData)

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
const onTagOpen = () => {
  if (getTagDataList.value.length === 0) {
      fetchTagData(true)
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

const fullLoading=ref<boolean>(false);
// submit
const submitQuestion = async (publish = false) => {

  if(options.value.length === 0){
     $toast('Please add any answer.', 'error')
    return;
  }

  if (!options.value.some(o => o.correct)) {
    $toast('Please select correct answer', 'error')
    return
  }

  if (!options.value.every(o => o.text)) {
    $toast('All options must be filled', 'error')
    return
  }

  closeModal();
  fullLoading.value = true;
  const payload = {
    ...addForm.value,
    status: publish ? '1' : '0',
    options: options.value,
    tag_ids: tag_id.value
  }

  try {
    const res:any = await $api.post('/questions/add', payload);

    if (res.data.status === 'success') {
        fullLoading.value = false;
         $toast("Question is Saved");
          emit('saved', true); 
      // reset
      addForm.value.question_stem = ''
      options.value = [
        { text: '', correct: false },
        { text: '', correct: false }
      ]

     }else{
           $toast('Failed to saved','error');
    }

  } catch (err:any) {
   
    fullLoading.value = false;
      const message = err?.response?.data?.message || 'Failed to saved.'
     $toast(message,'error');

  }
}

// reset when open
watch(() => props.modelValue, (val) => {
  if (val) {
    options.value = [
      { text: '', correct: false },
      { text: '', correct: false },
      { text: '', correct: false },
      { text: '', correct: false }
    ]
  }
})

onMounted(() => {
  //first time load data
  fetchExamList();
  fetchSubjectData();
  fetchCategoryData();
  fetchDomainData();
  fetchDisciplineData();
  fetchLearningOutcomes();
  fetchDifficulties();
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

})

</script>

<template>
   <Loading v-if="fullLoading"/>
   
<div v-if="modelValue" class="overlay overlay-top open" @click.self="closeModal">

  <div class="drawer" style="width:800px;max-width:96vw">

    <!-- HEADER -->
    <div class="drawer-header">
      <div>
        <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:4px">
          New Question
        </div>
        <div style="font-size:0.88rem;color:var(--ink-dim)">
          Create a new question from scratch
        </div>
      
      </div>

      <button class="drawer-close" data-action="close-overlay" type="button"
        @click="closeModal">
        <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="13">
        <line x1="18" x2="6" y1="6" y2="18"></line>
        <line x1="6" x2="18" y1="6" y2="18"></line>
        </svg>
        </button>

    </div>

    <!-- BODY -->
    <div class="drawer-body">
      
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
            <select class="form-input form-select" id="nqStatus"
            v-model="addForm.status">
            <option value="0">Draft</option>
            <option value="1">Published</option>
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
          <!-- Was a hardcoded <option> list of the nine rows that happened to be in the
               topics table. Now driven by the Learning Outcome Manager. -->
          <select class="form-input form-select" id="nqLearning"
          v-model="addForm.learning_outcome_id"
          >
          <option value="0">— None —</option>
          <option v-for="lo in learningOutcomeList" :key="lo.id" :value="String(lo.id)">
            {{ lo.name }}
          </option>
          </select>
          </div>
           <div class="form-row" style="margin:0">
            <label class="form-label">Tags</label>
            <Multiselect
            mode="multiple"
            class="multiTag-select-options tag-select"
            placeholder="e.g. name"
            v-model="tag_id"
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
            @open="onTagOpen"
            />
          </div>
      </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:18px">
         
           <div class="form-row" style="margin:0">
            <label class="form-label">Difficulty</label>
            <!-- Bound on `slug`, not id — that is what questions.difficulty stores. -->
            <select class="form-input form-select" id="nqDifficulty"
            v-model="addForm.difficulty">
              <option v-for="d in difficultyList" :key="d.id" :value="d.slug">
                {{ d.name }}
              </option>
            </select>
          </div>
        </div>

      <!-- STEM -->
        <div class="form-row">
          <label class="form-label">Question Stem</label>
           <AppEditor v-model="addForm.question_stem"
            placeholder="A [age]-year-old [patient] presents with..."
           class="orm-input" />
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
        <AppEditor v-model="addForm.explanation"
       placeholder="Explain why the correct answer is correct and why each distractor is wrong..."
        class="orm-input" />

      </div>
        
      <div class="form-row" style="margin-bottom:20px">
          <label class="form-label">
          Reference 
          <span style="font-weight:400;font-size:0.72rem;color:var(--ink-dim)">(optional)</span>
          </label>
          <input class="form-input" id="nqRef" placeholder="e.g. First Aid 2025 p.284, UpToDate: Acute HF" 
          type="text"
          v-model="addForm.reference"/>
      </div>

      <!-- ACTIONS -->
      <div style="display:flex;gap:8px">

        <button class="btn btn-primary" 
        style="flex:1"
        @click="submitQuestion(false)">
          Save Draft
        </button>

        <button class="btn btn-outline" 
        @click="submitQuestion(true)">
          Publish
        </button>

        <button class="btn btn-outline"
         @click="closeModal">
          Cancel
        </button>

      </div>

    </div>
  </div>
</div>
</template>