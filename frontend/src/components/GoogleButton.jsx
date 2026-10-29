import { useEffect, useRef, useState } from 'react'

const SCRIPT_URL = 'https://accounts.google.com/gsi/client'
let scriptPromise = null

/** Carga una sola vez la libreria de Google Identity Services. */
function loadScript() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = SCRIPT_URL
      script.async = true
      script.onload = resolve
      script.onerror = () => {
        scriptPromise = null
        reject(new Error('No se pudo cargar Google'))
      }
      document.head.appendChild(script)
    })
  }
  return scriptPromise
}

/**
 * Boton oficial "Continuar con Google" (lo dibuja Google, como piden sus
 * normas de marca). onCredential recibe el ID token para mandar al servidor.
 */
export default function GoogleButton({ clientId, onCredential, dark }) {
  const container = useRef(null)
  const callback = useRef(onCredential)
  const [failed, setFailed] = useState(false)
  callback.current = onCredential

  useEffect(() => {
    let cancelled = false
    loadScript()
      .then(() => {
        if (cancelled || !container.current) return
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => callback.current(response.credential),
          ux_mode: 'popup',
        })
        container.current.innerHTML = ''
        window.google.accounts.id.renderButton(container.current, {
          type: 'standard',
          theme: dark ? 'filled_black' : 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          locale: 'es-419',
          width: Math.min(container.current.offsetWidth || 320, 400),
        })
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [clientId, dark])

  if (failed) return <p className="auth-note">No se pudo cargar el ingreso con Google. Probá con tu mail.</p>
  return <div className="google-button" ref={container} />
}
