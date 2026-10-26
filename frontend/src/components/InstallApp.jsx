import { useEffect, useState } from 'react'
import './InstallApp.css'

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

// Safari de iPhone/iPad no avisa que se puede instalar: hay que explicarlo.
const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent)

/**
 * Boton "Instalar la app". En Android y escritorio usa el aviso de
 * instalacion del navegador (beforeinstallprompt); en iPhone muestra los
 * pasos para agregarla a la pantalla de inicio. Si ya esta instalada o
 * el navegador no lo permite, no se muestra.
 */
export default function InstallApp() {
  const [prompt, setPrompt] = useState(null)
  const [installed, setInstalled] = useState(isStandalone)
  const [showIosHelp, setShowIosHelp] = useState(false)

  useEffect(() => {
    function handlePrompt(event) {
      event.preventDefault()
      setPrompt(event)
    }
    function handleInstalled() {
      setInstalled(true)
      setPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  if (installed || (!prompt && !isIos())) return null

  async function install() {
    if (!prompt) {
      setShowIosHelp((open) => !open)
      return
    }
    prompt.prompt()
    await prompt.userChoice.catch(() => null)
    setPrompt(null)
  }

  return (
    <span className="install-app">
      <button type="button" className="install-app-button" onClick={install} aria-expanded={prompt ? undefined : showIosHelp}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" />
        </svg>
        Instalar la app
      </button>
      {showIosHelp && (
        <span className="install-app-help" role="note">
          En Safari tocá <strong>Compartir</strong> (el cuadrado con la flecha) y después{' '}
          <strong>Agregar a inicio</strong>.
        </span>
      )}
    </span>
  )
}
