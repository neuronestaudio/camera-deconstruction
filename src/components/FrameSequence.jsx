import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

/**
 * Canvas-painted JPEG frame sequence for scroll scrubbing.
 *
 * Frames live at /frames/f001.jpg … f{FRAME_COUNT}.jpg (1-indexed, zero-padded
 * to 3 digits). They are preloaded into Image objects; the parent drives the
 * scrub imperatively via the `paintFrame(n)` ref method (n is 1-indexed) so we
 * never re-render React on scroll.
 *
 * Fit is `contain` (letterboxed) — the source is a product on a near-black
 * stage, so the whole frame is always visible with no aggressive crop, and the
 * bars blend into the page background.
 */

export const FRAME_COUNT = 399
const PAD = 3
const BG = '#08080a'

const framePath = (i) => `/frames/f${String(i).padStart(PAD, '0')}.jpg`

const FrameSequence = forwardRef(function FrameSequence(
  { onReady, fitScale = 1, fitCx = 50, fitCy = 50, hiResFrames = [] },
  ref
) {
  const canvasRef = useRef(null)
  const imagesRef = useRef([])
  const hiResRef = useRef(new Map()) // frameNumber(1-based) -> hi-res Image
  const lastIndexRef = useRef(-1)
  const [loaded, setLoaded] = useState(0)

  // --- paint a single frame, object-fit: contain ---
  const drawIndex = (index) => {
    const canvas = canvasRef.current
    // prefer an ultra-high-res still on label "hold" frames
    const hi = hiResRef.current.get(index + 1)
    const img =
      hi && hi.complete && hi.naturalWidth > 0 ? hi : imagesRef.current[index]
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const cw = canvas.width
    const ch = canvas.height

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    ctx.fillStyle = BG
    ctx.fillRect(0, 0, cw, ch)

    if (!img || !img.complete || img.naturalWidth === 0) return

    const ir = img.naturalWidth / img.naturalHeight
    const cr = cw / ch

    // base contain-fit size
    let baseW, baseH
    if (ir > cr) {
      baseW = cw
      baseH = cw / ir
    } else {
      baseH = ch
      baseW = ch * ir
    }
    // apply zoom-out scale + recentre (leaves room on the left for text)
    const dw = baseW * fitScale
    const dh = baseH * fitScale
    const dx = (fitCx / 100) * cw - dw / 2
    const dy = (fitCy / 100) * ch - dh / 2

    ctx.drawImage(img, dx, dy, dw, dh)

    // feather the frame edges into the page background so there's no hard
    // rectangular boundary (blends the footage edge into black)
    const F = Math.round(Math.min(dw, dh) * 0.1)
    if (F > 0) {
      const solid = BG
      const clear = 'rgba(8,8,10,0)'
      // top
      let g = ctx.createLinearGradient(0, dy, 0, dy + F)
      g.addColorStop(0, solid)
      g.addColorStop(1, clear)
      ctx.fillStyle = g
      ctx.fillRect(dx, dy, dw, F)
      // bottom
      g = ctx.createLinearGradient(0, dy + dh, 0, dy + dh - F)
      g.addColorStop(0, solid)
      g.addColorStop(1, clear)
      ctx.fillStyle = g
      ctx.fillRect(dx, dy + dh - F, dw, F)
      // left
      g = ctx.createLinearGradient(dx, 0, dx + F, 0)
      g.addColorStop(0, solid)
      g.addColorStop(1, clear)
      ctx.fillStyle = g
      ctx.fillRect(dx, dy, F, dh)
      // right
      g = ctx.createLinearGradient(dx + dw, 0, dx + dw - F, 0)
      g.addColorStop(0, solid)
      g.addColorStop(1, clear)
      ctx.fillStyle = g
      ctx.fillRect(dx + dw - F, dy, F, dh)
    }

    lastIndexRef.current = index
  }

  // --- size the canvas backing store to the device pixel ratio ---
  const resize = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(window.innerWidth * dpr)
    canvas.height = Math.floor(window.innerHeight * dpr)
    drawIndex(lastIndexRef.current >= 0 ? lastIndexRef.current : 0)
  }

  useImperativeHandle(ref, () => ({
    // n is 1-indexed (frame number)
    paintFrame(n) {
      const index = Math.min(FRAME_COUNT - 1, Math.max(0, Math.round(n) - 1))
      if (index !== lastIndexRef.current) drawIndex(index)
    },
  }))

  // --- preload frames ---
  useEffect(() => {
    let cancelled = false
    let count = 0
    const imgs = new Array(FRAME_COUNT)

    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image()
      img.decoding = 'async'
      const done = () => {
        if (cancelled) return
        count += 1
        setLoaded(count)
        if (i === 0) drawIndex(0)
        if (count === FRAME_COUNT) onReady?.()
      }
      img.onload = done
      img.onerror = done
      img.src = framePath(i + 1)
      imgs[i] = img
    }
    imagesRef.current = imgs

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- preload ultra-high-res hold frames, swap them in when ready ---
  useEffect(() => {
    let cancelled = false
    const map = hiResRef.current
    hiResFrames.forEach((n) => {
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => {
        if (cancelled) return
        map.set(n, img)
        // if this hold frame is on screen right now, repaint it crisp
        if (lastIndexRef.current === n - 1) {
          lastIndexRef.current = -1
          drawIndex(n - 1)
        }
      }
      img.src = framePath(n).replace('/frames/', '/frames-hi/')
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- mount + resize ---
  useEffect(() => {
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pct = Math.round((loaded / FRAME_COUNT) * 100)
  const ready = loaded >= FRAME_COUNT

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ display: 'block' }}
      />
      {/* lightweight preloader */}
      <div
        className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[#08080a] transition-opacity duration-700"
        style={{ opacity: ready ? 0 : 1 }}
      >
        <div className="flex flex-col items-center gap-4">
          <span className="font-serif text-2xl tracking-wide-2 text-[#f4f1ea]">
            {pct}%
          </span>
          <div className="h-px w-40 overflow-hidden bg-white/15">
            <div
              className="h-full bg-[#f4f1ea] transition-[width] duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] uppercase tracking-mega text-[#f4f1ea]/40">
            Loading sequence
          </span>
        </div>
      </div>
    </>
  )
})

export default FrameSequence
