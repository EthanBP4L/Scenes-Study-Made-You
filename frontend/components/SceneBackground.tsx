
export default function SceneBackground() {
  return (
    <div
      id="scene-background"
      className="absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="ocean-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b9aa6" />
            <stop offset="45%" stopColor="#14566d" />
            <stop offset="100%" stopColor="#08172f" />
          </linearGradient>

          <linearGradient id="ocean-ray" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4fff8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#d4fff8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Water */}
        <rect width="1440" height="900" fill="url(#ocean-water)" />

       
{/* Animated sunlight filtering through water */}
<g className="ocean-light-ray ocean-light-ray-one">
  <path
    d="M220 0 L430 0 L900 900 L620 900 Z"
    fill="url(#ocean-ray)"
  />
</g>

<g className="ocean-light-ray ocean-light-ray-two">
  <path
    d="M550 0 L680 0 L1050 900 L880 900 Z"
    fill="url(#ocean-ray)"
    opacity="0.6"
  />
</g>
 

        
{/* Animated underwater bubbles */}
{[
  [120, 250, 8],
  [300, 550, 5],
  [510, 190, 12],
  [900, 340, 7],
  [1110, 620, 10],
  [1320, 180, 6],
  [760, 700, 4],
].map(([x, y, r], index) => (
  <circle
    key={index}
    className="ocean-bubble"
    style={{
      animationDelay: `${index * -1.8}s`,
      animationDuration: `${8 + index * 1.4}s`,
    }}
    cx={x}
    cy={y}
    r={r}
    fill="none"
    stroke="#c8fff5"
    strokeWidth="2"
    opacity="0.45"
  />
))}


        {/* Distant underwater terrain */}
        <path
          d="M0 770 Q220 690 410 780 T850 760 T1440 750 V900 H0 Z"
          fill="#0b3544"
          opacity="0.7"
        />

        {/* Foreground seabed */}
        <path
          d="M0 850 Q250 780 480 860 T1000 830 T1440 850 V900 H0 Z"
          fill="#061d2b"
        />
      </svg>
    </div>
  );
}
