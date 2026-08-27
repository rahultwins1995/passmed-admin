interface ConfirmState {
  show: boolean
  message: string
  lable: string | false | null
  input: string | false // false = only confirm, 'text'/'textarea'/'select'/'email'/'number'/'password' = prompt
  inputValue: string
  placeholder: string
  options: { label: string; value: string }[]   // for select
  required: boolean
  confirmText: string
  cancelText: string
  resolve?: ((value: unknown) => void) | null
}

export const useConfirm = () => {
  return useState<ConfirmState>('global-confirm',() => ({
    show: false,
    message: '',
    lable: false,
    input: false,
    inputValue: '',
    placeholder: '',
    options: [],
    required: false,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    resolve: null,
  }))
}


