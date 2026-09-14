'use client'

import { useEffect } from 'react'

/**
 * Forces the current Dr Sales Direct logo onto the Lucky Orange chat widget.
 *
 * The widget's avatar image comes from the Lucky Orange account settings,
 * which still hold the old-site logo. The widget renders in an about:blank
 * iframe (#lo-messenger-frame), which is same-origin with this page — so we
 * can inject a stylesheet that swaps the avatar for /logo.png regardless of
 * what the account serves. Harmless no-op if the widget isn't present, and
 * redundant (but not conflicting) once the dashboard image is updated.
 */
export default function LuckyOrangeBrandFix() {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_LUCKY_ORANGE_SITE_ID) return
    const STYLE_ID = 'dsd-lo-brand-fix'
    const css = `
      .ui-image.avatar-image {
        background-image: url('${window.location.origin}/logo.png') !important;
        background-color: #ffffff !important;
        background-size: 80% auto !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
      }
      /* whether the old logo is a background or a child <img>, hide it */
      .ui-image.avatar-image > img, .ui-image.avatar-image > picture { opacity: 0 !important; }
      .ui-avatar .avatar-icon { visibility: hidden !important; }
    `
    // The iframe appears (and can be re-created) after arbitrary delays, so
    // keep a light watchdog that re-injects whenever the style is missing.
    const tick = () => {
      for (const frameId of ['lo-messenger-frame', 'lo-frame-core']) {
        const frame = document.getElementById(frameId) as HTMLIFrameElement | null
        const doc = frame?.contentDocument
        if (!doc || doc.getElementById(STYLE_ID)) continue
        const style = doc.createElement('style')
        style.id = STYLE_ID
        style.textContent = css
        ;(doc.head ?? doc.documentElement)?.appendChild(style)
      }
    }
    tick()
    const t = setInterval(tick, 2000)
    return () => clearInterval(t)
  }, [])

  return null
}
