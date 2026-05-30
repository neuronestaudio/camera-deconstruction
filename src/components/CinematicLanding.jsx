import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import FrameSequence, { FRAME_COUNT } from './FrameSequence'
import AnnotationLabel from './AnnotationLabel'
import ChapterIndicator from './ChapterIndicator'

gsap.registerPlugin(ScrollTrigger)

/* ------------------------------------------------------------------ *
 * Scroll → frame mapping.
 * Piecewise-linear control points [progress, frame]. Flat segments are
 * "holds" — the scrub pauses on a key frame so annotations can draw on
 * with their arrows locked to the (now static) parts.
 * ------------------------------------------------------------------ */
const CONTROL = [
  [0.0, 1],
  [0.04, 15],
  [0.15, 15], // HOLD · assembled hero (shot 1)
  [0.27, 168],
  [0.43, 168], // HOLD · exploded centerpiece (shot 2)
  [0.5, 208],
  [0.61, 208], // HOLD · internals in body (shot 2)
  [0.72, 328],
  [0.83, 328], // HOLD · reassembled back panel (shot 4)
  [0.9, 398],
  [1.0, 398], // HOLD · reassembled hero, fades to black at the very end (shot 4)
]

function frameForProgress(p) {
  if (p <= CONTROL[0][0]) return CONTROL[0][1]
  if (p >= CONTROL[CONTROL.length - 1][0]) return CONTROL[CONTROL.length - 1][1]
  for (let i = 0; i < CONTROL.length - 1; i++) {
    const [p0, f0] = CONTROL[i]
    const [p1, f1] = CONTROL[i + 1]
    if (p >= p0 && p <= p1) {
      const t = p1 === p0 ? 0 : (p - p0) / (p1 - p0)
      return f0 + (f1 - f0) * t
    }
  }
  return CONTROL[CONTROL.length - 1][1]
}

/* ------------------------------------------------------------------ *
 * Annotation groups (copy sourced from the Sony α7 III feature sheet).
 * tx/ty = target part location as % of viewport on the held frame.
 * dx/dy = pixel offset from the target to the spec card.
 * ------------------------------------------------------------------ */
const GROUPS = [
  {
    // ACT I — assembled hero (hold on f015). Labels open toward centre.
    hold: [0.045, 0.17],
    appear: 0.07,
    items: [
      { tx: 47, ty: 55, dx: 185, dy: 20, side: 'right', num: '01', eyebrow: 'Optics', title: 'FE 24–105 mm F4 G OSS', spec: 'Constant-aperture G-series standard zoom with Optical SteadyShot' },
      { tx: 72, ty: 34, dx: -150, dy: -95, side: 'left', num: '02', eyebrow: 'System', title: 'α7 III · Full-Frame', spec: 'A 35 mm mirrorless workhorse, redefined for a new generation' },
      { tx: 24, ty: 57, dx: 14, dy: 150, side: 'right', num: '03', eyebrow: 'Chassis', title: 'Magnesium-Alloy Body', spec: 'Lightweight, high-rigidity frame — sealed against dust & moisture' },
    ],
  },
  {
    // ACT II — exploded centerpiece (hold on f168)
    // Five cards spread into distinct, non-overlapping zones, all kept clear of
    // the centred-left "Deconstructed" editorial panel and inside the viewport:
    //   02 top-centre · 04 top-right · 03 mid-right · 01 bottom-right · 05 bottom-centre
    hold: [0.3, 0.47],
    appear: 0.315,
    items: [
      { tx: 36, ty: 50, dx: 464, dy: 281, side: 'right', num: '01', eyebrow: 'Image Sensor', title: '24.2 MP Exmor R', spec: 'Back-illuminated full-frame CMOS · gapless on-chip lens · copper wiring for 2× faster readout' },
      { tx: 31, ty: 35, dx: 119, dy: -270, side: 'right', num: '02', eyebrow: 'Processing', title: 'BIONZ X + Front-End LSI', spec: 'ISO up to 51200 · ~15-stop dynamic range · 14-bit RAW' },
      { tx: 41, ty: 52, dx: 445, dy: -76, side: 'right', num: '03', eyebrow: 'Stabilisation', title: '5-Axis In-Body IS', spec: '5.0-stop advantage across pitch, yaw, roll & X/Y' },
      { tx: 66, ty: 40, dx: 61, dy: -281, side: 'right', num: '04', eyebrow: 'Optical Path', title: 'Precision Lens Groups', spec: 'ED & aspherical elements with Optical SteadyShot' },
      { tx: 21, ty: 56, dx: 214, dy: 302, side: 'right', num: '05', eyebrow: 'Mount', title: 'Sony E-Mount', spec: 'Six-screw steel mount · weather-sealed bayonet lock' },
    ],
  },
  {
    // ACT II→III bridge — internals seated in body (hold on f205, shot 2)
    hold: [0.5, 0.61],
    appear: 0.52,
    items: [
      { tx: 33, ty: 58, dx: 55, dy: -50, side: 'right', num: '01', eyebrow: 'Monitor', title: '3.0″ 922k-dot Tilt LCD', spec: 'Articulating screen · tilts 107° up / 41° down' },
      { tx: 23, ty: 84, dx: 60, dy: 10, side: 'right', num: '02', eyebrow: 'Power', title: 'NP-FZ100 Battery', spec: 'High-capacity Z-series — up to ~710 shots per charge' },
      { tx: 52, ty: 52, dx: 140, dy: 75, side: 'right', num: '03', eyebrow: 'Core', title: 'Sensor & Processing Unit', spec: 'The imaging heart, seated back into the chassis' },
    ],
  },
  {
    // ACT III — reassembled back panel (hold on f328, shot 4)
    hold: [0.72, 0.83],
    appear: 0.74,
    items: [
      { tx: 49, ty: 19, dx: 120, dy: -10, side: 'right', num: '01', eyebrow: 'Viewfinder', title: '2.36M-dot OLED Tru-Finder', spec: '0.78× XGA EVF · ZEISS T* anti-reflective coating' },
      { tx: 71, ty: 53, dx: -30, dy: -70, side: 'left', num: '02', eyebrow: 'Control', title: 'AF-ON · Dial · Multi-Selector', spec: 'Direct focus placement · 81 customisable functions' },
      { tx: 34, ty: 60, dx: 55, dy: 55, side: 'right', num: '03', eyebrow: 'Interface', title: '3.0″ Touch LCD', spec: 'Touch focus · bright, detailed monitoring outdoors' },
    ],
  },
]

const ACT_TITLES = [
  {
    roman: 'I',
    label: 'The Whole',
    copy: 'The Sony α7 III as you hold it — a 35 mm full-frame body that hides a generation of engineering beneath a magnesium shell.',
    window: [0.045, 0.2],
  },
  {
    roman: 'II',
    label: 'Deconstructed',
    copy: 'Pull it apart and the system reveals itself: a back-illuminated sensor, a five-axis stabiliser, and the processing core that drives them.',
    window: [0.27, 0.62],
  },
  {
    roman: 'III',
    label: 'The Sum of Its Parts',
    copy: 'Every component returns to place — viewfinder, controls and grip — resolved into a single, deliberate instrument.',
    window: [0.72, 0.9],
  },
]

// frame zoom-out + recentre (leaves the left third for editorial text)
const FRAME_SCALE = 0.8
const FRAME_CX = 61
const FRAME_CY = 50

// label "hold" frames, served as ultra-high-res stills from /frames-hi
const HOLD_FRAMES = [15, 168, 208, 328, 398]

const SCROLL_LENGTH = '+=760%'
const INTRO_END = 0.24

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const toMainProgress = (p) => clamp01((p - INTRO_END) / (1 - INTRO_END))
const toGlobalProgress = (p) => INTRO_END + p * (1 - INTRO_END)

export default function CinematicLanding() {
  const sectionRef = useRef(null)
  const frameRef = useRef(null)
  const introBlackRef = useRef(null)
  const introBeatRefs = useRef([])
  const outroRef = useRef(null)
  const finaleRef = useRef(null)
  const whiteWashRef = useRef(null)
  const heroVignetteRef = useRef(null)
  const actTitleRefs = useRef([])
  const annoRefs = useRef([]) // flat list of annotation root els
  const activeRef = useRef(0)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: SCROLL_LENGTH,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          onUpdate: (self) => {
            const mainP = toMainProgress(self.progress)
            frameRef.current?.paintFrame(frameForProgress(mainP))
            const p = mainP
            const idx = p < 0.21 ? 0 : p < 0.665 ? 1 : 2
            if (idx !== activeRef.current) {
              activeRef.current = idx
              setActive(idx)
            }
          },
        },
      })

      const canvas = sectionRef.current?.querySelector('canvas')
      if (canvas) {
        gsap.set(canvas, { scale: 2.25, transformOrigin: '61% 52%' })
      }

      // intro beat: lens close-up -> black narrative cards -> lens reveal
      gsap.set(introBlackRef.current, { opacity: 0 })
      tl.to(introBlackRef.current, { opacity: 1, duration: 0.04, ease: 'power1.out' }, 0.065)

      introBeatRefs.current.forEach((el, i) => {
        if (!el) return
        const inAt = [0.114, 0.162][i]
        const outAt = [0.154, 0.2][i]
        gsap.set(el, { opacity: 0, y: 22, scale: 0.985 })
        tl.to(el, { opacity: 1, y: 0, scale: 1, duration: 0.018, ease: 'power2.out' }, inAt)
        tl.to(el, { opacity: 0, y: -18, scale: 1.01, duration: 0.018, ease: 'power2.in' }, outAt)
      })

      tl.to(introBlackRef.current, { opacity: 0, duration: 0.028, ease: 'power1.in' }, 0.22)

      if (canvas) {
        tl.to(canvas, { scale: 1, duration: 0.07, ease: 'power2.out' }, toGlobalProgress(0.07))
      }

      // hero opens with a vignette that pulls back as you scroll, revealing the camera
      gsap.set(heroVignetteRef.current, { opacity: 1 })
      tl.to(heroVignetteRef.current, { opacity: 0, duration: 0.06, ease: 'power2.out' }, toGlobalProgress(0.008))

      // act titles fade in/out across their windows
      ACT_TITLES.forEach((act, i) => {
        const el = actTitleRefs.current[i]
        if (!el) return
        const [a, b] = act.window
        gsap.set(el, { opacity: 0, y: 12 })
        tl.to(el, { opacity: 1, y: 0, duration: 0.03, ease: 'power2.out' }, toGlobalProgress(a))
        tl.to(el, { opacity: 0, y: -12, duration: 0.03, ease: 'power2.in' }, toGlobalProgress(b - 0.03))
      })

      // annotations — draw-on within each hold
      let flat = 0
      GROUPS.forEach((group) => {
        const outAt = group.hold[1] - 0.02
        group.items.forEach((item, i) => {
          const root = annoRefs.current[flat++]
          if (!root) return
          const line = root.querySelector('.anno-line')
          const dots = root.querySelectorAll('.anno-dot')
          const box = root.querySelector('.anno-box')
          const angle = (Math.atan2(item.dy, item.dx) * 180) / Math.PI

          gsap.set(line, { rotation: angle, transformOrigin: '0% 50%', scaleX: 0 })
          gsap.set(dots, { scale: 0, transformOrigin: '50% 50%' })
          gsap.set(box, { opacity: 0, x: item.side === 'left' ? 16 : -16 })

          const a = toGlobalProgress(group.appear + i * 0.014)
          tl.to(dots, { scale: 1, duration: 0.012, ease: 'back.out(2)' }, a)
          tl.to(line, { scaleX: 1, duration: 0.022, ease: 'power2.out' }, a + 0.004)
          tl.to(box, { opacity: 1, x: 0, duration: 0.024, ease: 'power2.out' }, a + 0.01)

          // fade the whole callout out before the hold ends
          tl.to([line, ...dots, box], { opacity: 0, duration: 0.025, ease: 'power1.in' }, toGlobalProgress(outAt))
        })
      })

      // shot 4 sits on a light studio sweep — ease a soft white wash in across
      // the Act II→III handoff so the bright background arrives gradually
      // instead of popping, then let the black finale take over
      gsap.set(whiteWashRef.current, { opacity: 0 })
      tl.to(whiteWashRef.current, { opacity: 1, duration: 0.16, ease: 'power1.inOut' }, toGlobalProgress(0.6))
      tl.to(whiteWashRef.current, { opacity: 0, duration: 0.05, ease: 'power1.in' }, toGlobalProgress(0.95))

      // end scene — wash the frame to full black, settle the closing card in
      gsap.set(finaleRef.current, { opacity: 0 })
      tl.to(finaleRef.current, { opacity: 1, duration: 0.05, ease: 'power1.inOut' }, toGlobalProgress(0.95))

      gsap.set(outroRef.current, { opacity: 0, y: 26 })
      tl.to(outroRef.current, { opacity: 1, y: 0, duration: 0.04, ease: 'power2.out' }, toGlobalProgress(0.955))

      // pad timeline so positions map to ~full scroll progress
      tl.to({}, { duration: 0.001 }, 1.0)
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  const handleReady = () => ScrollTrigger.refresh()

  // flat index helper for assigning refs in render
  let flatIdx = 0

  return (
    <main className="bg-[#08080a]">
      <section
        ref={sectionRef}
        className="relative h-screen w-full overflow-hidden"
      >
        {/* frame scrub canvas */}
        <FrameSequence
          ref={frameRef}
          onReady={handleReady}
          fitScale={FRAME_SCALE}
          fitCx={FRAME_CX}
          fitCy={FRAME_CY}
          hiResFrames={HOLD_FRAMES}
        />

        {/* intro black cards: Anatomy -> a7 III -> SONY */}
        <div
          ref={introBlackRef}
          className="pointer-events-none absolute inset-0 z-[19] flex items-center justify-center bg-black"
          style={{ opacity: 0 }}
        >
          <div className="relative flex h-[60vh] w-[min(88vw,44rem)] items-center justify-center">
            <div
              ref={(el) => (introBeatRefs.current[0] = el)}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              <span className="intro-badge">Sony α7 III</span>
              <span className="mt-4 text-xs uppercase tracking-wide-2 text-[#f4f1ea]/45">ILCE-7M3</span>
            </div>

            <div
              ref={(el) => (introBeatRefs.current[1] = el)}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="font-serif text-6xl font-semibold tracking-[0.08em] text-[#f4f1ea] md:text-8xl">
                SONY
              </span>
            </div>
          </div>
        </div>

        {/* faint top/bottom gradient purely for text legibility */}
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/35 via-transparent to-black/45" />

        {/* soft light wash — eases shot 4's bright studio background in */}
        <div
          ref={whiteWashRef}
          className="pointer-events-none absolute inset-0 z-[15]"
          style={{
            opacity: 0,
            background:
              'radial-gradient(ellipse 75% 80% at 61% 50%, rgba(228,226,221,0) 32%, rgba(228,226,221,0.55) 100%)',
          }}
        />

        {/* big editorial panel — left third */}
        <div className="pointer-events-none absolute left-8 top-1/2 z-20 w-[30%] max-w-[26rem] -translate-y-1/2 md:left-14">
          {ACT_TITLES.map((act, i) => (
            <div
              key={i}
              ref={(el) => (actTitleRefs.current[i] = el)}
              className="absolute top-1/2 -translate-y-1/2"
            >
              <span className="block font-serif text-base italic text-[#f4f1ea]/45">
                Act {act.roman}
              </span>
              <h2 className="text-shadow-cinema mt-2 font-serif text-6xl font-light leading-[0.98] text-[#f4f1ea] md:text-7xl">
                {act.label}
              </h2>
              <p className="text-shadow-cinema mt-6 max-w-sm text-sm font-light leading-relaxed tracking-wide-2 text-[#f4f1ea]/65 md:text-[15px]">
                {act.copy}
              </p>
            </div>
          ))}
        </div>

        {/* hero vignette — ~50% at rest, pulls back on scroll to reveal the camera */}
        <div
          ref={heroVignetteRef}
          className="pointer-events-none absolute inset-0 z-[16]"
          style={{
            background:
              'radial-gradient(ellipse 70% 75% at 61% 50%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.85) 100%)',
          }}
        />

        {/* annotation callouts */}
        {GROUPS.map((group) =>
          group.items.map((item) => {
            const idx = flatIdx++
            return (
              <AnnotationLabel
                key={idx}
                ref={(el) => (annoRefs.current[idx] = el)}
                {...item}
                fitScale={FRAME_SCALE}
                fitCx={FRAME_CX}
                fitCy={FRAME_CY}
              />
            )
          })
        )}

        {/* end-scene black wash */}
        <div
          ref={finaleRef}
          className="pointer-events-none absolute inset-0 z-[34] bg-black"
          style={{ opacity: 0 }}
        />

        {/* closing card — centered on the black */}
        <div
          ref={outroRef}
          className="absolute inset-0 z-40 flex flex-col items-center justify-center px-6 text-center"
        >
          <h2 className="text-shadow-cinema font-serif text-4xl font-light text-[#f4f1ea] md:text-6xl">
            Everything, in its place.
          </h2>
          <p className="mt-5 max-w-xl text-sm font-light tracking-wide-2 text-[#f4f1ea]/70 md:text-base">
            693-point AF · 10 fps · 4K full-frame · 5-axis stabilisation ·
            ISO 51200 · dual UHS-II slots
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
            <a
              href="https://www.sony.com.au/interchangeable-lens-cameras/products/ilce-7m3"
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto rounded-full bg-[#f4f1ea] px-8 py-3 text-sm font-medium tracking-wide-2 text-[#08080a] transition-transform duration-300 hover:scale-[1.03]"
            >
              Explore the α7 III →
            </a>
            <span className="text-xs uppercase tracking-mega text-[#f4f1ea]/45">
              Body only · $1,849 AUD
            </span>
          </div>
        </div>

        {/* right-side act dots */}
        <ChapterIndicator count={3} active={active} />
      </section>
    </main>
  )
}
