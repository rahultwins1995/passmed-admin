export default defineNuxtPlugin(() => {
  const toast = useToast()

  // Track the active auto-hide timer so a new toast resets it instead of
  // letting an earlier timer hide a newer message prematurely.
  let hideTimer: ReturnType<typeof setTimeout> | null = null

  const showToast = (
    message: string = 'Done',
    type: string = 'success'
  ) => {
    toast.value.msg = message
    toast.value.type = type
    toast.value.show = true

    if (hideTimer) clearTimeout(hideTimer)
    hideTimer = setTimeout(() => {
      toast.value.show = false
      hideTimer = null
    }, 5000)
  }

  return {
    provide: {
      toast: showToast
    }
  }
})