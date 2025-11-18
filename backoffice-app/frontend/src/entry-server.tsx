import { App } from './shell/AppServer'
import { renderToString } from 'react-dom/server'

export function render(url: string) {
  return renderToString(<App url={url} />)
}