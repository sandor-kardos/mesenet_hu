// Analytics consent (opt-in). Microsoft Clarity records sessions and sets cookies, so it is only
// loaded after the visitor says yes. "No" (or no answer yet) means nothing is loaded or sent.
//
// Clarity consent API v2: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2

const KEY = 'mesenet-consent-v1' // 'granted' | 'denied' | (absent = not asked yet)
const CLARITY_ID = import.meta.env.VITE_CLARITY_ID || 'zbhbpe37bm'

let clarityLoaded = false

export function getConsent() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function store(value) {
  try {
    if (value === null) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, value)
  } catch {
    /* storage blocked: the choice just won't persist */
  }
  window.dispatchEvent(new Event('mesenet-consent'))
}

export function loadClarity() {
  if (clarityLoaded || typeof window === 'undefined') return
  clarityLoaded = true
  ;(function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments) }
    t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i + '?ref=bwt'
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y)
  })(window, document, 'clarity', 'script', CLARITY_ID)
  // Analytics only. We do not use advertising features.
  window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' })
}

// Call once at startup: loads Clarity only if consent was already given on an earlier visit.
export function initConsent() {
  if (getConsent() === 'granted') loadClarity()
}

export function acceptConsent() {
  store('granted')
  loadClarity()
}

export function declineConsent() {
  store('denied')
  eraseClarity()
}

// "Change my mind": forget the choice so the banner asks again, and stop tracking right away.
export function resetConsent() {
  store(null)
  eraseClarity()
}

function eraseClarity() {
  if (clarityLoaded && typeof window.clarity === 'function') {
    window.clarity('consent', false) // deletes Clarity cookies and stops tracking
  }
}
