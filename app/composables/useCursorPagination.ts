// /composables/useCursorPagination.ts
import { ref, unref, type Ref } from 'vue'

type CursorPaginationOptions<T> = {
  limit?: number
  extraPayload?: Record<string, any> | Ref<Record<string, any>>
  immediate?: boolean
  clearOnError?: boolean
  dataKey?: string
  uniqueKey?: keyof T
  onSuccess?: (response: any) => void
  onError?: (error: any) => void
}

export const useCursorPagination = <T extends Record<string, any>>(
  endpoint: string,options: CursorPaginationOptions<T> = {}) => {
  const {
    limit = 50,
    extraPayload = {},
    immediate = false,
    clearOnError = false,
    dataKey = 'data',
    uniqueKey = 'id',
    onSuccess,
    onError
  } = options

  const { $api } = useNuxtApp()

  const data = ref<T[]>([]) as Ref<T[]>

  const loading = ref(false)
  const cursor = ref<string | number | null>(null)
  const hasMore = ref(true)
  const total = ref(0)
  const error = ref<any>(null)
  const meta = ref<Record<string, any>>({})

  /**
   * Merge unique items
   */
  const mergeUniqueData = (incoming: T[] = []) => {
    const existingIds = new Set(
      data.value.map((item) => item[uniqueKey])
    )

    const fresh = incoming.filter(
      (item) => !existingIds.has(item[uniqueKey])
    )

    data.value.push(...fresh)
  }

  /**
   * Main Fetch
   */
  const fetchData = async (
    overridePayload: Record<string, any> = {}
  ) => {
    if (!hasMore.value || loading.value) return null

    loading.value = true
    error.value = null

    try {
      const payload = {
        limit,
        starting_after: cursor.value,
        ...unref(extraPayload),
        ...overridePayload
      }

      const res: any = await $api.post(endpoint, payload)

      const obj = res?.data ?? {}

      meta.value = obj

      if (obj.status === 'success') {
        total.value = obj.total_data ?? 0

        const incoming = (obj[dataKey] ?? []) as T[]

        mergeUniqueData(incoming)

        cursor.value = obj.next_cursor ?? null
        hasMore.value = obj.has_more ?? false

        onSuccess?.(obj)
      } else {
        hasMore.value = false
      }

      return obj
    } catch (err: any) {
      error.value = err

      if (clearOnError) {
        reset()
      }

      onError?.(err)

      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Refresh from start
   */
  const refresh = async () => {
    reset()
    return await fetchData()
  }

  /**
   * Full reset
   */
  const reset = () => {
    data.value = []
    cursor.value = null
    hasMore.value = true
    total.value = 0
    error.value = null
    meta.value = {}
  }

  /**
   * Remove item
   */
  const removeItem = (id: string | number) => {
    data.value = data.value.filter(
      (item) => item[uniqueKey] !== id
    ) as T[]
  }

  /**
   * Update item
   */
  const updateItem = (
    id: string | number,
    updatedFields: Partial<T>
  ) => {
    const index = data.value.findIndex(
      (item) => item[uniqueKey] === id
    )

    if (index !== -1) {
      data.value[index] = {
        ...(data.value[index] as T),
        ...updatedFields
      } as T
    }
  }

  /**
   * Add item manually
   */
  const addItem = (item: T) => {
    const exists = data.value.some(
      (existing) =>
        existing[uniqueKey] === item[uniqueKey]
    )

    if (!exists) {
      data.value.unshift(item)
    }
  }

  /**
   * Auto fetch
   */
  if (immediate) {
    fetchData()
  }

  return {
    // state
    data,
    loading,
    cursor,
    hasMore,
    total,
    error,
    meta,

    // methods
    fetchData,
    refresh,
    reset,
    removeItem,
    updateItem,
    addItem
  }
}