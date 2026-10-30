/**
 * "Tu día": la frase que resume el clima de tus lugares en las proximas
 * horas y la tira hora por hora. Trabaja con el pronostico del servidor
 * (GET /api/v1/clima/pronostico): hours empieza en la hora en curso.
 */

/** Cuantas horas mira la frase y muestra la tira. */
export const WINDOW_HOURS = 12

const STORM = new Set([95, 96, 99])
const RAIN = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82])

/** Umbrales: probabilidad de lluvia, sensacion termica y viento. */
const RAIN_CHANCE = 50
const HOT = 32
const COLD = 5
const WINDY = 40
/** Las horas de la vuelta del trabajo. */
const RETURN_HOURS = [17, 18, 19, 20]

export function isStorm(hour) {
  return STORM.has(hour.code)
}

export function isRainy(hour) {
  return (
    isStorm(hour) ||
    (hour.rainChance ?? 0) >= RAIN_CHANCE ||
    hour.rain >= 0.3 ||
    (RAIN.has(hour.code) && (hour.rainChance ?? 0) >= 40)
  )
}

const hourOf = (time) => Number(time.slice(11, 13))

/** "a las 17", "a la 1", "mañana a las 7" (respecto de la hora actual del pronostico). */
export function hourLabel(time, nowTime) {
  const h = hourOf(time)
  const at = h === 1 ? 'a la 1' : `a las ${h}`
  return time.slice(0, 10) === nowTime.slice(0, 10) ? at : `mañana ${at}`
}

/** Las proximas horas de un pronostico (desde la actual). */
export function nextHours(forecast, count = WINDOW_HOURS) {
  return (forecast?.hours ?? []).slice(0, count)
}

/**
 * La frase del dia. entries: [{ place: { id, label }, forecast }] (las que
 * tienen pronostico). Devuelve { tone, text }; tone: storm | rain | heat |
 * cold | wind | ok. Con un solo lugar no se nombra el lugar.
 */
export function headline(entries) {
  const ready = entries.filter((e) => e.forecast?.hours?.length)
  if (ready.length === 0) return null
  const nowTime = ready[0].forecast.current?.time ?? ready[0].forecast.hours[0].time
  const where = (e) => (ready.length > 1 ? ` en ${e.place.label}` : '')
  const windows = ready.map((e) => ({ e, hours: nextHours(e.forecast) }))

  // La primera hora (la mas temprana entre los lugares) que cumple algo.
  function first(test) {
    let best = null
    for (const { e, hours } of windows) {
      const index = hours.findIndex(test)
      if (index >= 0 && (best === null || index < best.index)) best = { e, hour: hours[index], index, hours }
    }
    return best
  }

  const storm = first(isStorm)
  if (storm) {
    const text =
      storm.index === 0
        ? `Hay tormenta ahora${where(storm.e)}. Si podés, esperá a que pase.`
        : `Tormenta ${hourLabel(storm.hour.time, nowTime)}${where(storm.e)}. Salí con tiempo.`
    return { tone: 'storm', text }
  }

  const rainNow = windows.find(({ hours }) => hours.length && isRainy(hours[0]))
  if (rainNow) {
    const end = rainNow.hours.findIndex((h) => !isRainy(h))
    const until = end > 0 ? `; para cerca de ${hourLabel(rainNow.hours[end].time, nowTime).replace(/^a /, '')}` : ''
    return { tone: 'rain', text: `Está lloviendo${where(rainNow.e)}${until}.` }
  }

  // Con Trabajo: si llueve a la vuelta, eso es lo que importa.
  const work = windows.find(({ e }) => e.place.id === 'trabajo')
  if (work) {
    const back = work.hours.find((h) => RETURN_HOURS.includes(hourOf(h.time)) && isRainy(h))
    if (back) {
      return { tone: 'rain', text: `Llueve a la vuelta (${hourOf(back.time)} h) en Trabajo: llevá paraguas.` }
    }
  }

  const rain = first(isRainy)
  if (rain) {
    return { tone: 'rain', text: `Lluvia ${hourLabel(rain.hour.time, nowTime)}${where(rain.e)}: llevá paraguas.` }
  }

  // Lo extremo: la hora mas calurosa, la mas fria y la mas ventosa.
  function extreme(pick, better) {
    let best = null
    for (const { e, hours } of windows) {
      for (const h of hours) {
        if (best === null || better(pick(h), pick(best.hour))) best = { e, hour: h }
      }
    }
    return best
  }
  const hottest = extreme(
    (h) => h.feelsLike,
    (a, b) => a > b,
  )
  if (hottest && hottest.hour.feelsLike >= HOT) {
    const t = Math.round(hottest.hour.feelsLike)
    return {
      tone: 'heat',
      text: `Mucho calor: ${t}° de sensación ${hourLabel(hottest.hour.time, nowTime)}${where(hottest.e)}. Llevá agua.`,
    }
  }
  const coldest = extreme(
    (h) => h.feelsLike,
    (a, b) => a < b,
  )
  if (coldest && coldest.hour.feelsLike <= COLD) {
    const t = Math.round(coldest.hour.feelsLike)
    return {
      tone: 'cold',
      text: `Frío: ${t}° de sensación ${hourLabel(coldest.hour.time, nowTime)}${where(coldest.e)}. Abrigate.`,
    }
  }
  const windiest = extreme(
    (h) => h.wind,
    (a, b) => a > b,
  )
  if (windiest && windiest.hour.wind >= WINDY) {
    const w = Math.round(windiest.hour.wind)
    return {
      tone: 'wind',
      text: `Viento fuerte: ${w} km/h ${hourLabel(windiest.hour.time, nowTime)}${where(windiest.e)}.`,
    }
  }
  return { tone: 'ok', text: `Sin lluvia en las próximas ${WINDOW_HOURS} horas.` }
}
