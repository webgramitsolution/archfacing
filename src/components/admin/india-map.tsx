import { INDIA_PATH } from '@/lib/india-path'
import { INDIA_STATES } from '@/lib/india-states'

const norm = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z]/g, '')

/** Real India CHOROPLETH — every state shaded by its registration count. */
export function IndiaChoropleth({
  states,
  max,
  className = 'h-[200px] w-[180px]',
}: {
  states: { label: string; value: number }[]
  max: number
  className?: string
}) {
  const valueOf = new Map(states.map((s) => [norm(s.label), s.value]))
  return (
    <svg viewBox="0 0 500 560" className={`${className} shrink-0`} role="img" aria-label="Registrations across Indian states">
      {INDIA_STATES.map((st) => {
        const v = valueOf.get(norm(st.name)) ?? 0
        const ratio = max > 0 ? v / max : 0
        const fill = v <= 0 ? '#EAF1FB' : ratio >= 0.66 ? '#1E40AF' : ratio >= 0.4 ? '#2563EB' : ratio >= 0.2 ? '#60A5FA' : '#93C5FD'
        return <path key={st.name} d={st.d} fill={fill} stroke="#FFFFFF" strokeWidth={0.7} />
      })}
    </svg>
  )
}

/** Approximate positions of each state in the 0-1024 viewBox of the real India map. */
const STATE_POS: Record<string, [number, number]> = {
  'Jammu & Kashmir': [340, 175], 'Himachal Pradesh': [400, 245], 'Punjab': [355, 275],
  'Uttarakhand': [455, 270], 'Haryana': [385, 305], 'Delhi': [400, 330], 'Rajasthan': [280, 360],
  'Uttar Pradesh': [500, 355], 'Bihar': [615, 385], 'Jharkhand': [615, 445], 'West Bengal': [655, 470],
  'Gujarat': [210, 470], 'Madhya Pradesh': [420, 445], 'Chhattisgarh': [520, 490], 'Odisha': [600, 525],
  'Maharashtra': [320, 545], 'Telangana': [440, 590], 'Andhra Pradesh': [470, 660], 'Karnataka': [370, 680],
  'Goa': [285, 640], 'Kerala': [370, 800], 'Tamil Nadu': [440, 760], 'Assam': [745, 360], 'Tripura': [720, 430],
}

function heatColor(ratio: number) {
  return ratio >= 0.66 ? '#1E40AF' : ratio >= 0.4 ? '#2563EB' : ratio >= 0.2 ? '#60A5FA' : '#93C5FD'
}

/** The real India national outline + a heat marker per state, sized & coloured by count. */
export function IndiaMap({
  states,
  max,
  className = 'h-[200px] w-[170px]',
}: {
  states: { label: string; value: number }[]
  max: number
  className?: string
}) {
  const valueOf = new Map(states.map((s) => [s.label, s.value]))
  return (
    <svg viewBox="0 0 1024 1024" className={`${className} shrink-0`} role="img" aria-label="Registrations across India">
      <g transform="translate(0,1024) scale(0.1,-0.1)" fill="#E4EDFB" stroke="#B7CDEE" strokeWidth={40}>
        <path d={INDIA_PATH} />
      </g>
      {Object.entries(STATE_POS).map(([name, [x, y]]) => {
        const v = valueOf.get(name) ?? 0
        if (v <= 0) return null
        const ratio = max > 0 ? v / max : 0
        const r = 9 + Math.sqrt(ratio) * 20
        return <circle key={name} cx={x} cy={y} r={r} fill={heatColor(ratio)} fillOpacity={0.9} stroke="#fff" strokeWidth={3} />
      })}
    </svg>
  )
}

/** Four legend chips whose thresholds follow the real data max. */
export function geoLegend(max: number) {
  const a = Math.round(max * 0.66), b = Math.round(max * 0.4), c = Math.round(max * 0.2)
  return [
    { label: `> ${a}`, color: '#1E40AF' }, { label: `${b} - ${a}`, color: '#2563EB' },
    { label: `${c} - ${b}`, color: '#60A5FA' }, { label: `< ${c}`, color: '#93C5FD' },
  ]
}
