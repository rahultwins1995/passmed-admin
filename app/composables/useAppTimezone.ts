
export const useAppTimezone = () => {
  // App-wide shared timezone state
  const timezone = useState<string>('app-timezone', () => 'UTC')

  // Load configured timezone from /settings (same API as GeneralSettings)
  const loadTimezone = async () => {
    const { $api } = useNuxtApp()
    try {
      const res: any = await $api.get('/settings')
      if (res.data.status === 'success' && res.data.data?.timezone) {
        timezone.value = res.data.data.timezone
      }
    } catch (e) {
      // fallback stays 'UTC'
    }
  }

  return { timezone, loadTimezone }
}