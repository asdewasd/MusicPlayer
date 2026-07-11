import { ref, computed } from 'vue'

/**
 * 分页 composable
 * @param {Function} fetchFn - 获取数据的异步函数，接收 { page, pageSize } 参数
 * @param {number} pageSize - 每页条数
 */
export function usePagination(fetchFn, pageSize = 10) {
  const list = ref([])
  const page = ref(1)
  const total = ref(0)
  const loading = ref(false)
  const finished = ref(false)

  const totalPages = computed(() => Math.ceil(total.value / pageSize))
  const hasMore = computed(() => page.value < totalPages.value)

  async function fetchPage() {
    if (loading.value) return
    loading.value = true
    try {
      const result = await fetchFn({ page: page.value, pageSize })
      if (result) {
        list.value = result.list || result.data || result
        total.value = result.total || result.count || list.value.length
        finished.value = !hasMore.value
      }
    } catch (err) {
      console.error('分页加载失败:', err)
    } finally {
      loading.value = false
    }
  }

  async function nextPage() {
    if (!hasMore.value || loading.value) return
    page.value++
    await fetchPage()
  }

  async function prevPage() {
    if (page.value <= 1 || loading.value) return
    page.value--
    await fetchPage()
  }

  async function goToPage(p) {
    if (p < 1 || p > totalPages.value || p === page.value) return
    page.value = p
    await fetchPage()
  }

  return {
    list,
    page,
    total,
    totalPages,
    loading,
    finished,
    hasMore,
    fetchPage,
    nextPage,
    prevPage,
    goToPage,
  }
}