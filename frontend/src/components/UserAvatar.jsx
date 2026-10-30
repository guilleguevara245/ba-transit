import { avatarById, initialOf } from '../utils/avatars.js'
import './UserAvatar.css'

/** Un avatar del sitio (tambien para la grilla de "Tu imagen"): su dibujo, recortado en circulo. */
export function AvatarGlyph({ avatar, size }) {
  return (
    <span className="user-avatar" style={{ width: size, height: size, background: avatar.bg }} aria-hidden="true">
      <svg
        viewBox="0 0 96 96"
        width={size}
        height={size}
        focusable="false"
        // Dibujo propio del sitio (data/avatarArt.js), no viene de afuera.
        dangerouslySetInnerHTML={{ __html: `<rect width="96" height="96" fill="${avatar.bg}"/>${avatar.art}` }}
      />
    </span>
  )
}

/** La imagen de la cuenta: foto (de Google o propia), avatar o la inicial sobre amarillo. */
export default function UserAvatar({ user, size = 32 }) {
  const image = user?.image
  if ((image?.kind === 'google' || image?.kind === 'foto') && image.url) {
    return (
      <img
        className="user-avatar user-avatar-photo"
        src={image.url}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        style={{ width: size, height: size }}
      />
    )
  }
  const avatar = image?.kind === 'avatar' ? avatarById(image.value) : null
  if (avatar) return <AvatarGlyph avatar={avatar} size={size} />
  return (
    <span className="user-avatar user-avatar-initial" style={{ width: size, height: size, fontSize: size * 0.53 }} aria-hidden="true">
      {initialOf(user)}
    </span>
  )
}
