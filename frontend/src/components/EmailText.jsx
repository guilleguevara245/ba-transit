/**
 * Un mail que, si no entra en el renglon, corta despues de la arroba
 * ("guilleguevara245@" / "gmail.com") en lugar de quedar con puntos suspensivos.
 */
export default function EmailText({ email }) {
  const at = (email ?? '').indexOf('@')
  if (at < 0) return email ?? null
  return (
    <>
      {email.slice(0, at + 1)}
      <wbr />
      {email.slice(at + 1)}
    </>
  )
}
