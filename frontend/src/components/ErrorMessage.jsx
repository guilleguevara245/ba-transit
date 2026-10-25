/**
 * Mensaje de error comun a todas las paginas. La pista sobre el
 * backend local solo se muestra en desarrollo: en produccion no tiene
 * sentido pedirle al usuario que revise localhost.
 */
export default function ErrorMessage({ what, error }) {
  return (
    <div className="error-text" role="alert">
      No se pudo cargar {what}. Probá de nuevo en unos minutos.
      {import.meta.env.DEV && (
        <> (Detalle: {error}. ¿Está corriendo el backend en localhost:8080?)</>
      )}
    </div>
  )
}
