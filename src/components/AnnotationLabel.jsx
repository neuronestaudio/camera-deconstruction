import { forwardRef } from 'react'

/**
 * A technical callout: a target dot on a camera part, a connector line that
 * draws on, and a glassy spec card with an animated glowing outline. Anchored
 * at (tx, ty) as a percentage of the viewport (the part location on the held
 * frame). The card sits at a fixed pixel offset (dx, dy) from the target, so
 * the dot + line + card stay a rigid unit even as the anchor shifts between
 * screen sizes.
 *
 * Animation (draw-on line, dot pop, card rise) is driven by GSAP from
 * CinematicLanding, which targets the `.anno-line`, `.anno-dot`, `.anno-box`
 * children. The outline glow is a continuous CSS animation (.glow-border).
 */
const BOX_W = 300

const AnnotationLabel = forwardRef(function AnnotationLabel(
  {
    tx,
    ty,
    dx,
    dy,
    side = 'right',
    num,
    eyebrow,
    title,
    spec,
    fitScale = 1,
    fitCx = 50,
    fitCy = 50,
  },
  ref
) {
  const length = Math.hypot(dx, dy)
  const isLeft = side === 'left'

  // map the part's target (calibrated against the full-frame) into the
  // zoomed-out, recentred frame so the dot stays on the part
  const ax = fitCx + (tx - 50) * fitScale
  const ay = fitCy + (ty - 50) * fitScale

  return (
    <div
      ref={ref}
      className="anno pointer-events-none absolute z-30"
      style={{ left: `${ax}%`, top: `${ay}%` }}
    >
      {/* connector line — GSAP sets rotation + draws scaleX 0→1 */}
      <span
        className="anno-line absolute left-0 top-0 block"
        style={{
          width: length,
          height: 1,
          background:
            'linear-gradient(90deg, rgba(244,241,234,0.15), rgba(244,241,234,0.7))',
          transform: 'scaleX(0)',
          transformOrigin: '0% 50%',
        }}
      />

      {/* target marker */}
      <span
        className="anno-dot absolute block rounded-full"
        style={{
          left: -6,
          top: -6,
          width: 12,
          height: 12,
          border: '1px solid rgba(244,241,234,0.85)',
          transform: 'scale(0)',
        }}
      />
      <span
        className="anno-dot absolute block rounded-full"
        style={{
          left: -2.5,
          top: -2.5,
          width: 5,
          height: 5,
          background: '#f4f1ea',
          transform: 'scale(0)',
        }}
      />

      {/* glassy spec card with animated glow outline, anchored at the line end */}
      <div
        className="absolute"
        style={{
          left: dx,
          top: dy,
          transform: isLeft ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
        }}
      >
        <div
          className={`anno-box glow-border relative rounded-md border border-[#f4f1ea]/15 bg-black/30 px-6 py-5 backdrop-blur-md ${
            isLeft ? 'text-right' : 'text-left'
          }`}
          style={{ width: BOX_W, opacity: 0 }}
        >
          <span className="relative z-10 block text-[13px] uppercase tracking-mega text-[#f4f1ea]/55">
            {num} · {eyebrow}
          </span>
          <span className="relative z-10 mt-2 block font-serif text-[26px] leading-[1.12] text-[#f4f1ea]">
            {title}
          </span>
          {spec && (
            <span className="relative z-10 mt-2 block text-[15px] font-light leading-snug tracking-wide-2 text-[#f4f1ea]/65">
              {spec}
            </span>
          )}
        </div>
      </div>
    </div>
  )
})

export default AnnotationLabel
