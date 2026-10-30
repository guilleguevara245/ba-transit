import { useRef, useState } from 'react'
import { AvatarGlyph } from './UserAvatar.jsx'
import { AVATAR_GROUPS, photoToDataUrl } from '../utils/avatars.js'
import { setImage, uploadPhoto } from '../utils/account.js'

/** "Tu imagen": avatar del sitio, foto de Google, foto propia o la inicial. */
export default function ImagePicker({ user }) {
  const image = user.image ?? {}
  const [tab, setTab] = useState(image.kind === 'avatar' || !image.kind ? 'avatar' : image.kind)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  async function run(action) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const tabs = [
    ['avatar', 'Avatar'],
    ...(image.googleAvailable ? [['google', 'Foto de Google']] : []),
    ['foto', 'Subir una foto'],
  ]

  return (
    <div className="image-picker">
      <div className="image-picker-tabs" role="group" aria-label="Tipo de imagen">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? 'active' : undefined}
            aria-pressed={tab === key}
            disabled={busy}
            onClick={() => {
              setTab(key)
              if (key === 'google') run(() => setImage('google'))
              if (key === 'foto') fileRef.current?.click()
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) run(async () => uploadPhoto(await photoToDataUrl(file)))
        }}
      />

      {tab === 'avatar' &&
        AVATAR_GROUPS.map((group) => (
          <div key={group.name} className="image-picker-group">
            <div className="image-picker-group-name" id={`avatares-${group.name.replace(/\s+/g, '-')}`}>
              {group.name}
            </div>
            <div className="image-picker-grid" role="radiogroup" aria-labelledby={`avatares-${group.name.replace(/\s+/g, '-')}`}>
              {group.avatars.map((a) => {
                const chosen = image.kind === 'avatar' && image.value === a.id
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={chosen}
                    aria-label={a.name}
                    title={a.name}
                    className={chosen ? 'chosen' : undefined}
                    disabled={busy}
                    onClick={() => run(() => setImage('avatar', a.id))}
                  >
                    <AvatarGlyph avatar={a} size={44} />
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      {tab === 'foto' && (
        <p className="auth-note">
          {image.kind === 'foto' ? 'Esa es tu foto. ' : ''}
          <button type="button" className="image-picker-link" onClick={() => fileRef.current?.click()} disabled={busy}>
            {image.kind === 'foto' ? 'Cambiarla' : 'Elegir una foto'}
          </button>{' '}
          (se recorta en círculo y se achica antes de subirla).
        </p>
      )}
      {busy && <p className="auth-note">Guardando…</p>}
      {error && (
        <p className="auth-error auth-error-box" role="alert">
          {error}
        </p>
      )}
      {image.kind && (
        <button type="button" className="image-picker-link" disabled={busy} onClick={() => run(() => setImage(null))}>
          Usar la inicial de mi nombre
        </button>
      )}
    </div>
  )
}
