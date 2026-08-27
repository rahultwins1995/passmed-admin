<script setup lang="ts">
const props = defineProps<{
  page?: number
  totalPages?: number
  totalData?: string|number
  pageSize?: number
  elmntName?: string
}>()

const emit = defineEmits<{
  (e: 'update:page', value: number): void
}>()

// Rows-per-page: prefer an explicit pageSize; otherwise recover it from
// totalPages = ceil(total / limit). Lets every caller get a correct item range
// even when it doesn't pass the limit through.
const perPage = computed(() => {
  const total = Number(props.totalData ?? 0)
  if (props.pageSize && props.pageSize > 0) return props.pageSize
  const tp = props.totalPages ?? 1
  return tp > 0 ? Math.ceil(total / tp) : total
})

// Item range shown on the current page: "1–20 of 1948" (of the FILTERED total).
const totalCount = computed(() => Number(props.totalData ?? 0))
const rangeFrom = computed(() =>
  totalCount.value === 0 ? 0 : ((props.page ?? 1) - 1) * perPage.value + 1)
const rangeTo = computed(() =>
  Math.min((props.page ?? 1) * perPage.value, totalCount.value))

const nextPage = () => {
  if ((props.page ?? 1) < (props.totalPages ?? 1)) {
    emit('update:page', (props.page ?? 1) + 1)
  }
}

const prevPage = () => {
  if ((props.page ?? 1) > 1) {
    emit('update:page', (props.page ?? 1) - 1)
  }
}
</script>

<template>
  <div class="paginationWrap">
    <div class="navtotalCount">
      Showing {{ rangeFrom }}–{{ rangeTo }} of {{ totalCount }} {{ elmntName ?? '' }}
    </div>

    <div class="ulpagination">
      <button
        @click="prevPage"
        class="PrevPagebtn btn btn-outline btn-sm"
        :class="{ disabled: (page ?? 1) === 1 }"
        type="button"
        :disabled="(page ?? 1) === 1"
      >
        ← Prev
      </button>

      <span class="page-item">
        Page {{ page ?? 1 }} of {{ totalPages ?? 1 }}
      </span>

      <button
        @click="nextPage"
        class="NextPagebtn btn btn-outline btn-sm"
        :class="{ disabled: (page ?? 1) === (totalPages ?? 1) }"
        type="button"
        :disabled="(page ?? 1) === (totalPages ?? 1)"
      >
        Next →
      </button>
    </div>
  </div>
</template>