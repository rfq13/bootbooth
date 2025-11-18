import { createRoot } from 'react-dom/client'
import { App } from './shell/AppClient'
createRoot(document.getElementById('app') as HTMLElement).render(<App />)