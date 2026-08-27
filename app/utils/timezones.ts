// Full IANA list from the browser, common zones pinned on top
export const getTimezones = (): string[] => {
  const common = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Asia/Dubai',
    'Asia/Kolkata',
  ]
  const all =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : common
  return [...common, ...all.filter((tz) => !common.includes(tz))]
}

/*
 * ── Live time in a zone ─────────────────────────────────────────────────────
 *
 * The timezone dropdown lists ~420 raw IANA strings and nothing else, so picking
 * one is an act of faith: `America/Phoenix` and `America/Denver` look equally
 * plausible until you know one of them doesn't observe DST. Showing the current
 * time in the selected zone turns the choice into something the admin can verify
 * at a glance.
 *
 * Constructing an Intl.DateTimeFormat is the expensive part, not formatting with
 * it, so the formatters are cached per zone rather than rebuilt on every tick.
 */
const timeFmts = new Map<string, Intl.DateTimeFormat>()
const metaFmts = new Map<string, Intl.DateTimeFormat>()

function timeFmt(tz: string): Intl.DateTimeFormat {
  let f = timeFmts.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    timeFmts.set(tz, f)
  }
  return f
}

function metaFmt(tz: string): Intl.DateTimeFormat {
  let f = metaFmts.get(tz)
  if (!f) {
    // `shortOffset` ("GMT+1") is the one that behaves consistently across zones.
    // `short` gives "EST" for New York but still "GMT+2" for Johannesburg, which
    // reads as broken rather than helpful.
    try {
      f = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', timeZoneName: 'shortOffset',
      })
    } catch {
      f = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', timeZoneName: 'short',
      })
    }
    metaFmts.set(tz, f)
  }
  return f
}

/** Does the runtime know this zone? Guards against junk already saved in settings. */
export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/** Wall-clock time in that zone right now — `14:32:07`. */
export function timeIn(tz: string, at: Date = new Date()): string {
  try {
    return timeFmt(tz).format(at)
  } catch {
    return ''
  }
}

/**
 * Date + UTC offset in that zone right now — `Tue 12 Jul · GMT+1`.
 *
 * The DATE matters as much as the time: a zone far enough east or west is on a
 * different day, and an admin picking Asia/Tokyo from a London desk should see that
 * rather than discover it from a mis-scheduled email.
 *
 * DST is handled for free — Intl resolves the offset for the given instant, so this
 * says GMT+0 for London in January and GMT+1 in July.
 */
export function zoneMeta(tz: string, at: Date = new Date()): string {
  try {
    const parts = metaFmt(tz).formatToParts(at)
    const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''

    const date   = [get('weekday'), get('day'), get('month')].filter(Boolean).join(' ')
    const offset = get('timeZoneName')

    return [date, offset].filter(Boolean).join('  ·  ')
  } catch {
    return ''
  }
}
