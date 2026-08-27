export default defineNuxtPlugin(() => {
  const confirmState = useConfirm()

  const base = {
    lable: false as string | false | null,
    input: false as string | false,
    inputValue: '',
    placeholder: '',
    options: [] as { label: string; value: string }[],
    required: false,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
  }

  // purana confirm — true/false return 
  const $confirm = (message: string, opts: Partial<typeof base> = {}) =>
    new Promise<boolean>((resolve) => {
      confirmState.value = {
        ...base, ...opts,
        show: true, message,
        resolve: resolve as (v: unknown) => void,
      }
    })

  //  prompt — input value or cancel  null return
  const $prompt = (message: string, opts: Partial<typeof base> = {}) =>
    new Promise<string | null>((resolve) => {
      confirmState.value = {
        ...base, ...opts,
        show: true, message,
        input: opts.input || 'text',   // default text input
        resolve: resolve as (v: unknown) => void,
      }
    })

  return { provide: { confirm: $confirm, prompt: $prompt } }
})