<script setup lang="ts">
//app\pages\dashboard\analytics\index.vue

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

import Multiselect from '@vueform/multiselect'
import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'
import Chart from 'chart.js/auto';
import { nextTick } from 'vue';
import { ref, onMounted,watch, computed } from 'vue';

const { $api, $toast,$confirm } = useNuxtApp()

// Local-currency (PHP) display with a receiving-currency (SGD) toggle, matching
// the Payments/Dashboard screens. Currency figures route through displayFromLocal().
const { currency, setCurrency, displayFromLocal, setRate, setLocal, localCode, localSymbol } = useDisplayCurrency()

const filter_exam_id = ref<any>("all");
const filter_exam_month = ref<any>("12");


const mrr_count = ref<any>("0");
const mrr_percentage = ref<any>("0");
 
const new_subscription_count = ref<any>("0");
const new_subscription_percentage = ref<any>("0");

const conversion_rate_count = ref("0")
const conversion_rate_percentage = ref<any>("0");

const churn_rate_count = ref<any>("0");
const churn_rate_percentage = ref<any>("0");

const arpu_count = ref<any>("0");
const arpu_percentage = ref<any>("0");

// Currency-card displays (PHP as-is, or converted to SGD when toggled).
const mrrDisplay = computed(() => displayFromLocal(mrr_count.value, 0))
const arpuDisplay = computed(() => displayFromLocal(arpu_count.value, 0))

const details=ref<any>(null);

const fetchCountData = async () => {

  data_loading.value = true

  try {
    const res:any = await $api.post("/analytics/counts",{
        range:selectedRange.value
    })

    const obj:any = res.data;

    if (obj.status === 'success') {

        details.value= obj;
        setRate(obj?.php_sgd_rate);
        setLocal(obj?.currency_code, obj?.currency_symbol);

        mrr_count.value= obj?.mrr_count??"$0k";
        mrr_percentage.value= obj?.mrr_percentage??'0%';

        new_subscription_count.value= obj?.new_subscription_count??"$0k";
        new_subscription_percentage.value= obj?.new_subscription_percentage??'0%';

        conversion_rate_count.value= obj?.conversion_rate_count??"$0k";
        conversion_rate_percentage.value= obj?.conversion_rate_percentage??'0%';

        churn_rate_count.value= obj?.churn_rate_count??"$0k";
        churn_rate_percentage.value= obj?.churn_rate_percentage??'0%';

        arpu_count.value= obj?.arpu_count??"$0k";
        arpu_percentage.value= obj?.arpu_percentage??'0%';

    } else {
         details.value=null;

        // Surface the REAL reason. Silently falling back to "$0k" everywhere is what
        // made a failing /analytics/counts look like "the backend has no analytics
        // data" — the endpoint returns its exception in `errmsg`.
        $toast(obj?.errmsg || obj?.msg || 'Failed to load analytics', 'error');

        mrr_count.value= "$0k";
        mrr_percentage.value="0%";

        new_subscription_count.value= "$0k";
        new_subscription_percentage.value="0%";

        conversion_rate_count.value= "$0k";
        conversion_rate_percentage.value="0%";

        churn_rate_count.value= "$0k";
        churn_rate_percentage.value="0%";

        arpu_count.value= "$0k";
        arpu_percentage.value="0%";
    }

  } catch (err:any) {

         details.value=null;

        // Same reason as the else-branch: don't swallow the failure. A 401/403/500 on
        // /analytics/counts used to render "$0k" everywhere with no clue why.
        $toast(
          err?.response?.data?.errmsg ||
          err?.response?.data?.msg ||
          'Failed to load analytics',
          'error'
        );

        mrr_count.value= "$0k";
        mrr_percentage.value="0%";

        new_subscription_count.value= "$0k";
        new_subscription_percentage.value="0%";

        conversion_rate_count.value= "$0k";
        conversion_rate_percentage.value="0%";

        churn_rate_count.value= "$0k";
        churn_rate_percentage.value="0%";

        arpu_count.value= "$0k";
        arpu_percentage.value="0%";

  }
}

const revenue_by_product = ref<any[]>([]);
const total_revenue = ref<any>("₱0");   // total paid revenue for the selected range
const revenueDisplay = computed(() => displayFromLocal(total_revenue.value, 0))
const plan_mix = ref<any[]>([]);
const daily_signups = ref<any>(null);

// The chart draws one bar per day (up to 30). Showing all 30 date labels in the
// footer is unreadable, so we thin them to ~7 evenly-spaced ticks (first + last
// always shown). Short ranges (7d / 12mo) show every label.
const signupTickStep = computed(() => {
  const n = daily_signups.value?.labels?.length || 0
  return n > 8 ? Math.ceil(n / 7) : 1
})
const showSignupTick = (i: number) => {
  const n = daily_signups.value?.labels?.length || 0
  return i % signupTickStep.value === 0 || i === n - 1
}


const data_loading = ref(false)
const fetchData = async () => {
  data_loading.value = true

  try {
    const res:any = await $api.post("/analytics",{
        range:selectedRange.value
    })

    const obj:any = res.data;

    if (obj.status === 'success') {

        revenue_by_product.value = obj?.revenue_by_product?? [];
        setRate(obj?.php_sgd_rate);
        setLocal(obj?.currency_code, obj?.currency_symbol);
        total_revenue.value = obj?.total_revenue ?? "₱0";
        plan_mix.value = obj?.plan_mix?? [];
        daily_signups.value = obj?.daily_signups ?? null;
    } else {
        revenue_by_product.value =[];
        total_revenue.value = "$0";
        plan_mix.value =[];
        daily_signups.value =null;
    }

  } catch (err) {
       
        revenue_by_product.value =[];
        total_revenue.value = "$0";
        plan_mix.value =[];
        daily_signups.value =null;
  } finally {
    data_loading.value = false
  }
}

const dataTrafficLoading=ref<boolean>(false);
const traffic_sources = ref<any[]>([]);
const fetchTrafficSources = async () => {
    dataTrafficLoading.value=true;
  try {
    const res: any = await $api.post('/analytics/traffic-sources', {  
       range:selectedRange.value
     })
    const obj:any = res.data;
    if (obj.status === 'success') {
        traffic_sources.value = obj?.data?? [];
    } else {
        traffic_sources.value =[];
    }

  } catch (err) {
        traffic_sources.value =[];
  } finally {
    dataTrafficLoading.value = false
  }
}
onMounted(()=>{
    fetchTrafficSources()
})

// ── Email delivery (Brevo webhook telemetry) ──────────────────────────────────
// Open rate / CTR / unsubscribes / bounces, aggregated server-side from the
// email_events table that the Brevo webhook fills. All-time by default.
const emailStats = ref<any>(null)
const emailStatsLoading = ref<boolean>(false)
const fetchEmailStats = async () => {
  emailStatsLoading.value = true
  try {
    const res:any = await $api.get('/analytics/email-stats')
    if (res?.data?.status === 'success') emailStats.value = res.data.data
  } catch {
    emailStats.value = null
  } finally {
    emailStatsLoading.value = false
  }
}
onMounted(()=>{ fetchEmailStats() })

// Cohort Retention filters (NEW)
const cohort_institution_id = ref<any>('all')
const cohort_month = ref<any>('all')


const dataCohortRetloading=ref<boolean>(false);
const cohort_retention = ref<any[]>([]);
const fetchCohortRetention = async () => {
    dataCohortRetloading.value=true;
  try {
    const res: any = await $api.post('/analytics/cohort-retention', {  
        institution_id: cohort_institution_id.value,
        cohort_month: cohort_month.value,
     })
    const obj:any = res.data;
    if (obj.status === 'success') {
        cohort_retention.value = obj?.data?? [];
    } else {
        cohort_retention.value =[];
    }

  } catch (err) {
        cohort_retention.value =[];
  } finally {
    dataCohortRetloading.value = false
  }
}

watch([cohort_institution_id, cohort_month], () => {
  fetchCohortRetention()
})

onMounted(()=>{
    fetchCohortRetention()
})

const cohort_options = ref<any[]>([])
const fetchcohortOptions = async () => {
  try {
    const res: any = await $api.get('/analytics/cohort-options')
    const obj = res.data
    if (obj.status === 'success') {
      cohort_options.value = obj?.data ?? [];
    }else{
        cohort_options.value = [];
    }
  } catch {
    cohort_options.value = [];
  }
}
onMounted(()=>{
    fetchcohortOptions()
})

const institutionOptions = ref<any[]>([{ id: 'all', name: 'All Institutions' }])
const fetchInstitutionsForCohort = async () => {
  try {
    const res: any = await $api.post('/analytics/institutions', { limit: 500, page: 1 })
    const obj = res.data
    if (obj.status === 'success') {
      const list = (obj.data || []).map((it: any) => ({
        id: it.institution_id ?? it.id,
        name: it.institution_name ?? it.name ?? '-',
      }))
      institutionOptions.value = [{ id: 'all', name: 'All Institutions' }, ...list]
    }
  } catch {
    institutionOptions.value = [{ id: 'all', name: 'All Institutions' }]
  }
}
onMounted(()=>{
    fetchInstitutionsForCohort()
})

const revenue_exam = ref<any[]>([]);
const dataRevenueExamloading=ref<boolean>(false);
const fetchRevenueExamData = async () => {
  dataRevenueExamloading.value = true

  try {
    const res:any = await $api.post("/analytics/revenue-exam",{
        range:selectedRange.value,
        exam_id:filter_exam_id.value,
        exam_month:filter_exam_month.value,
    })

    const obj:any = res.data;

    if (obj.status === 'success') {

        // Give every exam a distinct hue so same-category exams (e.g. IM/FM/EM Shelf)
        // don't all render in the same colour. Chart + legend both read exam.color.
        const palette = ['#06b6d4','#0e7490','#6d28d9','#10b981','#f59e0b','#ef4444',
                         '#3b82f6','#ec4899','#14b8a6','#8b5cf6','#f97316','#22c55e']
        const list = obj?.data ?? []
        if (Array.isArray(list[0])) {
          // Sort exams highest-revenue first so both the chart bars and the
          // legend read top → bottom (max → min). `total` is the scalar exam
          // total (total_revenue is the monthly series array). Colours are then
          // assigned in that sorted order.
          list[0] = [...list[0]]
            .sort((a:any, b:any) => Number(b?.total ?? 0) - Number(a?.total ?? 0))
            .map((exam:any, i:number) => ({ ...exam, color: palette[i % palette.length] }))
        }
        revenue_exam.value = list
        // Dynamic month labels for the selected window (6/12/24/all months).
        chartMonthLabels.value = Array.isArray(obj?.labels) ? obj.labels : []

    } else {
        revenue_exam.value =[];
    }

  } catch (err) {
       
        revenue_exam.value =[];
  } finally {
    dataRevenueExamloading.value = false
  }
}

const examData = ref<any[]>([]);
const dataExamloading=ref<boolean>(false);
const fetchExamData = async () => {
  dataExamloading.value = true

  try {
    const res:any = await $api.post("/exams/list",{
        range:selectedRange.value,
        exam_id:filter_exam_id.value,
        exam_month:filter_exam_month.value,
    })

    const obj:any = res.data;

    if (obj.status === 'success') {

        examData.value = obj?.data?? [];

    } else {
        examData.value =[];
    }

  } catch (err) {
       
        examData.value =[];
  } finally {
    dataExamloading.value = false
  }
}

const selectedRange = ref<number|string>("30d");

const onClickRange=(elemt:number|string='30d')=>{
     selectedRange.value = elemt;
}
const rangeLast = ref<string>("Last 30 days");
watch(selectedRange, (val)=>{

    if (val == '30d') {
          rangeLast.value= 'Last 30 Days';

    } else if(val == '90d') {
          rangeLast.value= 'Last 90 Days';
    }else{
          rangeLast.value= 'Last 12 Months';
    }

    triggerRef();
});

const exporting = ref(false)

/**
 * Export the WHOLE analytics report as a multi-sheet .xlsx — one sheet per
 * section, plus a "Report Info" sheet listing the filters used.
 *
 * It serialises the data the page has ALREADY fetched, so the file always matches
 * exactly what is on screen for the current Range / Exam / Institution filters —
 * no second copy of the aggregation logic, no drift.
 *
 * (Previously this wrote a 6-row CSV from `details`, which is null whenever
 * /analytics/counts errors — so it just said "No data to export" and every chart
 * and table on the page was left out entirely.)
 */
const exportAnalytics = async () => {
    if (exporting.value) return

    if (data_loading.value) {
        $toast('Analytics are still loading — try again in a moment.', 'error')
        return
    }

    // Daily signups is chart-shaped ({labels, data}) — flatten to real rows.
    const signupRows = (daily_signups.value?.labels || []).map((label: any, i: number) => ({
        Date: label,
        Signups: daily_signups.value?.data?.[i] ?? 0,
    }))

    const sections = [
        {
            title: 'Key Metrics',
            rows: [
                { Metric: 'MRR',              Value: mrr_count.value,               Change: mrr_percentage.value },
                { Metric: 'New Subscribers',  Value: new_subscription_count.value,  Change: new_subscription_percentage.value },
                { Metric: 'Conversion Rate',  Value: conversion_rate_count.value,   Change: conversion_rate_percentage.value },
                { Metric: 'Churn Rate',       Value: churn_rate_count.value,        Change: churn_rate_percentage.value },
                { Metric: 'ARPU',             Value: arpu_count.value,              Change: arpu_percentage.value },
            ],
        },
        { title: 'Revenue by Product', rows: revenue_by_product.value || [] },
        // revenue_exam.value is the wrapper [[...exams...]] (backend returns data:[exams]).
        // The chart reads [0]; the export must too — flatten the exam list to clean rows,
        // otherwise the section exported one nested "row" and showed nothing.
        { title: 'Revenue by Exam',    rows: (revenue_exam.value?.[0] || []).map((e:any) => ({
            Exam: e?.name ?? '—',
            'Total Revenue': e?.total_price ?? ('$' + (e?.total ?? 0)),
        })) },
        { title: 'Plan Mix',           rows: plan_mix.value           || [] },
        { title: 'Daily Signups',      rows: signupRows },
        { title: 'Traffic Sources',    rows: traffic_sources.value    || [] },
        { title: 'Cohort Retention',   rows: cohort_retention.value   || [] },
        {
            title: 'Email (Brevo)',
            rows: [
                { Metric: 'Sent',            Value: emailStats.value?.sent          ?? 0 },
                { Metric: 'Delivered',       Value: emailStats.value?.delivered     ?? 0 },
                { Metric: 'Opened',          Value: emailStats.value?.opened        ?? 0 },
                { Metric: 'Clicks',          Value: emailStats.value?.clicks        ?? 0 },
                { Metric: 'Unsubscribed',    Value: emailStats.value?.unsubscribed  ?? 0 },
                { Metric: 'Bounced',         Value: emailStats.value?.bounced       ?? 0 },
                { Metric: 'Spam',            Value: emailStats.value?.spam          ?? 0 },
                { Metric: 'Open Rate (%)',   Value: emailStats.value?.open_rate     ?? 0 },
                { Metric: 'Click Rate (%)',  Value: emailStats.value?.ctr           ?? 0 },
                { Metric: 'Unsub Rate (%)',  Value: emailStats.value?.unsub_rate    ?? 0 },
                { Metric: 'Bounce Rate (%)', Value: emailStats.value?.bounce_rate   ?? 0 },
            ],
        },
    ]

    // Everything the reader needs to know the file's scope.
    const meta: Record<string, any> = {
        'Range': rangeLast.value || selectedRange.value,
        'Revenue — Exam': examOptionLabel(filter_exam_id.value),
        'Revenue — Months': filter_exam_month.value,
        'Cohort — Institution': institutionOptionLabel(cohort_institution_id.value),
        'Cohort — Month': cohort_month.value,
    }

    exporting.value = true
    try {
        const res: any = await $api.post('/analytics/export', { meta, sections }, { responseType: 'blob' })
        const blob = res.data as Blob
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics-${new Date().toISOString().slice(0, 10)}.xlsx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 4000)
        $toast('Analytics exported', 'success')
    } catch (err: any) {
        $toast(err?.response?.data?.msg || 'Export failed — please try again.', 'error')
    } finally {
        exporting.value = false
    }
}

// Pretty labels for the Report Info sheet.
const examOptionLabel = (id: any) => {
    if (!id || id === 'all') return 'All Exams'
    const m = (examData.value || []).find((e: any) => String(e.id) === String(id))
    return m?.name ?? String(id)
}
const institutionOptionLabel = (id: any) => {
    if (!id || id === 'all') return 'All Institutions'
    const m = (institutionOptions.value || []).find((e: any) => String(e.id) === String(id))
    return m?.name ?? String(id)
}

const chartInstance = ref<any>(null)
// Fallback labels (12 months). The real labels come from the backend per the
// selected month window and are stored in chartMonthLabels.
const chartLabels = [
  "Apr","May","Jun","Jul","Aug","Sep",
  "Oct","Nov","Dec","Jan","Feb","Mar"
];
const chartMonthLabels = ref<string[]>([]);

const renderChart = () => {

    if (!revenue_exam.value || revenue_exam.value.length === 0) return;

    const canvas = document.getElementById('revenueChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (chartInstance.value) {
        chartInstance.value.destroy();
    }

    const apiData = revenue_exam.value[0] || [];

    const datasets = apiData.map((exam:any) => ({
        label: exam.name,
        data: exam.total_revenue,
        backgroundColor: exam.color,
        borderRadius: 6,
        borderSkipped: false,
        barThickness: 18,
        categoryPercentage: 0.6,
        barPercentage: 0.9
    }));

    const isSingle = datasets.length === 1;

    chartInstance.value = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: (chartMonthLabels.value && chartMonthLabels.value.length) ? chartMonthLabels.value : chartLabels,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false // 👈 custom legend use karenge
                },
                tooltip: {
                    backgroundColor: '#111827',
                    padding: 10,
                    titleColor: '#fff',
                    bodyColor: '#d1d5db',
                    callbacks: {
                        label: (ctx:any) => {
                            return `${ctx.dataset.label}: $${ctx.raw}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: !isSingle,
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#6b7280',
                        font: { size: 11 }
                    }
                },
                y: {
                    stacked: !isSingle,
                    grid: {
                        color: '#e5e7eb'
                    },
                    ticks: {
                        color: '#6b7280',
                        callback: (val:any) => '$' + val
                    }
                }
            }
        }
    });
};


const signupChartInstance = ref<any>(null);

const renderSignupChart = () => {

  if (!daily_signups.value || !daily_signups.value.data) return;

  const canvas = document.getElementById('signupChart') as HTMLCanvasElement;
  if (!canvas) return;

  if (signupChartInstance.value) {
    signupChartInstance.value.destroy();
  }

  const data = daily_signups.value.data;
  const labels = daily_signups.value.labels;

  signupChartInstance.value = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: data.map((_:any,i:any)=>
          i === data.length-1 ? '#06b6d4' : 'rgba(6,182,212,0.25)'
        ),
        borderRadius: 4,
        borderSkipped: false,
        barThickness: 14
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          callbacks:{
            label:(ctx:any)=>`Signups: ${ctx.raw}`
          }
        }
      },
      scales: {
        x: { display: false },
        y: { display: false }
      }
    }
  });
};

watch(daily_signups, async () => {
  await nextTick();
  renderSignupChart();
},{ deep: true });


watch([filter_exam_id,filter_exam_month], ()=>{
    fetchRevenueExamData();
});

onMounted(()=>{
    fetchCountData();
})

onMounted(()=>{
    fetchExamData();
})

onMounted(()=>{
    fetchData();
    fetchRevenueExamData();
})

const triggerRef=async()=>{
    fetchCountData();
    fetchData();
    fetchTrafficSources();
}


watch(revenue_exam,async () => {
     await nextTick();
  renderChart();
},{ deep: true });

</script>

<template>
<div class="dashwrap">
    <div class="section-hdr">
        <div class="section-hdr-left">
            <p id="analyticsSubtitle">{{rangeLast}} </p>
        </div>
        <div class="section-hdr-right" style="display:flex;align-items:center;gap:8px">
            <div class="ccy-toggle" role="group" aria-label="Display currency">
                <button type="button" class="ccy-btn" :class="{ active: currency === 'PHP' }"
                    :title="localCode" @click="setCurrency('PHP')">{{ localSymbol }}</button>
                <button type="button" class="ccy-btn" :class="{ active: currency === 'SGD' }"
                    @click="setCurrency('SGD')" title="Receiving currency (SGD)">S$</button>
            </div>
            <div style="display:flex;gap:4px;background:var(--surface);border:1.5px solid var(--border);border-radius:var(--r-sm);padding:3px">
                <button
                    class="aRangeBtn aRange-30"
                    :class="{active:selectedRange ==='30d'}"
               
                 type="button" style="padding:4px 10px;font-size:0.75rem"
                @click="onClickRange('30d')"
                 >
                 30d
                </button>

                <button class="aRangeBtn aRange-90" 
                :class="{active:selectedRange ==='90d'}"
                 type="button" style="padding:4px 10px;font-size:0.75rem;border:none"
                 @click="onClickRange('90d')">
                 90d
                </button>

                <button class="aRangeBtn aRange-365"
                :class="{active:selectedRange ==='12mo'}"
                 type="button" style="padding:4px 10px;font-size:0.75rem;border:none"
                 @click="onClickRange('12mo')">
                 12mo</button>
            </div>
            <button class="btn btn-outline btn-sm"
            type="button"
            :disabled="data_loading || exporting"
            title="Export the full report (all sections) for the current filters"
            @click="exportAnalytics">
            {{ data_loading ? 'Loading…' : (exporting ? 'Exporting…' : 'Export Report') }}
        </button>
        </div>
    </div>

    <!-- KPI stat cards -->
    <div class="stats-row">
        <div class="stat-card">
            <div class="stat-card-top">
                <div class="stat-icon amber"><svg fill="none" height="17" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="17"><line x1="12" x2="12" y1="1" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"></path></svg></div>
                <span
                    class="stat-delta up" id="aMrrDelta">{{ mrr_percentage }}</span>
            </div>
            <div class="stat-num" id="aMrr">{{ mrrDisplay }}</div>
            <div class="stat-label">MRR</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-top">
                <div class="stat-icon teal"><svg fill="none" height="17" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="17"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg></div>
                <span
                    class="stat-delta up" id="aSubsDelta">{{ new_subscription_percentage }}</span>
            </div>
            <div class="stat-num" id="aSubs">{{ new_subscription_count }}</div>
            <div class="stat-label">New Subscribers</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-top">
                <div class="stat-icon green">
                    <svg fill="none" height="17" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="17">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                    </svg>
                </div>
                <span class="stat-delta up" id="aConvDelta"> {{ conversion_rate_percentage }}</span>
                </div>
            <div class="stat-num" id="aConv">
                {{ conversion_rate_count }}
            </div>
            <div class="stat-label">Conversion Rate</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-top">
                <div class="stat-icon red">
                    <svg fill="none" height="17" stroke="currentColor" stroke-linecap="round" stroke-width="2.5"
                     viewBox="0 0 24 24" width="17">
                     <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                     <polyline points="17 18 23 18 23 12"></polyline>
                    </svg>
                    </div>
                <span
                    class="stat-delta down" id="aChurnDelta"> {{ churn_rate_percentage }}</span>
            </div>
            <div class="stat-num" id="aChurn">{{ churn_rate_count }}</div>
            <div class="stat-label">Churn Rate</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-top">
                <div class="stat-icon teal">
                    <svg fill="none" height="17" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" 
                    viewBox="0 0 24 24" width="17">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
                    </svg>
                </div>
                <span class="stat-delta up"
                    id="aArpuDelta"> {{ arpu_percentage }}</span>
                </div>
            <div class="stat-num" id="aArpu">{{ arpuDisplay }}</div>
            <div class="stat-label">ARPU</div>
        </div>
    </div>

    <!-- Email delivery (Brevo webhook telemetry) -->
    <div style="margin-top:6px">
        <div style="font-size:0.9rem;font-weight:600;margin:6px 2px">Email (Brevo)</div>
        <div v-if="emailStatsLoading" style="font-size:0.8rem;color:var(--ink-dim)">Loading…</div>
        <!-- Always render the cards (0 when there are no events yet) so this section
             matches the rest of the dashboard instead of a lone line of text. -->
        <div v-else class="stats-row">
            <div class="stat-card"><div class="stat-num">{{ emailStats?.sent ?? 0 }}</div><div class="stat-label">Sent</div></div>
            <div class="stat-card"><div class="stat-num">{{ emailStats?.delivered ?? 0 }}</div><div class="stat-label">Delivered</div></div>
            <div class="stat-card"><div class="stat-num">{{ emailStats?.open_rate ?? 0 }}%</div><div class="stat-label">Open Rate</div></div>
            <div class="stat-card"><div class="stat-num">{{ emailStats?.ctr ?? 0 }}%</div><div class="stat-label">Click Rate (CTR)</div></div>
            <div class="stat-card"><div class="stat-num">{{ emailStats?.unsub_rate ?? 0 }}%</div><div class="stat-label">Unsub Rate</div></div>
            <div class="stat-card"><div class="stat-num">{{ emailStats?.bounce_rate ?? 0 }}%</div><div class="stat-label">Bounce Rate</div></div>
        </div>
    </div>

    <!-- Revenue + Plan Mix -->
    <div class="two-col" style="margin-bottom:20px">
        <div class="card">
            <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;gap:10px">
                <div class="card-title">Revenue by Product</div>
                <div style="text-align:right">
                  <div style="font-size:1.15rem;font-weight:800;line-height:1.1">{{ revenueDisplay }}</div>
                  <div style="font-size:0.72rem;color:var(--ink-dim)">Total Revenue</div>
                </div>
            </div>

            <div  v-if="data_loading || revenue_by_product.length === 0" class="dashProductprogress">
                <Empty v-if="!data_loading &&  revenue_by_product.length === 0"/>
                <Loader_small v-else />
            </div> 

            <div v-else class="dashProductprogress">
                <div class="progress-row" v-for="(vl, i) in revenue_by_product" :key="i">

                    <span class="progress-label">{{ vl?.name??'-' }}</span>

                    <div class="progress-bar">
                        <div  v-if="vl.type === 'teal' || vl.type === 'board'"
                        class="progress-fill fill-teal" 
                        :style="{ width: vl?.percentage??'62%' }"></div>

                        <div  v-else-if="vl.type === 'amber'|| vl.type === 'in-service-and-training'"
                        class="progress-fill fill-amber" 
                        :style="{ width: vl?.percentage??'24%' }"></div>

                         <div  v-else-if="vl.type === 'shelf'"
                        class="progress-fill fill-green" 
                        :style="{ width: vl?.percentage??'14%' }"></div>
                        
                         <div  v-else
                        class="progress-fill fill-gray" 
                        :style="{ width: vl?.percentage??'0%' }"></div>

                    </div>

                    <span class="progress-pct">{{ vl?.price != null ? displayFromLocal(vl.price, 0) : '-' }}</span>
                </div>
            
             </div> 
        </div>

        <div class="card">
            <div class="card-header">
                <div class="card-title">Plan Mix</div>
            </div>

             <div  v-if="data_loading || plan_mix.length === 0" class="dashProductprogress">
                <Empty v-if="!data_loading &&  plan_mix.length === 0"/>
                <Loader_small v-else />
            </div> 
            <div v-else>
                <div class="progress-row" v-for="(vl, i) in plan_mix" :key="i">
                    <span class="progress-label">{{ vl?.name??'-' }}</span>
                        <div class="progress-bar">
                            <div  v-if="vl.type === 'teal' || vl.type === 'board'"
                            class="progress-fill fill-teal" 
                            :style="{ width: vl?.percentage??'58%' }"></div>

                            <div  v-else-if="vl.type === 'amber'|| vl.type === 'in-service-and-training'"
                            class="progress-fill fill-amber" 
                            :style="{ width: vl?.percentage??'24%' }"></div>

                            <div  v-else-if="vl.type === 'shelf'"
                            class="progress-fill fill-green" 
                            :style="{ width: vl?.percentage??'14%' }"></div>
                            
                            <div  v-else
                            class="progress-fill fill-gray" 
                            :style="{ width: vl?.percentage??'0%' }"></div>
                        </div>
                    <span class="progress-pct">{{ vl?.percentage??'-' }}</span>
                </div>

               
            </div>

        </div>
    </div>

    <!-- Daily Signups  side by side -->
    <div class="two-col" style="margin-bottom:20px">
        <div class="card">
            <div class="card-header">
            <div class="card-title">Daily Signups <span style="color:var(--ink-dim);font-weight:400">— {{ rangeLast }}</span></div>
            </div>

                <div v-if="data_loading || !daily_signups || !daily_signups.data?.length">
                <Empty  v-if="!data_loading && daily_signups?.data?.length"/>
                <Loader_small v-else  />
                </div>

                <div v-else>
                    <div class="spark-wrap">
                    <canvas id="signupChart"></canvas>
                    </div>
                    <div v-if="daily_signups?.labels?.length"
                    class="spark-footer">
                    <span v-for="(vl, i) in daily_signups.labels" :key="i">
                        {{ showSignupTick(i) ? vl : '' }}
                    </span>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">Traffic Sources</div>
                </div>
                <div v-if="dataTrafficLoading || traffic_sources.length === 0" class="trafficSources">
                    <Empty  v-if="!dataTrafficLoading && traffic_sources.length === 0"/>
                    <Loader_small v-else  />
                </div>

                <div v-else class="trafficSources">
                    <div class="progress-row" v-for="(vl, i) in traffic_sources" :key="i">
                        <span class="progress-label">{{ vl.name }}</span>
                        <div class="progress-bar">
                                <div  v-if="vl.type === 'teal' || vl.type === 'board'"
                                class="progress-fill fill-teal" 
                                :style="{ width: vl?.percentage??'62%' }"></div>

                                <div  v-else-if="vl.type === 'amber'|| vl.type === 'in-service-and-training'"
                                class="progress-fill fill-amber" 
                                :style="{ width: vl?.percentage??'24%' }"></div>

                                <div  v-else-if="vl.type === 'shelf'||vl.type === 'green'"
                                class="progress-fill fill-green" 
                                :style="{ width: vl?.percentage??'14%' }"></div>

                                <div  v-else
                                class="progress-fill fill-gray" 
                                :style="{ width: vl?.percentage??'0%' }"></div>
                            </div>
                        <span class="progress-pct">{{ vl.percentage }}</span>
                    </div>

                </div>
            </div>
    </div>

    <!-- Cohort Retention Table -->
    <div class="card" style="margin-bottom:20px">
       
        <div class="card-header" style="flex-wrap:wrap;gap:10px">
            <div>
                <div class="card-title">Cohort Retention</div>
                <span style="font-size:0.75rem;color:var(--ink-dim)">
                    % of cohort still active each month after signup
                </span>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <div class="filterselectinput filter-select" style="min-width:180px">
                    <Multiselect
                        class="multiInstitution-select-options"
                        placeholder="All Institutions"
                        v-model="cohort_institution_id"
                        :options="institutionOptions"
                        label="name"
                        valueProp="id"
                        :searchable="true"
                    />
                </div>
                <select class="filter-input form-select"
                    style="font-size:0.78rem;padding:5px 10px;min-width:140px"
                    v-model="cohort_month">
                    <option value="all">All Cohorts</option>
                    <option v-for="(c, i) in cohort_options" :key="i" :value="c.value">
                        {{ c.label }}
                    </option>
                </select>
            </div>
        </div>

        <div class="table-wrap">
            <table id="cohortTable" style="font-size:0.75rem">
                <thead>
                    <tr>
                        <th style="white-space:nowrap">Cohort</th>
                        <th style="text-align:center">M0</th>
                        <th style="text-align:center">M1</th>
                        <th style="text-align:center">M2</th>
                        <th style="text-align:center">M3</th>
                        <th style="text-align:center">M4</th>
                        <th style="text-align:center">M5</th>
                        <th style="text-align:center">M6</th>
                    </tr>
                </thead>
                  <tbody 
                     v-if="dataCohortRetloading || cohort_retention.length === 0">
                    <tr>
                    <td 
                    class="text-center" colspan="15">
                     <Empty  v-if="!dataCohortRetloading && cohort_retention.length === 0"/>
                    <Loader_small v-else/>
                    </td>
                    </tr>
                </tbody>
                 <tbody v-else>
                        <tr v-for="(vl, i) in cohort_retention" :key="i">
                           
                        <td style="font-size:0.72rem;font-family:JetBrains Mono,monospace;white-space:nowrap;padding:6px 10px">
                           {{ vl?.month??"-" }}
                        </td>
                            <td v-if="vl.m0" style="text-align:center;background:rgba(6,182,212,0.12);color:var(--teal-mid);font-weight:700;border-radius:4px;padding:6px 10px">
                                {{ vl?.m0??"-" }}
                            </td>
                            <td v-else style="text-align:center;color:var(--border)">—</td> 

                            <td v-if="vl.m1" style="text-align:center;background:rgba(16,185,129,0.12);color:var(--green);font-weight:700;border-radius:4px;padding:6px 10px">
                              {{ vl?.m1??"-" }}
                            </td>
                            <td v-else style="text-align:center;color:var(--border)">—</td> 

                            <td v-if="vl.m2" style="text-align:center;background:rgba(245,158,11,0.12);color:var(--amber);font-weight:700;border-radius:4px;padding:6px 10px">
                               {{ vl?.m2??"-" }}
                            </td>
                            <td v-else style="text-align:center;color:var(--border)">—</td> 

                            <td  v-if="vl.m3" style="text-align:center;background:rgba(245,158,11,0.12);color:var(--amber);font-weight:700;border-radius:4px;padding:6px 10px">
                                {{ vl?.m3??"-" }}
                            </td>
                            <td v-else style="text-align:center;color:var(--border)">—</td> 

                            <td  v-if="vl.m4"  style="text-align:center;background:rgba(245,158,11,0.12);color:var(--amber);font-weight:700;border-radius:4px;padding:6px 10px">
                               {{ vl?.m4??"-" }}
                            </td>
                            <td v-else style="text-align:center;color:var(--border)">—</td> 

                            <td  v-if="vl.m5" style="text-align:center;background:rgba(239,68,68,0.08);color:var(--red);font-weight:700;border-radius:4px;padding:6px 10px">
                               {{ vl.m5 }}
                            </td>
                            <td v-else style="text-align:center;color:var(--border)">—</td> 

                            <td v-if="vl.m6" style="text-align:center;background:rgba(239,68,68,0.08);color:var(--red);font-weight:700;border-radius:4px;padding:6px 10px">
                                {{ vl.m6 }}
                            </td>
                            <td v-else style="text-align:center;color:var(--border)">—</td>  
                        </tr>
                       
                    </tbody>

               
            </table>
        </div>
    </div>

    <!-- Revenue by Exam Bar Chart -->
    <div class="card">
        <div class="card-header" style="flex-wrap:wrap;gap:10px">
            <div class="card-title">Revenue by Exam — Monthly</div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <select class="filter-input form-select"
                id="chartExamFilter" style="font-size:0.78rem;padding:5px 10px;min-width:140px"
                v-model="filter_exam_id">
                <option value="all">All Exams</option>
                <option v-for="(vl, i) in examData" 
                :key="i"
                 :value="vl.id">
                {{ vl?.name??"-" }}
                </option>
                </select>

                <select class="filter-input form-select" 
                 id="chartPeriodFilter" style="font-size:0.78rem;padding:5px 10px"
                 v-model="filter_exam_month">
                <option value="all">All</option>
                <option value="6">Last 6 Months</option>
                <option value="12">Last 12 Months</option>
                <option value="24">Last 24 Months</option>
                </select>
            </div>
        </div>

            <div v-if="dataRevenueExamloading || revenue_exam.length === 0">
                <Empty  v-if="!dataRevenueExamloading && revenue_exam.length === 0"/>
                <Loader_small v-else  />
            </div>
            <div v-else>
                <div style="position:relative;height:260px;padding:8px 0 32px">
                    <canvas id="revenueChart" width="987" height="260"></canvas>
                </div>
                <div id="chartLegend" class="chart-legend">
                <div  v-for="(exam, i) in revenue_exam[0]" 
                    :key="i"
                    class="legend-item"
                    >
                    <span  class="legend-color"
                    :style="{ background: exam.color }"
                    ></span>
                    <span class="legend-label">{{ exam.name }}</span>
                </div>
                </div>
           </div>
    </div>

</div>
</template>

<style scoped>
/* PHP / SGD display-currency switch (var()-driven so it follows dark mode). */
.ccy-toggle { display:inline-flex; border:1.5px solid var(--border); border-radius:var(--r-sm,8px); overflow:hidden; background:var(--surface); }
.ccy-toggle .ccy-btn { appearance:none; border:0; background:transparent; color:var(--ink-dim); font-size:0.78rem; font-weight:700; padding:6px 12px; cursor:pointer; line-height:1; transition:background .15s ease,color .15s ease; }
.ccy-toggle .ccy-btn + .ccy-btn { border-left:1.5px solid var(--border); }
.ccy-toggle .ccy-btn:hover { color:var(--ink); }
.ccy-toggle .ccy-btn.active { background:var(--teal); color:#fff; }
</style>

<style>
.chart-legend{
  display:flex;
  flex-wrap:wrap;
  gap:12px;
  padding:10px 6px 4px;
  font-size:12px;
}

.legend-item{
  display:flex;
  align-items:center;
  gap:6px;
  cursor:pointer;
  transition:0.2s;
}

.legend-item:hover{
  opacity:0.7;
}

.legend-color{
  width:10px;
  height:10px;
  border-radius:2px;
  flex-shrink:0;
}

.legend-label{
  color:#6b7280;
}

.spark-wrap{
  height:70px;
  padding:10px 0;
}

.spark-footer{
  display:flex;
  justify-content:space-between;
  font-size:11px;
  color:#6b7280;
  font-family: 'JetBrains Mono', monospace;
}
</style>