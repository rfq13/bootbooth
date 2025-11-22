import { Component } from 'react'

type State = { hasError: boolean; msg?: string }

export class ErrorBoundary extends Component<{ children?: any }, State> {
  state: State = { hasError: false, msg: undefined }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: any, info: any) {
    console.error('ErrorBoundary caught', { error, info })
    this.setState({ msg: String(error?.message || 'Terjadi kesalahan') })
  }
  render() {
    if (this.state.hasError) return <div className="text-[#dc3545] text-sm">{this.state.msg || 'Terjadi kesalahan'}</div>
    return this.props.children
  }
}