import { AVATAR_ART } from '../data/avatarArt.js'

/**
 * Avatares de la cuenta: dibujos propios en tres grupos (Buenos Aires,
 * fauna argentina y patrones). Los ids son los que acepta el servidor
 * (AccountService.AVATARS).
 */
export const AVATARS = AVATAR_ART

/** Los grupos en orden, con sus avatares: [{ name, avatars }]. */
export const AVATAR_GROUPS = [...new Set(AVATARS.map((a) => a.group))].map((name) => ({
  name,
  avatars: AVATARS.filter((a) => a.group === name),
}))

export function avatarById(id) {
  return AVATARS.find((a) => a.id === id) ?? null
}

/** La primera letra del nombre (o del mail), para cuando no hay imagen. */
export function initialOf(user) {
  return ((user?.name || user?.email || '?').trim().charAt(0) || '?').toLocaleUpperCase('es-AR')
}

const PHOTO_SIZE = 256

/**
 * Recorta la foto al centro en un cuadrado de 256 px y la pasa a JPEG,
 * asi se sube algo chico (unos 20 KB) aunque la foto original sea enorme.
 */
export function photoToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)) {
      reject(new Error('Elegí una imagen JPG, PNG o WebP.'))
      return
    }
    const url = window.URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight)
      const canvas = document.createElement('canvas')
      canvas.width = PHOTO_SIZE
      canvas.height = PHOTO_SIZE
      canvas
        .getContext('2d')
        .drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE)
      window.URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => {
      window.URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer esa imagen. Probá con otra.'))
    }
    img.src = url
  })
}
