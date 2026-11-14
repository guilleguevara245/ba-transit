/**
 * Un texto chico que aparece al pasar el mouse, con la estetica del sitio
 * (no el cartel del navegador). Va adentro del elemento, que lleva la clase
 * has-tip. align: 'center' o 'end' (pegado al borde derecho, para lo que
 * esta en la esquina). Los lectores de pantalla usan el aria-label del
 * elemento, asi que el texto se oculta para ellos.
 */
export default function Tip({ children, align = 'center' }) {
  return (
    <span className={`tip tip-${align}`} aria-hidden="true">
      {children}
    </span>
  )
}
