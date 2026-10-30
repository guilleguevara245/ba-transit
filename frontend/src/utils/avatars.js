/**
 * Avatares de la cuenta: las lineas (con su letra o el tren, en su color),
 * el colectivo, la bici y el avion. Los ids son los que acepta el servidor
 * (AccountService.AVATARS).
 */
const TRAIN = 'train'

export const AVATARS = [
  { id: 'subte-a', bg: '#00A8E1', letter: 'A', name: 'Línea A' },
  { id: 'subte-b', bg: '#EE1C25', letter: 'B', name: 'Línea B' },
  { id: 'subte-c', bg: '#0057A8', letter: 'C', name: 'Línea C' },
  { id: 'subte-d', bg: '#00A94F', letter: 'D', name: 'Línea D' },
  { id: 'subte-e', bg: '#92278F', letter: 'E', name: 'Línea E' },
  { id: 'subte-h', bg: '#FFD100', letter: 'H', name: 'Línea H' },
  { id: 'premetro', bg: '#B26FAF', letter: 'P', name: 'Premetro' },
  { id: 'mitre', bg: '#1F8FD1', icon: TRAIN, name: 'Mitre' },
  { id: 'sarmiento', bg: '#5BC2E7', icon: TRAIN, name: 'Sarmiento' },
  { id: 'roca', bg: '#6E9FB8', icon: TRAIN, name: 'Roca' },
  { id: 'san-martin', bg: '#0033A0', icon: TRAIN, name: 'San Martín' },
  { id: 'urquiza', bg: '#F2C200', icon: TRAIN, name: 'Urquiza' },
  { id: 'belgrano-norte', bg: '#D52B1E', icon: TRAIN, name: 'Belgrano Norte' },
  { id: 'belgrano-sur', bg: '#1A2B6D', icon: TRAIN, name: 'Belgrano Sur' },
  { id: 'tren-de-la-costa', bg: '#8E9AA3', icon: TRAIN, name: 'Tren de la Costa' },
  { id: 'colectivo', bg: '#17171a', icon: 'bus', name: 'Colectivo' },
  { id: 'bici', bg: '#2f8a3c', icon: 'bike', name: 'Bici' },
  { id: 'avion', bg: '#f4c11b', icon: 'plane', name: 'Avión' },
]

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
