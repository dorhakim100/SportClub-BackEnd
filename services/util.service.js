export function makeId(length = 5) {
  var txt = ''
  var possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < length; i++) {
    txt += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return txt
}

export function debounce(func, timeout = 300) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      func.apply(this, args)
    }, timeout)
  }
}

export function getRandomInt(min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function generateRandomName() {
  const names = [
    'Jhon',
    'Wick',
    'Strong',
    'Dude',
    'Yep',
    'Hello',
    'World',
    'Power',
    'Goku',
    'Super',
    'Hi',
    'You',
    'Are',
    'Awesome',
  ]
  const famName = [
    'star',
    'kamikaza',
    'family',
    'eat',
    'some',
    'banana',
    'brock',
    'david',
    'gun',
    'walk',
    'talk',
    'car',
    'wing',
    'yang',
    'snow',
    'fire',
  ]
  return (
    names[Math.floor(Math.random() * names.length)] +
    famName[Math.floor(Math.random() * names.length)]
  )
}

export function generateRandomImg() {
  //try to get diff img every time
  return 'pro' + Math.floor(Math.random() * 17 + 1) + '.png'
}

export function timeAgo(ms = new Date()) {
  const date = ms instanceof Date ? ms : new Date(ms)
  const formatter = new Intl.RelativeTimeFormat('en')
  const ranges = {
    years: 3600 * 24 * 365,
    months: 3600 * 24 * 30,
    weeks: 3600 * 24 * 7,
    days: 3600 * 24,
    hours: 3600,
    minutes: 60,
    seconds: 1,
  }
  const secondsElapsed = (date.getTime() - Date.now()) / 1000
  for (let key in ranges) {
    if (ranges[key] < Math.abs(secondsElapsed)) {
      const delta = secondsElapsed / ranges[key]
      let time = formatter.format(Math.round(delta), key)
      if (time.includes('in')) {
        time = time.replace('in ', '')
        time = time.replace('ago', '')
        time += ' ago'
      }
      return time //? time : 'Just now'
    }
  }
}

export function randomPastTime() {
  const HOUR = 1000 * 60 * 60
  const DAY = 1000 * 60 * 60 * 24
  const WEEK = 1000 * 60 * 60 * 24 * 7

  const pastTime = getRandomIntInclusive(HOUR, WEEK)
  return Date.now() - pastTime
}

export function convertToDate(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number) // Split and convert to numbers
  const now = new Date() // Get the current date
  now.setHours(hours, minutes, 0, 0) // Set hours, minutes, and reset seconds and milliseconds
  return now
}

export function normalizeDateToYMD(dateLike) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike)
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date')
  // Use UTC to reliably normalize ISO strings like "2026-03-19T17:43:26.175Z"
  return d.toISOString().slice(0, 10)
}


export function formatSlotDate(dateValue, isEnglish = false) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue)

  if (Number.isNaN(date.getTime())) return ''

  const hebrewDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
  const englishDays = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ]

  const dayName = isEnglish
    ? englishDays[date.getDay()]
    : hebrewDays[date.getDay()]
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')

  return `${dayName}, ${day}/${month}`
}

export function formatSlotTimeRange(fromValue, toValue) {
  const from = formatTimeValue(fromValue)
  const to = formatTimeValue(toValue)
  if (!from && !to) return ''
  return `${from} - ${to}`.trim()
}


export function formatTimeValue(timeValue) {
  if (!timeValue) return ''

  // Keep already-formatted values such as "09:00".
  if (typeof timeValue === 'string' && /^\d{2}:\d{2}$/.test(timeValue)) {
    return timeValue
  }

  const parsedDate = timeValue instanceof Date ? timeValue : new Date(timeValue)
  if (Number.isNaN(parsedDate.getTime())) return ''

  const hours = String(parsedDate.getHours()).padStart(2, '0')
  const minutes = String(parsedDate.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}