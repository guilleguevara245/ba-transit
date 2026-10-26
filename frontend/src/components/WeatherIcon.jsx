/**
 * Iconos del clima dibujados en SVG (los emoji cambian segun el sistema
 * y no hay uno de "luna con nubes"). Se arman con piezas: sol, luna,
 * nube, gotas, copos, rayo y niebla.
 */
const SUN = '#f4c11b'
const MOON = '#e3bf55'
const CLOUD = '#d9dce3'
const CLOUD_DARK = '#9aa1ad'
const STROKE = '#6b7280'
const WATER = '#3b82c4'

function Sun({ cx = 12, cy = 12, r = 5 }) {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4
    return (
      <line
        key={i}
        x1={cx + Math.cos(a) * (r + 2)}
        y1={cy + Math.sin(a) * (r + 2)}
        x2={cx + Math.cos(a) * (r + 4)}
        y2={cy + Math.sin(a) * (r + 4)}
        stroke={SUN}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    )
  })
  return (
    <g>
      {rays}
      <circle cx={cx} cy={cy} r={r} fill={SUN} />
    </g>
  )
}

/** Luna creciente: un circulo al que se le "muerde" un costado. */
function Moon({ cx = 12, cy = 12, r = 7 }) {
  const id = `moon-${cx}-${cy}-${r}`
  return (
    <g>
      <mask id={id}>
        <rect x="0" y="0" width="32" height="32" fill="#fff" />
        <circle cx={cx + r * 0.55} cy={cy - r * 0.35} r={r * 0.85} fill="#000" />
      </mask>
      <circle cx={cx} cy={cy} r={r} fill={MOON} mask={`url(#${id})`} />
    </g>
  )
}

function Cloud({ dx = 0, dy = 0, fill = CLOUD }) {
  return (
    <path
      transform={`translate(${dx} ${dy})`}
      d="M9 25h14a5 5 0 0 0 .6-9.96A7 7 0 0 0 10.2 14.3 5.4 5.4 0 0 0 9 25z"
      fill={fill}
      stroke={STROKE}
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  )
}

function Drops({ count = 3, long = true }) {
  return Array.from({ length: count }, (_, i) => (
    <line
      key={i}
      x1={12 + i * 4}
      y1="27"
      x2={10.5 + i * 4}
      y2={long ? 31 : 29.5}
      stroke={WATER}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  ))
}

const SHAPES = {
  clear: () => <Sun cx={16} cy={16} r={6} />,
  'clear-night': () => <Moon cx={15} cy={16} r={9} />,
  partly: () => (
    <>
      <Sun cx={11} cy={10} r={4.5} />
      <Cloud dx={2} dy={2} />
    </>
  ),
  'partly-night': () => (
    <>
      <Moon cx={10} cy={10} r={7.5} />
      <Cloud dx={2} dy={2} />
    </>
  ),
  cloud: () => (
    <>
      <Cloud dx={4} dy={-4} fill={CLOUD_DARK} />
      <Cloud dx={0} dy={0} />
    </>
  ),
  fog: () => (
    <>
      <Cloud dx={0} dy={-4} />
      {[25, 29].map((y) => (
        <line key={y} x1="6" y1={y} x2="26" y2={y} stroke={CLOUD_DARK} strokeWidth="2" strokeLinecap="round" />
      ))}
    </>
  ),
  drizzle: () => (
    <>
      <Cloud dx={0} dy={-3} />
      <Drops count={3} long={false} />
    </>
  ),
  rain: () => (
    <>
      <Cloud dx={0} dy={-3} fill={CLOUD_DARK} />
      <Drops count={3} />
    </>
  ),
  snow: () => (
    <>
      <Cloud dx={0} dy={-3} />
      {[12, 17, 22].map((x) => (
        <circle key={x} cx={x} cy="29" r="1.6" fill={WATER} />
      ))}
    </>
  ),
  heat: () => (
    <>
      <Sun cx={21} cy={10} r={3.5} />
      <rect x="8.5" y="4" width="6" height="17" rx="3" fill="#fff" stroke={STROKE} strokeWidth="1.2" />
      <circle cx="11.5" cy="23.5" r="5" fill="#e0573a" stroke={STROKE} strokeWidth="1.2" />
      <rect x="10.2" y="9" width="2.6" height="13" rx="1.3" fill="#e0573a" />
    </>
  ),
  storm: () => (
    <>
      <Cloud dx={0} dy={-3} fill={CLOUD_DARK} />
      <path d="M17 23l-3 5h3l-2 4 5-6h-3l2-3z" fill={SUN} stroke="#b88a00" strokeWidth="0.6" strokeLinejoin="round" />
    </>
  ),
}

export default function WeatherIcon({ kind, className }) {
  const Shape = SHAPES[kind]
  if (!Shape) return null
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <Shape />
    </svg>
  )
}
