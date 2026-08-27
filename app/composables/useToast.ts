export const useToast = () => {
  return useState('global-toast', () => ({
    show: false,
    msg: '',
    type: 'success'
  }))
}