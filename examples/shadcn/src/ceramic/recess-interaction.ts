import { useComposedRefs } from '@radix-ui/react-compose-refs'
import * as React from 'react'
import { useSurface } from '@oyn/surface'
import { useRecessMotion } from './elevation-motion'
import { recessElevations } from './materials'

type InteractionProps<T extends HTMLElement> = Pick<React.HTMLAttributes<T>,
  'onPointerEnter' | 'onPointerLeave' | 'onPointerDown' | 'onPointerUp' |
  'onPointerCancel' | 'onLostPointerCapture' | 'onFocus' | 'onBlur' |
  'onKeyDown' | 'onKeyUp' | 'aria-disabled'> & { disabled?: boolean }

/** Shared depth/press policy. Radix menus own focus/highlight; plain navigation owns hover. */
export function useRecessInteraction<T extends HTMLElement>(
  props: InteractionProps<T>,
  forwardedRef?: React.Ref<T>,
  { mode = 'navigation', restingElevation = null }: { mode?: 'navigation' | 'menu' | 'control'; restingElevation?: number | null } = {},
) {
  const [hovered, setHovered] = React.useState(false)
  const [focused, setFocused] = React.useState(false)
  const highlighted = hovered || focused
  const [pressed, setPressed] = React.useState(false)
  const disabled = props.disabled || props['aria-disabled'] === true || props['aria-disabled'] === 'true'
  const target = disabled ? restingElevation : pressed ? recessElevations.pressed : highlighted ? recessElevations.hover : restingElevation
  const surface = useRecessMotion(target)
  const surfaceRef = useSurface(surface)
  const ref = useComposedRefs(surfaceRef, forwardedRef)
  React.useEffect(() => { if (disabled) { setHovered(false); setFocused(false); setPressed(false) } }, [disabled])
  const bindings: Omit<InteractionProps<T>, 'disabled' | 'aria-disabled'> & { ref: typeof ref; 'data-surface-recess'?: string; 'data-surface-elevation'?: number } = {
    ref,
    'data-surface-recess': surface.enabled ? '' : undefined,
    'data-surface-elevation': target ?? undefined,
    onPointerEnter(event) { props.onPointerEnter?.(event); if (mode !== 'menu' && !event.defaultPrevented) setHovered(true) },
    onPointerLeave(event) { setPressed(false); setHovered(false); props.onPointerLeave?.(event) },
    onPointerDown(event) {
      props.onPointerDown?.(event)
      if (!disabled && !event.defaultPrevented && event.button === 0) {
        setPressed(true)
        // Radix owns pointer selection; do not steal capture from its item/trigger.
        if (mode === 'navigation') event.currentTarget.setPointerCapture(event.pointerId)
      }
    },
    onPointerUp(event) { setPressed(false); if (event.pointerType === 'touch') setHovered(false); props.onPointerUp?.(event) },
    onPointerCancel(event) { setPressed(false); setHovered(false); props.onPointerCancel?.(event) },
    onLostPointerCapture(event) { setPressed(false); props.onLostPointerCapture?.(event) },
    onFocus(event) { props.onFocus?.(event); if (mode !== 'navigation' && !event.defaultPrevented) setFocused(true) },
    onBlur(event) { setPressed(false); setFocused(false); props.onBlur?.(event) },
    onKeyDown(event) {
      props.onKeyDown?.(event)
      if (!disabled && !event.defaultPrevented && (event.key === ' ' || event.key === 'Enter')) setPressed(true)
    },
    onKeyUp(event) { if (event.key === ' ' || event.key === 'Enter') setPressed(false); props.onKeyUp?.(event) },
  }
  return { bindings, enabled: surface.enabled }
}
