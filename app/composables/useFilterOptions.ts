// composables/useFilterOptions.ts
import { ref, computed } from 'vue'

export const useFilterOptions = () => {
  const { $api } = useNuxtApp()

  const createFilterState = () => ({
    data: ref<any[]>([]),
    loading: ref(false),
    page: ref(1),
    hasMore: ref(true),
  })

  const fetchOptions = async (
    endpoint: string,
    state: ReturnType<typeof createFilterState>,
    limit = 2000,
    reset = false
  ) => {
    if (state.loading.value) return
    state.loading.value = true

    if (reset) {
      state.page.value = 1
      state.data.value = []
      state.hasMore.value = true
    }

    try {
      const res:any = await $api.post(endpoint, {
        page: state.page.value,
        limit,
      })

      const newData: any[] = res.data?.data ?? []

      if (newData.length === 0) {
        state.hasMore.value = false
        return
      }

      const existingIds = new Set(state.data.value.map((i: any) => i.id))
      const fresh = newData.filter((i: any) => !existingIds.has(i.id))
      state.data.value.push(...fresh)
      state.page.value++

    } catch {
      state.data.value = []
    } finally {
      state.loading.value = false
    }
  }

  const makeOptions = (
    state: ReturnType<typeof createFilterState>,
    allLabel: string,
    parms: any='all',
  ) => computed(() => [
      { id: parms, name: allLabel },
      ...state.data.value,
    ])
    
const attachScrollPagination = (
  selector: string,
  endpoint: string,
  state: ReturnType<typeof createFilterState>,
  limit: number
) => {
  setTimeout(() => {
    const el = document.querySelector(selector)
    if (!el) return

    el.addEventListener('scroll', async () => {
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10
      if (nearBottom && !state.loading.value && state.hasMore.value) {
        await fetchOptions(endpoint, state, limit)
      }
    })
  }, 500)
}

  return { createFilterState, fetchOptions, makeOptions,attachScrollPagination }
}