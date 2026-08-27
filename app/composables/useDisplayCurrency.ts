/**
 * Display currency for the admin money screens (Payments, Dashboard, Analytics).
 *
 * Each market charges in its own LOCAL currency (PHP, CAD, AUD, ZAR, GBP, USD)
 * and Stripe settles into the account's receiving currency, SGD. Admins see
 * everything in the local currency by default, with a toggle to the receiving
 * (SGD) equivalent. The local currency + symbol are market-specific and come
 * from the backend (currency_code / currency_symbol) — never hardcoded — so the
 * CA admin shows C$, AU shows A$, etc.
 *
 *   - local (token 'PHP')  → the amount charged / catalogued, in the market symbol.
 *   - 'SGD'                → the receiving amount: the real settled figure from the
 *                            charge's balance transaction where available, else the
 *                            local figure converted at the backend-supplied rate.
 *
 * The choice is persisted in a cookie (readable during SSR, so no flash) and
 * shared app-wide via useState, mirroring useDarkMode. The internal token 'PHP'
 * means "local" (kept for back-compat with existing call sites); what the user
 * sees is driven by localCode / localSymbol.
 */
export type DisplayCurrency = 'PHP' | 'SGD'

const SETTLEMENT_SYMBOL = 'S$'
const SETTLEMENT_CODE = 'SGD'

export const useDisplayCurrency = () => {
  const cookie = useCookie<DisplayCurrency>('admin_pay_currency', {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  const currency = useState<DisplayCurrency>('adminPayCurrency', () =>
    cookie.value === 'SGD' ? 'SGD' : 'PHP'
  )

  // Market local currency, set from the backend response. Defaults keep PHP as a
  // safe fallback until the first API response arrives.
  const localCode = useState<string>('adminLocalCode', () => 'PHP')
  const localSymbol = useState<string>('adminLocalSymbol', () => '₱')
  const setLocal = (code?: string | null, symbol?: string | null) => {
    if (code) localCode.value = String(code).toUpperCase()
    if (symbol) localSymbol.value = String(symbol)
  }

  // The local→SGD rate (Stripe-applied or FX fallback), shared app-wide. Pages
  // set it from their API response so displayFromLocal() can convert to SGD.
  const rate = useState<number | null>('adminSettleRate', () => null)
  const setRate = (r: number | null | undefined) => {
    if (r !== null && r !== undefined && isFinite(Number(r))) rate.value = Number(r)
  }

  const setCurrency = (c: DisplayCurrency) => {
    currency.value = c
    cookie.value = c
  }

  // Active symbol/code for the current toggle position.
  const symbol = computed(() => (currency.value === 'SGD' ? SETTLEMENT_SYMBOL : localSymbol.value))
  const settlementSymbol = SETTLEMENT_SYMBOL
  const settlementCode = SETTLEMENT_CODE

  /** Format a numeric major-unit amount with the active symbol. */
  const format = (amount: number | string | null | undefined, decimals = 2): string => {
    if (amount === null || amount === undefined || amount === '') return '—'
    const n = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.-]/g, ''))
    if (!isFinite(n)) return '—'
    return symbol.value + n.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  /**
   * Pick the value to show for the active currency from a row that carries both a
   * local figure and a settlement (SGD) figure. Returns a ready-to-render string.
   * Amounts are major-unit numbers (or parseable strings). When SGD is requested
   * but unavailable for that row, returns '—'.
   */
  const pick = (
    localAmount: number | string | null | undefined,
    sgdAmount: number | string | null | undefined,
    decimals = 2,
  ): string => {
    return currency.value === 'SGD' ? format(sgdAmount, decimals) : format(localAmount, decimals)
  }

  /**
   * Convert a LOCAL-currency figure (a number, or a pre-formatted string like
   * "₱2,340"/"C$2,340" from the backend) into the active display currency. In
   * local mode it just re-formats with the market symbol; in SGD mode it
   * multiplies by the shared local→SGD rate and formats in S$ (or returns "—"
   * when the rate is unknown). Use for aggregates where only a local figure +
   * rate are known.
   */
  const displayFromLocal = (localValue: number | string | null | undefined, decimals = 0): string => {
    if (localValue === null || localValue === undefined || localValue === '') return '—'
    const n = typeof localValue === 'number'
      ? localValue
      : parseFloat(String(localValue).replace(/[^0-9.-]/g, ''))
    if (!isFinite(n)) return '—'
    if (currency.value === 'SGD') {
      if (rate.value === null) return '—'
      return format(n * rate.value, decimals)
    }
    return format(n, decimals)
  }

  return {
    currency, setCurrency, symbol, format, pick, rate, setRate, displayFromLocal,
    localCode, localSymbol, setLocal, settlementSymbol, settlementCode,
  }
}
