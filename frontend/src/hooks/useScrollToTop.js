import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * Al pasar a otra pagina con un link, arranca desde arriba (si no, quedaba
 * a la altura de la anterior). Con "#seccion" la pagina va a esa parte, y
 * con Atras queda donde la deje el navegador.
 */
export function useScrollToTop() {
  const { pathname, hash } = useLocation()
  const type = useNavigationType()
  const last = useRef(pathname)

  useEffect(() => {
    if (last.current === pathname) return
    last.current = pathname
    if (type !== 'POP' && !hash) window.scrollTo(0, 0)
  }, [pathname, hash, type])
}
