import { useEffect } from 'react'
import { initSmoothScroll } from './lib/smoothScroll'
import CinematicLanding from './components/CinematicLanding'

export default function App() {
  useEffect(() => {
    const { cleanup } = initSmoothScroll()
    return cleanup
  }, [])

  return <CinematicLanding />
}
