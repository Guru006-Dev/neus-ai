import './landing.css'
import { useState } from 'react'
import { use3DEligible } from './eligibility'
import { FallbackSequence } from './FallbackSequence'
import { Footer } from './Footer'
import { Nav } from './Nav'
import { OneRunSection } from './OneRunSection'

export function LandingPage() {
  const eligible = use3DEligible()
  const [sceneFailed, setSceneFailed] = useState(false)

  return (
    <>
      <Nav />
      <main id="main">
        {eligible && !sceneFailed ? (
          <OneRunSection onSceneError={() => setSceneFailed(true)} />
        ) : (
          <FallbackSequence />
        )}
      </main>
      <Footer />
    </>
  )
}
