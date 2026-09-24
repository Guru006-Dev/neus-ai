import { Component, type ReactNode } from 'react'

interface Props {
  onError: () => void
  children: ReactNode
}

/** Catches a failed 3D chunk or WebGL error so the page can switch to the 2D fallback. */
export class SceneBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
