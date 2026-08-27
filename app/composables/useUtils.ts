import { ref } from 'vue'

export function useUtils() {

  // =====================
  // TOAST
  // =====================
  const toastMsg = ref('')
  const show = ref(false)
  let timer: any = null

  const showToast = (msg: string) => {
    toastMsg.value = msg
    show.value = true

    clearTimeout(timer)
    timer = setTimeout(() => {
      show.value = false
    }, 2800)
  }

  // =====================
  // EXPORT CSV
  // =====================
  const exportUsersCSV = (users: any[], selectedOnly = false) => {

    let rows = selectedOnly
      ? users.filter(u => u.selected)
      : users

    const csv = [
      'Name,Email,Level,Grad Year,Institution,Exam,Plan,Status,Expires,Revenue'
    ]

    rows.forEach((u: any) => {
      const row = [
        u.name || '',
        u.email || '',
        u.role || '',
        u.gradyr || '',
        u.inst || '',
        u.exam || '',
        u.plan || '',
        u.status == 1 ? 'Active' : 'Inactive',
        u.expires || '',
        '$' + (u.revenue || '0')
      ].map(v => `"${String(v).replace(/"/g, '""')}"`)

      csv.push(row.join(','))
    })

    const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = 'passmed-users.csv'
    a.click()

    URL.revokeObjectURL(url)

    showToast(`Exported ${rows.length} users`)
  }

  return {
    toastMsg,
    show,
    showToast,
    exportUsersCSV
  }
}