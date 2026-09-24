import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Caption } from './Caption'
import { installDebugHook, registerReporter } from './debug'
import { CTA, FINALE, INTRO } from './nexus-story'
import { ProgressRail } from './ProgressRail'
import { SceneBoundary } from './SceneBoundary'
import { ctaReveal, frameAt, frameKey, introVisibility, type ScreenFrame } from './timeline'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const Scene3D = lazy(() => import('./scene/Scene3D'))

function setFade(el: HTMLElement | null, value: number) {
  if (!el) return
  el.style.opacity = value.toFixed(3)
  el.style.visibility = value === 0 ? 'hidden' : 'visible'
}

export function OneRunSection({ onSceneError }: { onSceneError: () => void }) {
  const sectionRef = useRef<HTMLElement>(null)
  const introRef = useRef<HTMLDivElement>(null)
  const finaleRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef(0)
  const invalidateRef = useRef<() => void>(() => {})
  const [frame, setFrame] = useState<ScreenFrame>(() => frameAt(0))
  const keyRef = useRef(frameKey(frame))
  const triggerRef = useRef<ScrollTrigger | undefined>(undefined)

  useGSAP(
    () => {
      const proxy = { p: 0 }
      const apply = (scrubbed: number) => {
        // GSAP rounds tweened values to 1e-6, so the scrub settles a hair above or below the true scroll
        // progress depending on direction. Snap to the exact value so one scroll position = one state.
        const exact = triggerRef.current?.progress
        const p = exact !== undefined && Math.abs(scrubbed - exact) <= 1e-6 ? exact : scrubbed
        progressRef.current = p
        setFade(introRef.current, introVisibility(p))
        setFade(finaleRef.current, ctaReveal(p))
        const next = frameAt(p)
        const key = frameKey(next)
        if (key !== keyRef.current) {
          keyRef.current = key
          setFrame(next)
        }
        invalidateRef.current()
      }
      const tween = gsap.to(proxy, {
        p: 1,
        ease: 'none',
        onUpdate: () => apply(proxy.p),
        scrollTrigger: { trigger: sectionRef.current, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
      })
      triggerRef.current = tween.scrollTrigger
      apply(0)
    },
    { scope: sectionRef },
  )

  useEffect(
    () =>
      installDebugHook({
        section: sectionRef,
        progress: progressRef,
        target: () => triggerRef.current?.progress ?? progressRef.current,
      }),
    [],
  )

  useEffect(
    () =>
      registerReporter('dom', () => ({
        phase: keyRef.current.split('|')[0],
        key: keyRef.current,
        caption: document.querySelector('.caption')?.textContent ?? '',
        rail: [...document.querySelectorAll('.rail__item')].map((el) => el.getAttribute('data-status')),
        screen: document.querySelector('.one-run .screen')?.outerHTML ?? '',
        intro: introRef.current?.style.opacity ?? null,
        finale: finaleRef.current?.style.opacity ?? null,
      })),
    [],
  )

  return (
    <section id="one-run" ref={sectionRef} className="one-run" aria-labelledby="one-run-title">
      <div className="one-run__stage">
        <SceneBoundary onError={onSceneError}>
          <Suspense fallback={null}>
            <Scene3D progressRef={progressRef} invalidateRef={invalidateRef} frame={frame} />
          </Suspense>
        </SceneBoundary>

        <div ref={introRef} className="intro">
          <h1 id="one-run-title" className="display">
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
        </div>

        <Caption frame={frame} />
        <ProgressRail statuses={frame.statuses} />

        <div ref={finaleRef} className="finale">
          <p className="display display--small">{FINALE.title}</p>
          <a className="button button--light" href={CTA.href}>
            {CTA.label}
          </a>
        </div>
      </div>
    </section>
  )
}
