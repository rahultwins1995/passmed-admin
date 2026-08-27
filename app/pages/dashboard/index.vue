<script setup lang="ts">
import Empty from '@/components/loaders/Empty.vue'
import RevenueChart from '@/components/RevenueChart.vue'
import Loader_small from '@/components/loaders/Loader_small.vue'

import { ref, onMounted, computed,watch } from 'vue';
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const { $api,$toast } = useNuxtApp()

// Local-currency display (PHP) with a toggle to the receiving currency (SGD),
// matching the Payments screen. Currency figures route through displayFromLocal().
const { currency, setCurrency, displayFromLocal, setRate, setLocal, localCode, localSymbol } = useDisplayCurrency()

const data_loading = ref(false)
const details = ref<any>(null)

const total_user = ref("0")
const users_percentage = ref<any>("");

const total_revenue = ref<any>("$0");
const total_revenue_percentage = ref<any>("0%");

const active_subscriptions = ref<any>("");
const active_subscription_percentage = ref<any>("");

const mrr_count = ref<any>("");
const mrr_percentage = ref<any>("");
const churn_count = ref<any>("");
const churn_percentage = ref<any>("");
const arr_count = ref<any>("");
const arr_percentage = ref<any>("");
const ltv_count = ref<any>("");

// Currency-card displays: reformat the backend's local figure in the active
// currency (PHP as-is, or converted to SGD). Whole numbers, matching the design.
const revenueDisplay = computed(() => displayFromLocal(total_revenue.value, 0))
const mrrDisplay = computed(() => displayFromLocal(mrr_count.value, 0))
const arrDisplay = computed(() => displayFromLocal(arr_count.value, 0))
const ltvDisplay = computed(() => displayFromLocal(ltv_count.value, 0))

// KPI delta colour: 'up' (green) for a GOOD move, 'down' (red) for a BAD one,
// derived from the sign of the % (values come from the backend, e.g. "-93.1%").
// `inverted` metrics (churn) flip it — a rising value is bad. Replaces the old
// hardcoded "up" that painted every delta green, including rising churn.
const deltaClass = (pct: any, inverted = false): string => {
  const n = parseFloat(String(pct ?? '').replace(/[^0-9.\-]/g, '')) || 0
  return inverted ? (n <= 0 ? 'up' : 'down') : (n >= 0 ? 'up' : 'down')
}
const recent_signup = ref<any[]>([]);
const activities = ref<any[]>([]);
const subscriptionsByExam = ref<any[]>([]);
const monthlyrevenue = ref<any>({})

const auth = useAuthStore()

const selectedRange = ref<number|string>("1");

const fetchData = async () => {
  data_loading.value = true

  try {
    const res:any = await $api.post("/dashboard",{
        range:selectedRange.value
    })

    const obj:any = res.data;

    if (obj.status === 'success') {

        details.value = obj;

        monthlyrevenue.value = obj?.monthlyrevenue?? {
        months: [],
        board: [],
        shelf: []
        }

        total_user.value = obj?.total_user??"";

        users_percentage.value= obj?.users_percentage??'';

        setRate(obj?.php_sgd_rate);
        setLocal(obj?.currency_code, obj?.currency_symbol);
        total_revenue.value= obj?.total_revenue??"₱0";
        total_revenue_percentage.value= obj?.total_revenue_percentage??"0%";
        active_subscriptions.value= obj?.active_subscriptions??"0";
        active_subscription_percentage.value= obj?.active_subscription_percentage??'0%';

        mrr_count.value= obj?.mrr_count??"$0k";
        mrr_percentage.value= obj?.mrr_percentage??'0%';
        churn_count.value= obj?.churn_count??"$0k";
        churn_percentage.value= obj?.churn_percentage??'0%';
        arr_count.value= obj?.arr_count??"$0k";
        arr_percentage.value= obj?.arr_percentage??'0%';
        ltv_count.value= obj?.ltv_count??"$0k";
        recent_signup.value=obj?.recent_signup??[];
        activities.value=obj?.activities??[];
        subscriptionsByExam.value=obj?.subscriptionsByExam??[];

    } else {
        details.value = null;
        total_user.value ="0";
       
        users_percentage.value="0%";
        total_revenue.value="$0";
        total_revenue_percentage.value="0%";
        active_subscriptions.value="0";
        active_subscription_percentage.value="0%";
        mrr_count.value= "$0k";
        mrr_percentage.value="0%";
        churn_count.value="$0k";
        churn_percentage.value="0%";
        arr_count.value="$0k";
        arr_percentage.value="0%";
        ltv_count.value="$0k";
        recent_signup.value=[];
        activities.value=[];
        subscriptionsByExam.value=[];
        monthlyrevenue.value={};
    }

  } catch (err) {
       
         details.value = null;
        total_user.value ="0";
        
        users_percentage.value="0%";
        total_revenue.value="$0";
        total_revenue_percentage.value="0%";
        active_subscriptions.value="0";
        active_subscription_percentage.value="0%";
        mrr_count.value= "$0k";
        mrr_percentage.value="0%";
        churn_count.value="$0k";
        churn_percentage.value="0%";
        arr_count.value="$0k";
        arr_percentage.value="0%";
        ltv_count.value="$0k";
        recent_signup.value=[];
        activities.value=[];
        subscriptionsByExam.value=[];
        monthlyrevenue.value={};
 
  } finally {
    data_loading.value = false
  }
}

const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
};

const greeting = computed(() => {
  const hour = new Date().getHours()

  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
})

const userName = computed(() => {
  return auth.user?.name || 'Passmed'
})

const exportDashboard = () => {
  try {
    const d = monthlyrevenue.value

    if (!d || !d.months?.length) {
      $toast('No data to export','error')
      return
    }

    const period = Number(selectedRange.value || 6)

    const months = d.months.slice(-period)

    const rows: string[] = [
      'Month,Board Revenue,Shelf Revenue,Total Revenue'
    ]

    months.forEach((m: string, i: number) => {
      const idx = d.months.length - period + i

      const board = d.board?.[idx] ?? 0
      const shelf = d.shelf?.[idx] ?? 0
      const total = board + shelf

      rows.push([
        m,
        board,
        shelf,
        total
      ].join(','))
    })

    const csv = rows.join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `dashboard-${selectedRange.value}-months.csv`
    a.click()

    URL.revokeObjectURL(url)

  } catch (err:any) {
     $toast('Export error','error')
  }
}


const onViewAllUser=async ()=>{
    await navigateTo('/dashboard/users')
}

onMounted(() => {
    fetchData();
})

let timeout: any

watch(selectedRange, (val) => {
  clearTimeout(timeout)
  timeout = setTimeout(() => {
    fetchData();
  }, 300)
})

</script>

<template>
<div  class="dashwrap">
    <div class="section-hdr">
        <div class="section-hdr-left">
            <h2 id="dashGreeting">
                {{ greeting }} <em style="font-style:italic;color:var(--teal)">
                {{ userName }}</em>
            </h2>
            <p id="dashSubtitle">
                {{ formatDate(new Date()) }} — here's what's happening across your platform.
            </p>
        </div>
        <div class="section-hdr-right">
            <div style="display:flex;align-items:center;gap:6px">
                <div class="ccy-toggle" role="group" aria-label="Display currency">
                    <button type="button" class="ccy-btn" :class="{ active: currency === 'PHP' }"
                        :title="localCode" @click="setCurrency('PHP')">{{ localSymbol }}</button>
                    <button type="button" class="ccy-btn" :class="{ active: currency === 'SGD' }"
                        @click="setCurrency('SGD')" title="Receiving currency (SGD)">S$</button>
                </div>
                <select
                class="dashRangeSelect filter-input filter-select form-select btn-sm"
                style="font-size:0.8rem;padding:6px 28px 6px 10px;min-width:130px"
                 v-model="selectedRange">
                <option value="1">This Month</option>
                <option value="3">Last 3 Months</option>
                <option value="6">Last 6 Months</option>
                <option value="12">Last 12 Months</option>
                </select>

                <button class="btn btn-outline btn-sm"
                 type="button"
                 @click="exportDashboard">
                <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round"
                 stroke-width="2.5" viewBox="0 0 24 24" width="13">
                 <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                 <polyline points="7 10 12 15 17 10"></polyline>
                 <line x1="12" x2="12" y1="15" y2="3"></line>
                </svg>
                Export CSV
                </button>
            </div>
        </div>
    </div>
    <div class="stats-row">
        <div class="stat-card">
            <div class="stat-card-top">
                <div class="stat-icon green"><svg fill="none" height="17" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="17"><line x1="12" x2="12" y1="1" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"></path></svg></div>
                <span :class="['stat-delta', deltaClass(total_revenue_percentage)]">{{ total_revenue_percentage }}</span>
            </div>
            <div class="stat-num">{{revenueDisplay}}</div>
            <div class="stat-label">Total Revenue</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-top">
                <div class="stat-icon green"><svg fill="none" height="17" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="17"><rect height="16" rx="2" width="22" x="1" y="4"></rect><line x1="1" x2="23" y1="10" y2="10"></line></svg></div>
                <span :class="['stat-delta', deltaClass(active_subscription_percentage)]">{{ active_subscription_percentage }}</span>
            </div>
            <div class="stat-num">{{active_subscriptions}}</div>
            <div class="stat-label">Active Subscriptions</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-top">
                <div class="stat-icon amber"><svg fill="none" height="17" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="17"><line x1="12" x2="12" y1="1" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"></path></svg></div>
                <span :class="['stat-delta', deltaClass(mrr_percentage)]">{{mrr_percentage}}</span>
            </div>
            <div class="stat-num">{{mrrDisplay}}</div>
            <div class="stat-label">MRR</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-top">
                <div class="stat-icon teal">
                    <svg fill="none" height="17" stroke="currentColor" stroke-linecap="round"
                     stroke-width="2.5" viewBox="0 0 24 24" width="17">
                     <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
                     <circle cx="9" cy="7" r="4"></circle>
                    </svg>
                </div>
                <span :class="['stat-delta', deltaClass(users_percentage)]">{{ users_percentage }}</span>
            </div>
            <div class="stat-num">{{total_user}}</div>
            <div class="stat-label">Total Users</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-top">
                <div class="stat-icon red"><svg fill="none" height="17" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="17"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg></div>
                <span :class="['stat-delta', deltaClass(churn_percentage, true)]">{{churn_percentage}}</span>
            </div>
            <div class="stat-num">{{churn_count}}</div>
            <div class="stat-label">Churn Rate</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-top">
                <div class="stat-icon teal"><svg fill="none" height="17" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="17"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg></div>
                <span :class="['stat-delta', deltaClass(arr_percentage)]" id="dashArrDelta">{{arr_percentage}}</span>
            </div>
            <div class="stat-num" id="dashArr">{{arrDisplay}}</div>
            <div class="stat-label">ARR</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-top">
                <div class="stat-icon green">
            <svg fill="none" height="17" stroke="currentColor" stroke-linecap="round" 
            stroke-width="2.5" viewBox="0 0 24 24" width="17">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"></path>
            </svg>
        </div>
            </div>
            <div class="stat-num" id="dashLtv">{{ltvDisplay}}</div>
            <div class="stat-label">Avg LTV</div>
        </div>
    </div>
    <div class="two-col">
        <!-- Revenue chart -->
        <div class="card wrapRevenuechart">
            <div class="card-header">
                <div class="card-title">Monthly Revenue</div>
                <div id="dashRevLegend" style="display:flex;gap:12px;align-items:center">
                    <span style="font-size:0.72rem;color:var(--ink-dim);display:flex;align-items:center;gap:4px">
                        <span style="width:8px;height:8px;border-radius:2px;background:var(--teal);display:inline-block"></span>
                        Board</span>
                    <span style="font-size:0.72rem;color:var(--ink-dim);display:flex;align-items:center;gap:4px">
                    <span style="width:8px;height:8px;border-radius:2px;background:var(--amber);display:inline-block">
                    </span>
                    Shelf
                </span>
                </div>
            </div>
              <div  v-if="data_loading || !details" class="dashRevenueChart text-center">
                <Empty v-if="!data_loading && !details"/>
                <Loader_small v-else />
                </div> 
              <div v-else class="dashRevenueChart">
                <RevenueChart :chartData="monthlyrevenue" />
             </div> 
        </div>

        <!-- Exam breakdown -->
        <div class="card wrap-subscriptions">
            <div class="card-header">
                <div class="card-title">Subscriptions by Exam</div>
            </div>

            <div class="progress-row text-center" 
            v-if="data_loading || subscriptionsByExam.length === 0" >
                <Empty  v-if="!data_loading && subscriptionsByExam.length === 0"/>
                <Loader_small v-else/>
            </div>

            <div v-else class="progress-row" 
            v-for="(vl, key) in subscriptionsByExam" :key="key">
                <span class="progress-label">{{ vl?.name??'-' }}</span>
                <div v-if="vl.type === 'shelf'" class="progress-bar">
                    <div class="progress-fill fill-amber" 
                     :style="{ width: vl.percentage }">
                    </div>
                </div>
                <div v-else class="progress-bar">
                    <div class="progress-fill fill-teal"
                     :style="{ width: vl.percentage}">
                    </div>
                </div>

                <span class="progress-pct">{{ vl?.percentage??'-' }}</span>
            </div>

        </div>
    </div>
    <div class="two-col">
        <!-- Recent signups -->
        <div class="card">

            <div class="card-header">
                <div class="card-title">Recent Signups</div>
                <button class="card-action" 
                type="button"
                @click="onViewAllUser">
                 View all
                </button>
            </div>
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Plan</th>
                            <th>Exam</th>
                            <th>Joined</th>
                        </tr>
                    </thead>

                    <tbody 
                     v-if="data_loading || !details || recent_signup.length === 0">
                    <tr>
                    <td 
                    class="text-center" colspan="15">
                     <Empty  v-if="!data_loading && recent_signup.length === 0"/>
                    <Loader_small v-else/>
                    </td>
                    </tr>
                    </tbody>
                     <tbody v-else>
                        <tr v-for="(vl, i) in recent_signup" :key="i">
                            <td class="td-main">
                                {{ vl?.name??"-" }}
                            </td>
                            <td>
                            <span v-if="vl.type === 'shelf'" class="badge badge-green">
                            {{ vl?.plan??"-" }}
                            </span>
                            <span v-else-if="vl.type === 'board'" class="badge badge-teal">
                            {{ vl?.plan??"-" }}
                            </span>
                            <span v-else-if="vl.type === 'in-service-and-training'" class="badge badge-amber">
                            {{ vl?.plan??"-" }}
                            </span>
                            <span v-else class="badge badge-gray">

                            {{ vl?.plan??"-" }}
                            </span>
                        </td>
                            <td>
                                  {{ vl?.exam??"-" }}
                            </td>
                            <td style="font-family:'JetBrains Mono',monospace;font-size:0.75rem">
                                  {{ vl?.joined??"-" }}
                            </td>
                        </tr>
                       
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Activity feed -->

        <div class="card wrapActivitypage">
            <div class="card-header">
                <div class="card-title">
                    Activity Feed <span id="activityLive" style="display:inline-flex;align-items:center;gap:4px;font-size:0.65rem;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:1px;margin-left:6px"><span style="width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 2s infinite"></span>Live</span>
                </div>
            </div>

            <div id="activityFeed" class="text-center"
               v-if="data_loading || !details || activities.length === 0" >
                <Empty  v-if="!data_loading && activities.length === 0"/>
                <Loader_small v-else/>
            </div>

            <div v-else id="activityFeed">

                <div class="activity-item"
                 v-for="(vl, key) in activities" :key="key">
                        <div  v-if="vl.type === 'subscription'"
                        class="activity-dot" style="background:var(--green)"></div>
                        <div  v-else-if="vl.type === 'promo'"
                        class="activity-dot" style="background:var(--amber)"></div>
                         <div  v-else-if="vl.type === 'flag'"
                        class="activity-dot" style="background:var(--teal)"></div>
                        <div  v-else-if="vl.type === 'cancel'"
                        class="activity-dot" style="background:var(--red)"></div>
                        <div  v-else class="activity-dot" style="background:var(--border-hi)"></div>
                        
                        <div class="activity-text">
                            <strong>{{ vl?.title??'' }}</strong>
                            — {{ vl?.message ?? '' }}
                            <span v-if="vl.details">
                            ({{ vl.details }})
                            </span>
                        </div>
                        <div class="activity-time">
                            {{ vl.time }}
                        </div>
                </div>
               
            </div>
        </div>
    </div>
    </div>
</template>

<style scoped>
/* PHP / SGD display-currency switch (var()-driven so it follows dark mode). */
.ccy-toggle {
  display: inline-flex;
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm, 8px);
  overflow: hidden;
  background: var(--surface);
}
.ccy-btn {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--ink-dim);
  font-size: 0.78rem;
  font-weight: 700;
  padding: 6px 12px;
  cursor: pointer;
  line-height: 1;
  transition: background 0.15s ease, color 0.15s ease;
}
.ccy-btn + .ccy-btn { border-left: 1.5px solid var(--border); }
.ccy-btn:hover { color: var(--ink); }
.ccy-btn.active { background: var(--teal); color: #fff; }
</style>