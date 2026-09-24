import { useEffect, useRef } from 'react'
import { NexusMarkIcon } from './NexusLogo'
import { CTA, FINALE, INTRO, STORY_STEPS } from './nexus-story'
import { ScreenContent } from './screen/ScreenContent'

/** The One Run story in 2D, for mobile, reduced motion and no-WebGL visitors. */
export function FallbackSequence() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          ;(entry.target as HTMLElement).dataset.visible = 'true'
          io.unobserve(entry.target)
        }
      },
      { threshold: 0.2 },
    )
    root.querySelectorAll('[data-visible]').forEach((step) => io.observe(step))
    return () => io.disconnect()
  }, [])

  return (
    <div ref={rootRef} className="fallback" id="one-run">
      <section className="fallback__intro">
        <h1 className="display">
          {INTRO.titleLines.map((line) => (
            <span key={line} className="display__line">
              {line}
            </span>
          ))}
        </h1>
        <p className="lede">{INTRO.lede}</p>
        <a className="button button--light" href={CTA.href}>
          {CTA.label}
        </a>
      </section>

      <ol className="fallback__steps">
        {STORY_STEPS.map((step) => (
          <li key={step.view} className="fallback__step" data-visible="false">
            <div className="fallback__copy">
              <span className="caption__label">{step.label}</span>
              <p className="caption__text">{step.caption}</p>
            </div>
            <div className="flat-laptop" aria-hidden="true">
              <div className="flat-laptop__lid">
                <div className="screen-frame">
                  <ScreenContent view={step.view} progress={1} />
                </div>
              </div>
              <div className="flat-laptop__base" />
            </div>
          </li>
        ))}
        <li className="fallback__step fallback__finale" data-visible="false">
          <NexusMarkIcon className="fallback__mark" />
          <p className="display display--small">{FINALE.title}</p>
          <a className="button button--light" href={CTA.href}>
            {CTA.label}
          </a>
        </li>
      </ol>
    </div>
  )
}
