// Text watermark helpers.
//
// The pipeline stores tales with a zero-width joiner (U+200D) after every 37th word. Showing that
// to everyone (and to crawlers) is bad for SEO and copy/paste, so the reader strips it from the
// rendered text and puts a fresh watermark back only into text that is copied to the clipboard.

const ZWJ = '‍'
const WORD_INTERVAL = 37

export const stripZwj = (s = '') => s.replace(/‍/g, '')

export function addZwj(text, interval = WORD_INTERVAL) {
  let n = 0
  return text.replace(/\S+/g, (word) => (++n % interval === 0 ? word + ZWJ : word))
}

// onCopy handler: replaces the plain-text clipboard payload with a watermarked copy.
export function watermarkOnCopy(e) {
  const el = e.target instanceof Element ? e.target : null
  if (el && el.closest('input, textarea, [contenteditable="true"]')) return // never touch form fields
  const selected = window.getSelection?.().toString()
  if (!selected || !e.clipboardData) return
  e.clipboardData.setData('text/plain', addZwj(selected))
  e.preventDefault()
}
