import { readableTextColor } from '../utils/color.js'
import { avatarById, initialOf } from '../utils/avatars.js'
import './UserAvatar.css'

const ICONS = {
  train:
    'M12 2c-4 0-7 .5-7 4v9.5A3.5 3.5 0 0 0 8.5 19L7 20.5v.5h2.2l2-2h1.6l2 2H17v-.5L15.5 19a3.5 3.5 0 0 0 3.5-3.5V6c0-3.5-3-4-7-4Zm-5 5h4.2v4H7V7Zm5.8 0H17v4h-4.2V7ZM8.5 14a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z',
  plane: 'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z',
}
const STROKES = {
  bus: 'M6 3h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM4 11h16M8 21v-3m8 3v-3M7.5 14.5h.01m9 0h.01',
  bike: 'M5.5 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm13 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5.5 14.5 9 8h6l3.5 6.5M9 8l3 6.5h-1M14 5h2.5',
}

/** Un avatar del sitio por su id (tambien para la grilla de "Tu imagen"). */
export function AvatarGlyph({ avatar, size }) {
  const fg = avatar.id === 'colectivo' ? '#f4c11b' : readableTextColor(avatar.bg)
  const style = { width: size, height: size, background: avatar.bg, color: fg, fontSize: size * 0.5 }
  return (
    <span className="user-avatar" style={style} aria-hidden="true">
      {avatar.letter}
      {ICONS[avatar.icon] && (
        <svg viewBox="0 0 24 24" width={size * 0.52} height={size * 0.52}>
          <path d={ICONS[avatar.icon]} fill="currentColor" />
        </svg>
      )}
      {STROKES[avatar.icon] && (
        <svg viewBox="0 0 24 24" width={size * 0.56} height={size * 0.56} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={STROKES[avatar.icon]} />
        </svg>
      )}
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
