import { forwardRef } from 'react'

/**
 * A single chapter text overlay. Purely presentational — opacity/position are
 * driven by GSAP from CinematicLanding via the forwarded ref. `align` shifts
 * the block so consecutive chapters don't sit in the exact same spot.
 */
const ALIGN = {
  left: 'items-start text-left',
  center: 'items-center text-center',
  right: 'items-end text-right',
}

const Chapter = forwardRef(function Chapter(
  { index, eyebrow, title, body, align = 'center' },
  ref
) {
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-center px-8 md:px-24"
      style={{ opacity: 0 }}
    >
      <div className={`flex w-full flex-col ${ALIGN[align]}`}>
        <div className="max-w-xl">
          <span className="mb-5 block text-xs uppercase tracking-mega text-[#f4f1ea]/60">
            {eyebrow}
          </span>
          <h2 className="text-shadow-cinema font-serif text-5xl font-light leading-[1.05] text-[#f4f1ea] md:text-7xl">
            {title}
          </h2>
          {body && (
            <p className="text-shadow-cinema mt-6 max-w-md text-sm font-light leading-relaxed tracking-wide-2 text-[#f4f1ea]/80 md:text-base">
              {body}
            </p>
          )}
        </div>
      </div>
    </div>
  )
})

export default Chapter
