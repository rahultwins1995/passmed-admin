<script setup lang="ts">
//passmed-admin/app/pages/dashboard/payments/index.vue

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'
import Integrations from '@/components/settings/Integrations.vue'
import { ref, onMounted, computed,watch } from 'vue';

const { $api, $toast,$confirm } = useNuxtApp()

// Display currency: PHP (charging currency) by default, toggle to SGD (the
// account's receiving/settlement currency). All money on this page routes
// through pick()/format() so the toggle switches every figure at once.
const { currency, setCurrency, pick, setLocal, localCode, localSymbol } = useDisplayCurrency()

// Sub-tabs: transactions (default) | settings (Stripe config, moved from Settings → Integrations)
const payTab = ref('transactions')

const { formatDate } = useFormatDate()

type ProductType = {
  id: string
  product_name: string
  amount_formatted: string
  currency: string
  settlement_amount_formatted: string | null
  settlement_currency: string | null
  active: string
  created: number
}
const last_sync = ref<string | any>(null)
const {
  data: productsData,
  loading: data_loading,
  hasMore,
  total: total_data,
  fetchData
} = useCursorPagination<ProductType>(
  '/products',
  {
    limit: 50,
    onSuccess: (obj) => {
      last_sync.value = obj.last_sync ?? null
    }
  }
)

/* ── Products table sort (client-side, parity with the other admin tables) ──
   Products come from Stripe via cursor pagination, so we sort the loaded rows. */
const sortKey = ref<string>('')
const sortDir = ref<'asc' | 'desc'>('asc')
const sortBy = (key: string) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}
const sortArrow = (key: string) =>
  sortKey.value === key ? (sortDir.value === 'asc' ? '↑' : '↓') : '↕'

const sortedProducts = computed(() => {
  const rows = [...(productsData.value || [])]
  if (!sortKey.value) return rows
  const k = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return rows.sort((a: any, b: any) => {
    let av: any = a?.[k]
    let bv: any = b?.[k]
    if (k === 'amount_formatted') {
      av = parseFloat(String(av).replace(/[^0-9.]/g, '')) || 0
      bv = parseFloat(String(bv).replace(/[^0-9.]/g, '')) || 0
    } else if (k === 'created') {
      av = Number(av) || 0
      bv = Number(bv) || 0
    } else {
      av = String(av ?? '').toLowerCase()
      bv = String(bv ?? '').toLowerCase()
    }
    if (av < bv) return -1 * dir
    if (av > bv) return 1 * dir
    return 0
  })
})

const mrr_count = ref<any>("0");
const mrr_percentage = ref<any>("0");
const active_subscription_count = ref<any>("0");
const active_subscription_percentage = ref<any>("0");
const total_revenue = ref<any>("0");
const details=ref<any>(null);

// Raw numeric PHP + SGD totals from the backend, so the stat cards can switch
// currency without re-fetching. Null SGD => rate unknown, shows "—" in SGD view.
const mrr_php = ref<number | null>(null);
const mrr_sgd = ref<number | null>(null);
const total_revenue_php = ref<number | null>(null);
const total_revenue_sgd = ref<number | null>(null);
const revenue_month_php = ref<number | null>(null);
const revenue_month_sgd = ref<number | null>(null);
const revenue_this_month = ref<any>("₱0");

// Stat-card displays (whole numbers, matching the previous no-decimals style).
const mrrDisplay = computed(() =>
  mrr_php.value === null ? mrr_count.value : pick(mrr_php.value, mrr_sgd.value, 0)
);
const revenueDisplay = computed(() =>
  total_revenue_php.value === null ? total_revenue.value : pick(total_revenue_php.value, total_revenue_sgd.value, 0)
);
const revenueMonthDisplay = computed(() =>
  revenue_month_php.value === null ? revenue_this_month.value : pick(revenue_month_php.value, revenue_month_sgd.value, 0)
);

const fetchCountData = async () => {

  try {
    const res:any = await $api.get("/products/counts")
    const obj:any = res.data;
    if (obj.status === 'success') {
        details.value= obj;
        setLocal(obj?.currency_code, obj?.currency_symbol);
        mrr_count.value= obj?.mrr_count??"₱0";
        mrr_percentage.value= obj?.mrr_percentage??'0%';
        active_subscription_count.value= obj?.active_subscription_count??"0";
        active_subscription_percentage.value= obj?.active_subscription_percentage??'0%';
        total_revenue.value= obj?.total_revenue??"₱0";
        revenue_this_month.value= obj?.revenue_this_month??"₱0";
        mrr_php.value = obj?.mrr_php ?? null;
        mrr_sgd.value = obj?.mrr_sgd ?? null;
        total_revenue_php.value = obj?.total_revenue_php ?? null;
        total_revenue_sgd.value = obj?.total_revenue_sgd ?? null;
        revenue_month_php.value = obj?.revenue_this_month_php ?? null;
        revenue_month_sgd.value = obj?.revenue_this_month_sgd ?? null;

    } else {
         details.value=null;
        mrr_count.value= "₱0";
        mrr_percentage.value="0%";

        active_subscription_count.value= "0";
        active_subscription_percentage.value="0%";
        total_revenue.value= "₱0";
        mrr_php.value = null; mrr_sgd.value = null;
        total_revenue_php.value = null; total_revenue_sgd.value = null;
    }

  } catch (err) {
        details.value=null;
        mrr_count.value= "₱0";
        mrr_percentage.value="0%";
        active_subscription_count.value= "0";
        active_subscription_percentage.value="0%";
        total_revenue.value= "₱0";
        mrr_php.value = null; mrr_sgd.value = null;
        total_revenue_php.value = null; total_revenue_sgd.value = null;
  }
}

type TransactionType = {
  id: string
  customer: string
  product_name: string
  amount_formatted: string
  currency: string
  settlement_amount_formatted: string | null
  settlement_currency: string | null
  exchange_rate: number | null
  status: string
  created: number
}

const {
  data: transactionsData,
  loading: dataTransactionsloading,
  hasMore: hasTransactionsMore,
  total: totalTransactionsdata,
  fetchData: fetchTransactionsData
} = useCursorPagination<TransactionType>('/products/transactions',
  {
    limit: 50
  }
)

/**
 * Transactions Sorting
 */
const sortTransactionsKey = ref<string>('')
const sortTransactionsOrder = ref<'asc' | 'desc'>('asc')

const sortTransactionsBy = (key: string) => {
  if (sortTransactionsKey.value === key) {
    sortTransactionsOrder.value =
      sortTransactionsOrder.value === 'asc'
        ? 'desc'
        : 'asc'
  } else {
    sortTransactionsKey.value = key
    sortTransactionsOrder.value = 'asc'
  }
}

const sortedTransactionsDataList = computed(() => {
  if (!sortTransactionsKey.value) {
    return transactionsData.value
  }

  return [...transactionsData.value].sort((a: any, b: any) => {
    let valA: any = a[sortTransactionsKey.value] ?? ''
    let valB: any = b[sortTransactionsKey.value] ?? ''

    if (!isNaN(valA) && !isNaN(valB)) {
      valA = Number(valA)
      valB = Number(valB)
    } else {
      valA = String(valA).toLowerCase()
      valB = String(valB).toLowerCase()
    }

    if (valA < valB) {
      return sortTransactionsOrder.value === 'asc'
        ? -1
        : 1
    }

    if (valA > valB) {
      return sortTransactionsOrder.value === 'asc'
        ? 1
        : -1
    }

    return 0
  })
})
/* * Sorting END */

onMounted(async () => {
  await Promise.all([
    fetchCountData(),
    fetchData(),
    fetchTransactionsData()
  ])
})

</script>

<template>
<div class="dashwrap">
    <div class="section-hdr">
        <div class="section-hdr-left">
            <p>Stripe products · live pricing · failed payments</p>
        </div>
        <div class="section-hdr-right">
            <div class="ccy-toggle" role="group" aria-label="Display currency">
                <button type="button" class="ccy-btn" :class="{ active: currency === 'PHP' }"
                    :title="localCode" @click="setCurrency('PHP')">{{ localSymbol }}</button>
                <button type="button" class="ccy-btn" :class="{ active: currency === 'SGD' }"
                    @click="setCurrency('SGD')" title="Receiving currency (SGD)">S$</button>
            </div>
        </div>
    </div>

    <!-- Payments sub-tabs -->
    <div class="wrapSettingsTab" style="margin-bottom:16px">
      <button class="settings-nav-item" :class="{ active: payTab === 'transactions' }"
        @click="payTab = 'transactions'" type="button">Transactions</button>
      <button class="settings-nav-item" :class="{ active: payTab === 'settings' }"
        @click="payTab = 'settings'" type="button">Settings</button>
    </div>

    <div v-show="payTab === 'transactions'">
    <div class="stats-row" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">
        <div class="stat-card">
            <div class="stat-card-top">
                <div class="stat-icon green">
                    <svg fill="none" height="14" stroke="currentColor" 
                    stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="14">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                </div>
                <span class="stat-delta up">{{ mrr_percentage }}</span>
            </div>
            <div class="stat-num">{{ mrrDisplay }}</div>
            <div class="stat-label">MRR</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-top">
                <div class="stat-icon teal">
                    <svg fill="none" height="14" stroke="currentColor" stroke-linecap="round"
                     stroke-width="2.5" viewBox="0 0 24 24" width="14">
                     <line x1="12" x2="12" y1="1" y2="23"></line>
                     <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"></path>
                    </svg>
                    </div>
            </div>
            <div class="stat-num">{{ revenueMonthDisplay }}</div>
            <div class="stat-label">Revenue this month</div>
        </div>

        <div class="stat-card">
            <div class="stat-card-top">
                <div class="stat-icon amber">
                    <svg fill="none" height="14" stroke="currentColor" stroke-linecap="round"
                     stroke-width="2.5" viewBox="0 0 24 24" width="14">
                     <line x1="12" x2="12" y1="1" y2="23"></line>
                     <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"></path>
                    </svg>
                    </div>
            </div>
            <div class="stat-num">{{ revenueDisplay }}</div>
            <div class="stat-label">Total Revenue (all-time)</div>
        </div>
    </div>

    <div class="card" style="margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
            <div>
                <div style="font-size:0.78rem;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--ink-dim)">Stripe Products</div>
                <div style="font-size:0.72rem;color:var(--ink-dim);margin-top:2px">
                    Auto-synced from published exams · Last sync {{ last_sync }}</div>
            </div>
            <span id="stripeStatus" class="badge badge-green">Connected</span>
        </div>
        <div class="table-wrap">
            <table class="data-table" style="font-size:0.82rem">
                <thead>
                    <tr>
                        <th @click="sortBy('product_name')" style="cursor:pointer;user-select:none">Product <span style="opacity:0.5">{{ sortArrow('product_name') }}</span></th>
                        <th @click="sortBy('id')" style="cursor:pointer;user-select:none">Stripe ID <span style="opacity:0.5">{{ sortArrow('id') }}</span></th>
                        <th @click="sortBy('amount_formatted')" style="cursor:pointer;user-select:none">Price <span style="opacity:0.5">{{ sortArrow('amount_formatted') }}</span></th>
                        <th @click="sortBy('created')" style="cursor:pointer;user-select:none">Created At <span style="opacity:0.5">{{ sortArrow('created') }}</span></th>
                        <th @click="sortBy('active')" style="cursor:pointer;user-select:none">Status <span style="opacity:0.5">{{ sortArrow('active') }}</span></th>
                    </tr>
                </thead>

                <tbody v-if="productsData.length === 0">
                    <tr>
                        <td colspan="6">
                        <Empty />
                        </td>
                    </tr>
                </tbody>

                    <tbody v-else>
                    <tr v-for="item in sortedProducts" :key="item.id">
                        <td>
                            {{item?.product_name??'-' }}
                        </td>
                          <!-- STRIPE ID -->
                        <td style="font-family:'JetBrains Mono',monospace;font-size:0.68rem;color:var(--ink-dim)">
                        {{ item.id }}
                        </td>

                        <!-- AMOUNT (PHP, or SGD receiving-currency equivalent) -->
                        <td
                        :style="{
                            fontWeight: '700',
                            color: item.active === 'Live'
                            ? 'var(--green)'
                            : 'var(--amber)'
                        }"
                        >
                        {{ pick(item.amount_formatted, item.settlement_amount_formatted) }}
                        </td>

                        <!-- DATE -->
                        <td style="font-family:'JetBrains Mono',monospace;font-size:0.72rem">
                        {{ formatDate(item.created) }}
                        </td>
                        
                        <!-- STATUS -->
                        <td>
                        <span
                            class="badge"
                            :class="{
                            'badge-green': item.active === 'Live',
                            'badge-amber': item.active === 'Inactive',
                            }"
                        >
                            {{ item.active }}
                        </span>
                        </td>
                    </tr>
                    </tbody>
            </table>

        </div>
        <div style="margin-top:10px;font-size:0.75rem;color:var(--ink-dim)">
            <!-- Showing 1 of {{ productsData.length }} products  -->
            <div style="margin-top:15px;text-align:center">
                <Loader_small v-if="data_loading" />
                <button 
                v-if="hasMore && !data_loading"
                @click="fetchData"
                class="btn btn-outline btn-sm"
                >
                Load More
                </button>
              
            </div>
        </div>
    </div>

 
    <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
            <div style="font-size:0.78rem;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--ink-dim)">
                Recent Transactions
            </div>
        </div>

        <div class="table-wrap">
            <table class="data-table" style="font-size:0.82rem">
                <thead>
                    <tr>
                        <th @click="sortTransactionsBy('created')" 
                         style="cursor:pointer;user-select:none"
                         :style="{ opacity: sortTransactionsKey === 'created' ? 1 : 0.3 }" >
                         Date
                         <svg fill="none" height="10" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="10" style="margin-left:4px;opacity:0.4"><path d="M7 10l5-5 5 5M7 14l5 5 5-5"></path></svg></th>
                        <th @click="sortTransactionsBy('customer')" 
                            style="cursor:pointer;user-select:none"
                            :style="{ opacity: sortTransactionsKey === 'customer' ? 1 : 0.3 }">
                            User
                            <svg fill="none" height="10" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="10" style="margin-left:4px;opacity:0.4"><path d="M7 10l5-5 5 5M7 14l5 5 5-5"></path></svg></th>
                        <th style="cursor:pointer;user-select:none"
                        @click="sortTransactionsBy('product_name')"
                        :style="{ opacity: sortTransactionsKey === 'product_name' ? 1 : 0.3 }">
                            Product
                            <svg fill="none" height="10" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="10" style="margin-left:4px;opacity:0.4"><path d="M7 10l5-5 5 5M7 14l5 5 5-5"></path></svg></th>
                        <th 
                            style="cursor:pointer;user-select:none"
                             @click="sortTransactionsBy('amount_formatted')"
                        :style="{ opacity: sortTransactionsKey === 'amount_formatted' ? 1 : 0.3 }">
                        Amount
                        <svg fill="none" height="10" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="10" style="margin-left:4px;opacity:0.4"><path d="M7 10l5-5 5 5M7 14l5 5 5-5"></path></svg></th>
                        <th style="cursor:pointer;user-select:none"
                        @click="sortTransactionsBy('status')"
                        :style="{ opacity: sortTransactionsKey === 'status' ? 1 : 0.3 }">
                            Status
                        <svg fill="none" height="10" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="10" style="margin-left:4px;opacity:0.4"><path d="M7 10l5-5 5 5M7 14l5 5 5-5"></path></svg></th>
                        <th>Stripe ID</th>
                    </tr>
                </thead>
                <tbody v-if="transactionsData.length === 0">
                <tr>
                    <td colspan="6">
                    <Empty />
                    </td>
                </tr>
                </tbody>
                 <tbody v-else>
                    <tr v-for="item in sortedTransactionsDataList" :key="item.id">
                        <!-- DATE -->
                        <td style="font-family:'JetBrains Mono',monospace;font-size:0.72rem">
                        {{ formatDate(item.created) }}
                        </td>
                         <!-- CUSTOMER -->
                        <td class="td-main">
                        {{ item.customer || '-' }}
                        </td>

                        <td>{{item?.product_name||'-' }}</td>

                        <!-- AMOUNT (PHP charged, or real SGD settled amount) -->
                        <td
                        :style="{
                            fontWeight: '700',
                            color: item.status === 'succeeded'
                            ? 'var(--green)'
                            : item.status === 'requires_payment_method'
                            ? 'var(--amber)'
                            : 'var(--red)'
                        }"
                        >
                        {{ pick(item.amount_formatted, item.settlement_amount_formatted) }}
                        </td>

                         <!-- STATUS -->
                        <td>
                        <span
                            class="badge"
                            :class="{
                            'badge-green': item.status === 'succeeded',
                            'badge-amber': item.status === 'requires_payment_method',
                            'badge-red': item.status !== 'succeeded' && item.status !== 'requires_payment_method'
                            }"
                        >
                            {{ item.status }}
                        </span>
                        </td>

                          <!-- STRIPE ID -->
                        <td style="font-family:'JetBrains Mono',monospace;font-size:0.68rem;color:var(--ink-dim)">
                        {{ item.id }}
                        </td>
                    </tr>
                    </tbody>
            </table>
        </div>

        <div style="margin-top:10px;font-size:0.75rem;color:var(--ink-dim)">
            <!-- Showing 1 of {{ transactionsData.length }} Transactions  -->
            <div style="margin-top:15px;text-align:center">
                <Loader_small v-if="dataTransactionsloading" />
                <button 
                v-if="hasTransactionsMore && !dataTransactionsloading"
                @click="fetchTransactionsData"
                class="btn btn-outline btn-sm"
                >
                Load More
                </button>
            </div>
        </div>

    </div>
    </div><!-- /transactions tab -->

    <!-- Settings tab: Stripe configuration (moved here from Settings → Integrations) -->
    <div v-show="payTab === 'settings'">
      <Integrations :active-tab="payTab === 'settings' ? 'integrations' : ''" />
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
  padding: 7px 14px;
  cursor: pointer;
  line-height: 1;
  transition: background 0.15s ease, color 0.15s ease;
}
.ccy-btn + .ccy-btn {
  border-left: 1.5px solid var(--border);
}
.ccy-btn:hover {
  color: var(--ink);
}
.ccy-btn.active {
  background: var(--teal);
  color: #fff;
}
</style>