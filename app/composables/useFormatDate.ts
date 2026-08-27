export const useFormatDate = () => {
  const { timezone } = useAppTimezone()

  /**
   * Format a date/time for DISPLAY in the configured admin timezone.
   *
   * Handles two very different inputs correctly:
   *  - number  -> Unix timestamp (Stripe etc). Seconds are converted to ms,
   *               then shown in the configured zone. These are true UTC, so
   *               timezone conversion is meaningful.
   *  - string  -> backend datetime like "2026-05-02 15:30:00" (NO zone info).
   *               We treat it as already-in-server-zone wall-clock time and
   *               DO NOT re-shift it, otherwise it would jump hours. It is just
   *               reformatted to a nice human string.
   */
  const formatDate = (
    value: string | number | Date,
    opts: Intl.DateTimeFormatOptions = {}
  ) => {
    if (!value) return '-'

    // ---- numeric timestamp (Stripe / Unix) : real UTC, safe to convert ----
    if (typeof value === 'number') {
      const date = new Date(value < 1e12 ? value * 1000 : value)
      if (isNaN(date.getTime())) return '-'
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone.value,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        ...opts,
      }).format(date)
    }

    // ---- string / Date : backend wall-clock, format without re-shifting ----
    // Normalise "YYYY-MM-DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM:SS" so it parses,
    // but keep it in LOCAL interpretation (no timeZone option) to avoid jumps.
    const raw = value instanceof Date ? value : new Date(String(value).replace(' ', 'T'))
    if (isNaN(raw.getTime())) return '-'
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      ...opts,
    }).format(raw)
  }

  /**
   * DATE-ONLY display (no time). Same no-reshift rule for strings.
   * e.g. formatDateOnly("2026-05-02 15:30:00") -> "May 2, 2026"
   */
  const formatDateOnly = (value: string | number | Date) => {
    return formatDate(value, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: undefined,
      minute: undefined,
      second: undefined,
    })
  }

  return { formatDate, formatDateOnly }
}
