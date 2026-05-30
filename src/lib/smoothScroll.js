import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Wire Lenis smooth scroll into GSAP's ticker so ScrollTrigger and Lenis
 * advance on the same frame. Returns the Lenis instance and a cleanup fn.
 */
export function initSmoothScroll() {
  const lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false,
  })

  // Drive Lenis from GSAP's ticker and keep ScrollTrigger in sync.
  lenis.on('scroll', ScrollTrigger.update)

  const raf = (time) => lenis.raf(time * 1000)
  gsap.ticker.add(raf)
  gsap.ticker.lagSmoothing(0)

  // expose for verification scripts in dev
  if (import.meta.env.DEV) {
    window.__lenis = lenis
    window.__ScrollTrigger = ScrollTrigger
  }

  const cleanup = () => {
    gsap.ticker.remove(raf)
    lenis.destroy()
  }

  return { lenis, cleanup }
}
