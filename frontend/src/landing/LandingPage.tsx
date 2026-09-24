import './landing.css'
import { FallbackSequence } from './FallbackSequence'
import { Footer } from './Footer'
import { Nav } from './Nav'

export function LandingPage() {
  return (
    <>
      <Nav />
      <main id="main">
        <FallbackSequence />
      </main>
      <Footer />
    </>
  )
}
