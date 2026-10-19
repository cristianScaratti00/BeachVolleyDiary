// ============================================================================
// Un'area caricata in lazy che non arriva (deploy nuovo, rete) non fa cadere
// l'app: mostra «Questa parte non si è caricata.» con [Riprova], che rifà
// l'import (UX §6.0, MOTION.md §6.4).
//
// `React.lazy` ricorda la promessa rifiutata: per riprovare davvero serve un
// lazy NUOVO. `lazyRetry` lo ricrea a ogni `reset()`.
// ============================================================================
import { Component, lazy } from 'react'
import type { ComponentType, ErrorInfo, LazyExoticComponent, ReactNode } from 'react'
import { AreaError } from '../components/ui/Feedback'

export function lazyRetry<P extends object>(factory: () => Promise<{ default: ComponentType<P> }>) {
  let current: LazyExoticComponent<ComponentType<P>> = lazy(factory)
  function LazyRetry(props: P) {
    const C = current as unknown as ComponentType<P>
    return <C {...props} />
  }
  return Object.assign(LazyRetry, {
    reset: () => {
      current = lazy(factory)
    },
  })
}

interface Props {
  children: ReactNode
  /** Ricrea i lazy dell'area prima di riprovare. */
  onReset?: () => void
  minHeight?: 'map' | 'venue'
}

export class LazyBoundary extends Component<Props, { error: boolean; n: number }> {
  state = { error: false, n: 0 }

  static getDerivedStateFromError() {
    return { error: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[lazy] area non caricata', error, info.componentStack)
  }

  riprova = () => {
    this.props.onReset?.()
    this.setState((s) => ({ error: false, n: s.n + 1 }))
  }

  render() {
    if (this.state.error) return <AreaError onRetry={this.riprova} minHeight={this.props.minHeight} />
    return <div key={this.state.n} className="app-lazy-area">{this.props.children}</div>
  }
}
