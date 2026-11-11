// Decorative line illustrations for the Home page.
// They show how detection looks (boxes + class tags). They carry no data.

function Tag({ x, y, w, label, cls }) {
  return (
    <g className={cls}>
      <rect x={x} y={y} width={w} height="13" rx="3" className="il-tag" />
      <text x={x + 5} y={y + 9.5} className="il-tag-text">{label}</text>
    </g>
  )
}

function Person({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} className="il-figure">
      <circle cx="10" cy="8" r="7" />
      <path d="M0 48 V30 a10 10 0 0 1 10 -10 a10 10 0 0 1 10 10 V48" />
    </g>
  )
}

function Car({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} className="il-figure">
      <path d="M0 26 V16 a5 5 0 0 1 5 -5 H16 L26 0 H58 L68 11 H80 a5 5 0 0 1 5 5 V26 Z" />
      <circle cx="20" cy="27" r="7" className="il-wheel" />
      <circle cx="65" cy="27" r="7" className="il-wheel" />
    </g>
  )
}

export function ImageArt() {
  return (
    <svg viewBox="0 0 320 180" role="img" aria-label="Illustration of a photo with boxes around a person and a car">
      <rect width="320" height="180" rx="12" className="il-bg" />
      <rect y="124" width="320" height="56" className="il-road" />
      <path d="M0 124 H320" className="il-ground" />
      <Person x={62} y={78} />
      <rect x="50" y="62" width="44" height="68" className="il-box person" rx="3" />
      <Tag x={50} y={49} w={42} label="person" cls="person" />
      <Car x={156} y={96} />
      <rect x="146" y="82" width="106" height="50" className="il-box car" rx="3" />
      <Tag x={146} y={69} w={30} label="car" cls="car" />
      <path d="M18 24 h14 M18 24 v14 M302 24 h-14 M302 24 v14" className="il-corner" />
    </svg>
  )
}

export function VideoArt() {
  return (
    <svg viewBox="0 0 320 180" role="img" aria-label="Illustration of a video frame with a timeline underneath">
      <rect width="320" height="180" rx="12" className="il-bg" />
      <rect x="14" y="14" width="292" height="108" rx="8" className="il-road" />
      <rect x="40" y="62" width="64" height="36" rx="3" className="il-box car ghost-2" />
      <rect x="86" y="58" width="64" height="40" rx="3" className="il-box car ghost-1" />
      <rect x="132" y="54" width="64" height="44" rx="3" className="il-box car" />
      <Car x={140} y={66} s={0.72} />
      <Tag x={132} y={41} w={30} label="car" cls="car" />
      <path d="M244 56 l22 14 -22 14 z" className="il-play" />
      <rect x="14" y="140" width="292" height="6" rx="3" className="il-track" />
      <rect x="14" y="140" width="164" height="6" rx="3" className="il-track-fill" />
      <circle cx="178" cy="143" r="7" className="il-head" />
      <path d="M44 154 v8 M84 154 v8 M124 154 v8 M164 154 v8 M204 154 v8 M244 154 v8 M284 154 v8" className="il-tick" />
    </svg>
  )
}

export function CameraArt() {
  return (
    <svg viewBox="0 0 320 180" role="img" aria-label="Illustration of a webcam viewfinder with a person detected">
      <rect width="320" height="180" rx="12" className="il-bg" />
      <path d="M28 36 h-14 v14 M292 36 h14 v14 M28 144 h-14 v-14 M292 144 h14 v-14" className="il-corner wide" />
      <circle cx="30" cy="22" r="4" className="il-live" />
      <text x="40" y="26" className="il-small">live</text>
      <circle cx="160" cy="76" r="20" className="il-figure-fill" />
      <path d="M108 150 v-14 a52 38 0 0 1 104 0 v14" className="il-figure-fill" />
      <rect x="100" y="48" width="120" height="102" rx="4" className="il-box person" />
      <Tag x={100} y={35} w={42} label="person" cls="person" />
    </svg>
  )
}

export function CctvArt() {
  return (
    <svg viewBox="0 0 320 180" role="img" aria-label="Illustration of a wall-mounted camera watching a road">
      <rect width="320" height="180" rx="12" className="il-bg" />
      <path d="M60 40 L300 70 L300 164 L120 164 Z" className="il-cone" />
      <rect x="0" y="136" width="320" height="44" className="il-road" />
      <g transform="translate(26 22) rotate(14)">
        <rect x="0" y="0" width="46" height="20" rx="5" className="il-cam" />
        <circle cx="46" cy="10" r="6" className="il-lens" />
      </g>
      <path d="M22 18 V60 M22 28 h10" className="il-mount" />
      <path d="M86 60 q10 8 12 20 M96 52 q16 12 18 30" className="il-signal" />
      <rect x="150" y="98" width="130" height="44" rx="3" className="il-box bus" />
      <rect x="156" y="106" width="118" height="30" rx="5" className="il-figure-fill" />
      <Tag x={150} y={85} w={30} label="bus" cls="bus" />
      <rect x="112" y="116" width="40" height="30" rx="3" className="il-box car" />
      <Tag x={112} y={103} w={30} label="car" cls="car" />
    </svg>
  )
}

export function HeroArt() {
  return (
    <svg viewBox="0 0 560 320" role="img" aria-label="Schematic street scene with detection boxes around vehicles and pedestrians">
      <rect width="560" height="320" rx="18" className="il-bg" />
      <g className="il-city">
        <rect x="20" y="70" width="70" height="110" />
        <rect x="104" y="40" width="54" height="140" />
        <rect x="172" y="88" width="84" height="92" />
        <rect x="300" y="58" width="60" height="122" />
        <rect x="374" y="96" width="80" height="84" />
        <rect x="468" y="48" width="72" height="132" />
      </g>
      <rect y="180" width="560" height="140" className="il-road" />
      <path d="M0 180 H560" className="il-ground" />
      <path d="M0 250 H560" className="il-lane" />
      <Person x={40} y={134} />
      <rect x="30" y="118" width="42" height="68" rx="3" className="il-box person" />
      <Tag x={30} y={105} w={42} label="person" cls="person" />
      <Person x={104} y={140} s={0.9} />
      <rect x="95" y="126" width="38" height="60" rx="3" className="il-box person" />
      <Car x={170} y={196} s={1.15} />
      <rect x="160" y="178" width="118" height="62" rx="3" className="il-box car" />
      <Tag x={160} y={165} w={30} label="car" cls="car" />
      <rect x="318" y="150" width="150" height="76" rx="3" className="il-box bus" />
      <rect x="326" y="160" width="134" height="58" rx="6" className="il-figure-fill" />
      <path d="M338 176 h22 M372 176 h22 M406 176 h22" className="il-window" />
      <Tag x={318} y={137} w={30} label="bus" cls="bus" />
      <circle cx="372" cy="286" r="12" className="il-wheel" />
      <circle cx="430" cy="286" r="12" className="il-wheel" />
      <rect x="352" y="256" width="100" height="46" rx="3" className="il-box truck" />
      <Tag x={352} y={243} w={38} label="truck" cls="truck" />
      <rect x="486" y="232" width="52" height="64" rx="3" className="il-box motorcycle" />
      <Tag x={486} y={219} w={58} label="motorcycle" cls="motorcycle" />
      <circle cx="500" cy="282" r="8" className="il-wheel" />
      <circle cx="526" cy="282" r="8" className="il-wheel" />
    </svg>
  )
}
