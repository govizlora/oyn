import { materialAppearance } from '@oyn/surface'
import { useLayoutEffect, useRef, useState } from 'react'
import { createCeramicMaterial } from '@oyn/ceramic'

// One animation clock for the demo. It only drives numeric material values;
// Surface remains the sole owner of GPU rendering and invalidation.
const animations = new Set<(seconds: number) => boolean>()
let frame = 0
let previous = 0
function tick(time: number) {
  frame = 0
  const seconds = Math.min((time - previous) / 1000, 0.064)
  previous = time
  for (const advance of animations) if (advance(seconds)) animations.delete(advance)
  if (animations.size) frame = requestAnimationFrame(tick)
}
function schedule(advance: (seconds: number) => boolean) {
  animations.add(advance)
  if (!frame) { previous = performance.now(); frame = requestAnimationFrame(tick) }
  return () => {
    animations.delete(advance)
    if (!animations.size) { cancelAnimationFrame(frame); frame = 0 }
  }
}

// Stay strictly on the concave program, including the visually flat endpoints.
// The surface is detached once its exit settles, rather than switching through zero.
const rest = -0.001
export function useRecessMotion(target: number | null) {
  const [material] = useState(() => createCeramicMaterial({ elevation: rest }))
  const [visible, setVisible] = useState(false)
  const motion = useRef({ value: rest, velocity: 0 })

  useLayoutEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const destination = target ?? rest
    let cancel = () => {}
    const finish = () => {
      motion.current = { value: destination, velocity: 0 }
      material.setElevation(destination)
      setVisible(target !== null)
    }
    const start = () => {
      cancel()
      if (media.matches || (target === null && motion.current.value === rest)) { finish(); return }
      setVisible(true)
      // Critically damped: preserve both position and velocity on interruption,
      // without a bouncy overshoot or a separate opacity animation.
      const frequency = 30
      cancel = schedule(seconds => {
        const current = motion.current
        const offset = current.value - destination
        const momentum = current.velocity + frequency * offset
        const decay = Math.exp(-frequency * seconds)
        current.value = Math.min(rest, destination + (offset + momentum * seconds) * decay)
        current.velocity = (current.velocity - frequency * momentum * seconds) * decay
        if (Math.abs(current.value - destination) < 0.005 && Math.abs(current.velocity) < 0.05) {
          finish()
          return true
        }
        material.setElevation(current.value)
        return false
      })
    }
    start()
    media.addEventListener('change', start)
    return () => { cancel(); media.removeEventListener('change', start) }
  }, [material, target])

  return { appearance: materialAppearance, props: { material }, enabled: visible }
}
