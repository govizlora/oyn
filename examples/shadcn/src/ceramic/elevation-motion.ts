import { materialAppearance } from '@oyn/surface'
import { useLayoutEffect, useRef, useState } from 'react'
import { createCeramicMaterial } from '@oyn/ceramic'

import { createControlMotion } from '@oyn/ui/control-motion'
import { bindMotion } from '@oyn/surface/adapters/motion'

// Stay strictly on the concave program, including the visually flat endpoints.
// The surface is detached once its exit settles, rather than switching through zero.
const rest = -0.001
export function useRecessMotion(target: number | null) {
  const [material] = useState(() => createCeramicMaterial({ elevation: rest }))
  const [visible, setVisible] = useState(false)
  const motion = useRef<ReturnType<typeof createControlMotion> | null>(null)

  useLayoutEffect(() => {
    const source = createControlMotion(window, rest)
    motion.current = source
    const disconnect = bindMotion(source, material.setElevation)
    return () => { disconnect(); source.dispose(); motion.current = null }
  }, [material])

  useLayoutEffect(() => {
    const source = motion.current!
    source.setTarget(target ?? rest)
    setVisible(target !== null || source.get() !== rest)
    if (target === null && source.get() !== rest) {
      return source.on('change', value => { if (value === rest) setVisible(false) })
    }
  }, [target])

  return { surface: { appearance: materialAppearance, props: { material } }, visible }
}
