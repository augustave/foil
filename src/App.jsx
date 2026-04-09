import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Info, LineChart, Palette, Wind } from 'lucide-react';

const BASE_CL = 1.13;
const BASE_CM = -0.02;
const BASE_ALPHA = 19.0;

const configurations = [
  {
    id: '1a',
    label: 'Fig. 1a.',
    title: 'Baseline Airfoil',
    clMax: 1.13,
    cmStall: -0.02,
    alphaStall: 19.0,
    type: 'baseline',
    color: '#475569',
    params: []
  },
  {
    id: '1b',
    label: 'Fig. 1b.',
    title: 'Single Split Flap',
    clMax: 2.95,
    cmStall: -0.84,
    alphaStall: 15.0,
    type: 'split',
    gamma: 84,
    color: '#2563eb',
    params: ['g = 0.025c', 'γ = 84°']
  },
  {
    id: '1c',
    label: 'Fig. 1c.',
    title: '10% & 20% Split Flap',
    clMax: 3.23,
    cmStall: -1.0,
    alphaStall: 15.0,
    type: 'split-modified',
    delta: 45,
    gamma: 29,
    color: '#3b82f6',
    params: ['g = 0.025c', 'δ = 45°', 'γ = 29°']
  },
  {
    id: '1d',
    label: 'Fig. 1d.',
    title: 'Slotted Flap',
    clMax: 3.57,
    cmStall: -1.06,
    alphaStall: 15.0,
    type: 'slotted',
    delta: 18,
    gamma: 46,
    color: '#06b6d4',
    params: ['d = 0.021c', 'g = 0.025c', 'δ = 18°', 'γ = 46°']
  },
  {
    id: '1e',
    label: 'Fig. 1e.',
    title: 'Multi-Element (Slat 38°)',
    clMax: 4.44,
    cmStall: -0.75,
    alphaStall: 28.5,
    type: 'multi',
    slatAngle: 38,
    delta: 15,
    gamma: 46,
    color: '#f59e0b',
    params: ['h_s = 0.037c', 'Slat = 38°', 'd = 0.025c', 'δ = 15°', 'γ = 46°']
  },
  {
    id: '1f',
    label: 'Fig. 1f.',
    title: 'Multi-Element (Slat 42.5°)',
    clMax: 4.25,
    cmStall: -0.83,
    alphaStall: 28.5,
    type: 'multi',
    slatAngle: 42.5,
    delta: 18,
    gamma: 47.5,
    color: '#ea580c',
    params: ['h_s = 0.037c', 'Slat = 42.5°', 'd = 0.026c', 'δ = 18°', 'γ = 47.5°']
  }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getInterpolatedParams(config, flapDeployment, slatDeployment, fidelityMode) {
  const f = clamp(flapDeployment / 100, 0, 1);
  const s = clamp(slatDeployment / 100, 0, 1);

  if (config.type === 'baseline') {
    return { cl: config.clMax, cm: config.cmStall, alpha: config.alphaStall };
  }

  const fidelityAlphaWeight =
    fidelityMode === 'conceptual' ? 0.72 : fidelityMode === 'instructional' ? 0.65 : 0.58;
  const fidelityClWeight =
    fidelityMode === 'conceptual' ? 0.45 : fidelityMode === 'instructional' ? 0.4 : 0.35;

  if (config.type === 'multi') {
    const alphaBlend = clamp(f * (1 - fidelityAlphaWeight) + s * fidelityAlphaWeight, 0, 1);
    const clBlend = clamp(f * (1 - fidelityClWeight) + s * fidelityClWeight, 0, 1);
    return {
      cl: BASE_CL + (config.clMax - BASE_CL) * clBlend,
      cm: BASE_CM + (config.cmStall - BASE_CM) * f,
      alpha: BASE_ALPHA + (config.alphaStall - BASE_ALPHA) * alphaBlend
    };
  }

  const damping = fidelityMode === 'approximate' ? 0.9 : 1;
  return {
    cl: BASE_CL + (config.clMax - BASE_CL) * f * damping,
    cm: BASE_CM + (config.cmStall - BASE_CM) * f,
    alpha: BASE_ALPHA + (config.alphaStall - BASE_ALPHA) * f
  };
}

function getEffectNarrative(config, values) {
  const clDelta = values.cl - BASE_CL;
  const alphaDelta = values.alpha - BASE_ALPHA;
  const cmMagnitude = Math.abs(values.cm - BASE_CM);

  if (config.type === 'baseline') {
    return {
      geometry: 'Reference airfoil with no deployed high-lift devices.',
      flow: 'Flow stays comparatively simple and remains attached through moderate angles of attack.',
      result: 'This is the clean reference case, with the lowest lift growth and the least stall-angle extension in the set.',
      benefit: 'Clean shape with minimal mechanical complexity.',
      cost: 'Limited extra lift at low speed.',
      bestUse: 'Baseline comparison and clean-flight reference.'
    };
  }

  if (config.type === 'split' || config.type === 'split-modified') {
    return {
      geometry: 'A trailing-edge flap rotates downward and increases camber near the rear of the airfoil.',
      flow: 'The added camber raises upper-surface acceleration and lift, but flow separation tends to arrive sooner.',
      result: `${clDelta > 0 ? 'Maximum lift increases strongly' : 'Maximum lift stays near baseline'}, while the nose-down moment grows and the stall angle remains lower than the clean case.`,
      benefit: 'Strong lift gain from a relatively simple device.',
      cost: `${cmMagnitude > 0.45 ? 'Large nose-down pitching penalty.' : 'Moderate nose-down pitching penalty.'}`,
      bestUse: 'Useful when low-speed lift matters more than trim simplicity.'
    };
  }

  if (config.type === 'slotted') {
    return {
      geometry: 'A separate flap element moves aft and downward to open a slot behind the main airfoil.',
      flow: 'The slot feeds higher-energy air over the aft section, helping the flow stay attached longer than with a simple split flap.',
      result: 'Lift rises beyond the split-flap cases, though the airfoil still develops a substantial nose-down moment.',
      benefit: 'Higher lift with better flow control over the flap.',
      cost: 'More mechanical complexity and integration work than a simple flap.',
      bestUse: 'Low-speed configurations that need more lift without moving to a full multi-element system.'
    };
  }

  return {
    geometry: 'A leading-edge slat and trailing-edge elements deploy together as a coordinated high-lift system.',
    flow: `${alphaDelta > 4 ? 'The leading-edge slat helps the front of the airfoil stay attached deeper into high-angle operation.' : 'Even partial slat deployment begins to support attachment at higher angles of attack.'}`,
    result: 'This configuration delivers the highest lift range in the set and preserves stall angle better than the simpler flap layouts.',
    benefit: 'Best low-speed lift capability and the broadest high-angle operating envelope.',
    cost: 'Highest mechanical, packaging, and maintenance complexity in the group.',
    bestUse: 'Landing, short takeoff, and other cases that prioritize maximum low-speed performance.'
  };
}

function formatFidelityLabel(mode) {
  if (mode === 'conceptual') return 'Conceptual';
  if (mode === 'instructional') return 'Instructional';
  return 'Approximate';
}

function Tooltip({ text, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="More information"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center"
      >
        {children}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 sm:left-full sm:ml-2 sm:top-1/2 sm:-translate-y-1/2 w-56 sm:w-64 p-3 bg-stone-800 text-[#f4f1ea] text-xs rounded shadow-xl z-50 font-sans leading-relaxed">
          {text}
          <div className="absolute bottom-full left-4 -mb-1 sm:top-1/2 sm:right-full sm:left-auto sm:-translate-y-1/2 border-4 border-transparent border-b-stone-800 sm:border-b-transparent sm:border-r-stone-800" />
        </div>
      )}
    </div>
  );
}

function AirfoilBody({ type, colorMode, ghost = false }) {
  const strokeColor = ghost ? '#b0b0b0' : colorMode ? '#475569' : 'currentColor';
  const opacity = ghost ? 0.45 : 1;
  const dash = ghost ? '3 3' : undefined;

  if (type === 'baseline' || type === 'split' || type === 'split-modified') {
    return (
      <path
        d="M 0 0 C 0 -12, 25 -18, 100 0 C 70 8, 25 10, 0 0 Z"
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeDasharray={dash}
        opacity={opacity}
        className="vector-path"
      />
    );
  }

  if (type === 'slotted') {
    return (
      <path
        d="M 0 0 C 0 -12, 25 -18, 80 -4 A 3 3 0 0 0 80 4 C 60 8, 25 10, 0 0 Z"
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeDasharray={dash}
        opacity={opacity}
        className="vector-path"
      />
    );
  }

  if (type === 'multi') {
    return (
      <path
        d="M 12 -3 C 25 -18, 80 -4, 80 -4 A 3 3 0 0 0 80 4 C 60 8, 25 10, 10 3 C 8 0, 10 -2, 12 -3 Z"
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeDasharray={dash}
        opacity={opacity}
        className="vector-path"
      />
    );
  }

  return null;
}

function WindStreamlines({ alpha, active, intensity = 1 }) {
  if (!active) return null;

  const radians = (alpha * Math.PI) / 180;
  const dx = Math.cos(radians);
  const dy = Math.sin(radians);

  return (
    <g className="streamlines">
      {[-30, -10, 10, 30].map((offset, index) => {
        const startX = -60 - Math.abs(offset) * 1.5;
        const startY = offset + 20;
        return (
          <line
            key={index}
            x1={startX}
            y1={startY}
            x2={startX + dx * 160}
            y2={startY - dy * 160}
            stroke="currentColor"
            strokeWidth={0.45 + intensity * 0.08}
            strokeDasharray="4 4"
            className="animate-wind opacity-50"
          />
        );
      })}
    </g>
  );
}

function PerformanceGraph({ active, colorMode, selectedConfigId, flapDeployment, slatDeployment, fidelityMode }) {
  if (!active) return null;

  const scaleX = (value) => (value / 35) * 100;
  const scaleY = (value) => 50 - (value / 5) * 50;

  const graphData = configurations.map((config) => {
    const values = getInterpolatedParams(config, flapDeployment, slatDeployment, fidelityMode);
    return { ...config, values };
  });

  const bestLift = graphData.reduce((best, item) => (item.values.cl > best.values.cl ? item : best), graphData[0]);
  const bestAlpha = graphData.reduce((best, item) => (item.values.alpha > best.values.alpha ? item : best), graphData[0]);
  const strongestMoment = graphData.reduce((best, item) => (item.values.cm < best.values.cm ? item : best), graphData[0]);

  return (
    <div className="w-full bg-[#fdfcf9] border-2 border-[#1a1a1a] p-6 mb-8 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <h3 className="font-bold text-lg mb-2 text-center md:text-left">Lift Coefficient (C_L) vs. Angle of Attack (α)</h3>
          <p className="text-xs text-stone-500 italic text-center md:text-left">
            Illustrative lift curves for comparing the selected configurations.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono">
          <div className="border border-stone-300 px-3 py-2 bg-stone-50">
            <div className="text-stone-500 mb-1">Highest Lift</div>
            <div className="font-bold">{bestLift.label} · {bestLift.values.cl.toFixed(2)}</div>
          </div>
          <div className="border border-stone-300 px-3 py-2 bg-stone-50">
            <div className="text-stone-500 mb-1">Highest Stall Angle</div>
            <div className="font-bold">{bestAlpha.label} · {bestAlpha.values.alpha.toFixed(1)}°</div>
          </div>
          <div className="border border-stone-300 px-3 py-2 bg-stone-50">
            <div className="text-stone-500 mb-1">Strongest Nose-Down</div>
            <div className="font-bold">{strongestMoment.label} · {strongestMoment.values.cm.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="relative w-full h-72 font-mono text-xs">
        <svg viewBox="-5 0 115 55" className="w-full h-full overflow-visible">
          {[1, 2, 3, 4, 5].map((cl) => (
            <g key={`y-${cl}`}>
              <line x1="0" y1={50 - cl * 10} x2="100" y2={50 - cl * 10} stroke="#e5e7eb" strokeWidth="0.2" />
              <text x="-2" y={50 - cl * 10 + 1} textAnchor="end" fill="#6b7280" fontSize="3">{cl}.0</text>
            </g>
          ))}
          {[10, 20, 30].map((alpha) => (
            <g key={`x-${alpha}`}>
              <line x1={scaleX(alpha)} y1="0" x2={scaleX(alpha)} y2="50" stroke="#e5e7eb" strokeWidth="0.2" />
              <text x={scaleX(alpha)} y="54" textAnchor="middle" fill="#6b7280" fontSize="3">{alpha}°</text>
            </g>
          ))}
          <line x1="0" y1="50" x2="100" y2="50" stroke="#1a1a1a" strokeWidth="0.5" />
          <line x1="0" y1="0" x2="0" y2="50" stroke="#1a1a1a" strokeWidth="0.5" />
          <text x="50" y="60" textAnchor="middle" fill="#1a1a1a" fontSize="4" fontFamily="serif">Angle of Attack (α)</text>
          <text x="-15" y="-5" transform="rotate(-90)" textAnchor="middle" fill="#1a1a1a" fontSize="4" fontFamily="serif">Lift Coefficient (C_L)</text>

          {graphData.map((config) => {
            const alphaStall = config.values.alpha;
            const clMax = config.values.cl;
            const flapRatio = config.type !== 'baseline' ? flapDeployment / 100 : 0;

            let targetCl0 = 0.1;
            if (config.type === 'split') targetCl0 = 1.3;
            if (config.type === 'split-modified') targetCl0 = 1.6;
            if (config.type === 'slotted') targetCl0 = 1.8;
            if (config.type === 'multi') targetCl0 = 1.7;

            const cl0 = 0.1 + (targetCl0 - 0.1) * flapRatio;
            const x0 = scaleX(0);
            const y0 = scaleY(cl0);
            const xStall = scaleX(alphaStall);
            const yStall = scaleY(clMax);
            const cx = scaleX(alphaStall * 0.7);
            const cy = scaleY(clMax + 0.1);
            const pointColor = colorMode ? config.color : '#1a1a1a';
            const isSelected = selectedConfigId === 'all' || selectedConfigId === config.id;
            const opacity = isSelected ? 0.92 : 0.16;
            const strokeWidth = isSelected ? (colorMode ? '0.9' : '0.7') : '0.35';

            return (
              <g key={config.id} className="group">
                <path
                  d={`M ${x0} ${y0} Q ${cx} ${cy} ${xStall} ${yStall}`}
                  fill="none"
                  stroke={pointColor}
                  strokeWidth={strokeWidth}
                  className="transition-all cursor-pointer"
                  opacity={opacity}
                />
                <circle cx={xStall} cy={yStall} r={isSelected ? '1.2' : '0.8'} fill={pointColor} opacity={opacity} className="transition-all" />
                <text
                  x={xStall}
                  y={yStall - 2.5}
                  textAnchor="middle"
                  fill={pointColor}
                  fontSize="2.5"
                  fontWeight="bold"
                  opacity={opacity}
                  className="transition-opacity"
                >
                  {config.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default function App() {
  const [flapDeployment, setFlapDeployment] = useState(0);
  const [slatDeployment, setSlatDeployment] = useState(0);
  const [windTunnel, setWindTunnel] = useState(false);
  const [colorMode, setColorMode] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [fidelityMode, setFidelityMode] = useState('instructional');
  const [selectedConfigId, setSelectedConfigId] = useState('all');

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes flow {
        from { stroke-dashoffset: 40; }
        to { stroke-dashoffset: 0; }
      }
      .animate-wind {
        animation: flow 1s linear infinite;
      }
      .vector-path {
        transition: transform 0.18s ease-out, stroke 0.35s ease, fill 0.35s ease, opacity 0.35s ease;
      }
      .dynamic-text {
        font-variant-numeric: tabular-nums;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const computedConfigs = useMemo(
    () =>
      configurations.map((config) => {
        const interpolated = getInterpolatedParams(config, flapDeployment, slatDeployment, fidelityMode);
        const narrative = getEffectNarrative(config, interpolated);
        return { ...config, interpolated, narrative };
      }),
    [flapDeployment, slatDeployment, fidelityMode]
  );

  const visibleConfigs = selectedConfigId === 'all'
    ? computedConfigs
    : computedConfigs.filter((config) => config.id === selectedConfigId);

  return (
    <div id="export-container" className="min-h-screen bg-[#f4f1ea] text-[#1a1a1a] p-4 md:p-8 font-serif selection:bg-stone-300">
      {/* ── Header ── */}
      <div className="max-w-6xl mx-auto mb-8 border-b-2 border-[#1a1a1a] pb-4 flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-stone-500 mb-2">Interactive Airfoil Study</div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">Airfoil Configuration Analysis</h1>
          <p className="text-sm md:text-base italic text-stone-600">
            Compare how flap and slat layouts change lift, pitching moment, and stall behavior.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full xl:w-auto">
          {/* Toggle bar */}
          <div className="flex flex-wrap items-center gap-3 justify-start xl:justify-end">
            <button
              onClick={() => setShowGraph((prev) => !prev)}
              className={`flex items-center gap-2 px-3 py-1.5 border border-[#1a1a1a] text-sm font-bold transition-colors ${showGraph ? 'bg-stone-200 text-[#1a1a1a]' : 'bg-transparent hover:bg-stone-100'}`}
            >
              <LineChart size={16} />
              {showGraph ? 'Hide Lift Graph' : 'Show Lift Graph'}
            </button>

            <button
              onClick={() => setColorMode((prev) => !prev)}
              className={`flex items-center gap-2 px-3 py-1.5 border border-[#1a1a1a] text-sm font-bold transition-colors ${colorMode ? 'bg-stone-200 text-[#1a1a1a]' : 'bg-transparent hover:bg-stone-100'}`}
            >
              <Palette size={16} />
              {colorMode ? 'Use Monochrome' : 'Use Color'}
            </button>

            <button
              onClick={() => setWindTunnel((prev) => !prev)}
              className={`flex items-center gap-2 px-3 py-1.5 border border-[#1a1a1a] text-sm font-bold transition-colors ${windTunnel ? 'bg-blue-900 text-[#f4f1ea] border-blue-900' : 'bg-transparent hover:bg-stone-200'}`}
            >
              <Wind size={16} />
              {windTunnel ? 'Hide Flow Lines' : 'Show Flow Lines'}
            </button>
          </div>

          {/* Sliders + Fidelity */}
          <div className="grid grid-cols-1 lg:grid-cols-[auto_auto_auto] gap-3 items-start border border-stone-300 bg-stone-100/50 p-3 rounded-sm">
            <div className="flex items-center gap-3 px-2 text-sm font-bold">
              <span className="min-w-[78px]">Flaps: {flapDeployment}%</span>
              <input type="range" min="0" max="100" value={flapDeployment} onChange={(e) => setFlapDeployment(Number(e.target.value))} className="w-28 accent-blue-600 cursor-pointer" />
            </div>
            <div className="flex items-center gap-3 px-2 text-sm font-bold">
              <span className="min-w-[78px]">Slats: {slatDeployment}%</span>
              <input type="range" min="0" max="100" value={slatDeployment} onChange={(e) => setSlatDeployment(Number(e.target.value))} className="w-28 accent-orange-600 cursor-pointer" />
            </div>
            <div className="flex flex-wrap gap-2 px-2">
              {['conceptual', 'instructional', 'approximate'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFidelityMode(mode)}
                  className={`px-2.5 py-1 text-xs font-mono border transition-colors ${fidelityMode === mode ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f4f1ea]' : 'border-stone-400 text-stone-700 hover:bg-stone-200'}`}
                >
                  {formatFidelityLabel(mode)}
                </button>
              ))}
            </div>
          </div>

          {/* Figure focus selector */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 border border-stone-300 bg-[#fdfcf9] px-3 py-2 text-xs">
            <div className="font-mono uppercase tracking-[0.14em] text-stone-500">Figure Focus</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedConfigId('all')}
                className={`px-2.5 py-1 border font-mono transition-colors ${selectedConfigId === 'all' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'border-stone-400 hover:bg-stone-100'}`}
              >
                All Figures
              </button>
              {configurations.map((config) => (
                <button
                  key={config.id}
                  onClick={() => setSelectedConfigId(config.id)}
                  className={`px-2.5 py-1 border font-mono transition-colors ${selectedConfigId === config.id ? 'bg-stone-900 text-stone-50 border-stone-900' : 'border-stone-400 hover:bg-stone-100'}`}
                >
                  {config.id}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Context cards ── */}
      <div className="max-w-6xl mx-auto mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-stone-300 bg-[#fdfcf9] p-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500 font-mono mb-2">Interpretation Level</div>
          <div className="font-semibold mb-1">{formatFidelityLabel(fidelityMode)} View</div>
          <p className="text-sm text-stone-600 leading-relaxed">
            {fidelityMode === 'conceptual' && 'Emphasizes the overall trend so the main ideas are easier to spot. This view is illustrative, not literal test data.'}
            {fidelityMode === 'instructional' && 'Balances readability and restraint for studying cause, flow behavior, and tradeoffs. This view is interpretive, not a full simulation.'}
            {fidelityMode === 'approximate' && 'Uses more restrained transitions to stay closer to a conservative visual estimate. It is still intended as a teaching view, not a validated analysis.'}
          </p>
        </div>
        <div className="border border-stone-300 bg-[#fdfcf9] p-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500 font-mono mb-2">Reading Guide</div>
          <div className="font-semibold mb-1">Geometry → Flow → Outcome</div>
          <p className="text-sm text-stone-600 leading-relaxed">
            Read each figure from the device change to the flow response and then to the performance tradeoff.
          </p>
        </div>
        <div className="border border-stone-300 bg-[#fdfcf9] p-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500 font-mono mb-2">Comparison Aid</div>
          <div className="font-semibold mb-1">Baseline Overlay</div>
          <p className="text-sm text-stone-600 leading-relaxed">
            The dashed baseline stays visible behind deployed devices so you can see exactly what changed in the airfoil shape.
          </p>
        </div>
      </div>

      {/* ── Performance Graph ── */}
      <div className="max-w-6xl mx-auto">
        <PerformanceGraph
          active={showGraph}
          colorMode={colorMode}
          selectedConfigId={selectedConfigId}
          flapDeployment={flapDeployment}
          slatDeployment={slatDeployment}
          fidelityMode={fidelityMode}
        />
      </div>

      {/* ── Figure panels ── */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visibleConfigs.map((config) => {
          const displayCl = config.interpolated.cl.toFixed(2);
          const displayCm = config.interpolated.cm.toFixed(2);
          const displayAlpha = config.interpolated.alpha.toFixed(1);
          const flapColor = colorMode ? config.color : 'currentColor';
          const slatColor = colorMode ? '#ea580c' : 'currentColor';
          const flowIntensity = clamp((config.interpolated.alpha - 10) / 20, 0.7, 1.5);

          return (
            <div key={config.id} className="border border-[#1a1a1a] bg-[#fdfcf9] flex flex-col p-4 relative group hover:shadow-lg transition-shadow">
              {/* Top section: data + airfoil vis */}
              <div className="flex flex-col sm:flex-row gap-4 border-b border-stone-300 pb-4 mb-4">
                <div className="sm:w-2/5 flex flex-col justify-between z-10 bg-[#fdfcf9] bg-opacity-90 pr-4 sm:border-r border-stone-300">
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <h2 className="font-bold text-lg flex items-center gap-2">
                          {config.label}
                          {colorMode && (
                            <span className="w-3 h-3 inline-block rounded-full border border-black/20" style={{ backgroundColor: config.color }} />
                          )}
                        </h2>
                        <p className="text-xs italic text-stone-500 mt-1">{config.title}</p>
                      </div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-stone-500 border border-stone-300 px-2 py-1">
                        Figure Summary
                      </div>
                    </div>

                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2">
                        <div className={`font-mono dynamic-text text-sm tracking-tighter w-28 ${colorMode && flapDeployment > 0 ? 'text-blue-700' : ''}`}>
                          C<sub>Lmax</sub> = {displayCl}
                        </div>
                        <Tooltip text="Maximum lift coefficient. This is the highest lift the airfoil reaches in this comparison. Deploying flaps usually raises it by increasing camber.">
                          <Info size={14} className="text-stone-400 hover:text-stone-700 transition-colors cursor-help" />
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="font-mono dynamic-text text-sm tracking-tighter text-stone-600 w-28">
                          C<sub>m stall</sub> = {displayCm}
                        </div>
                        <Tooltip text="Pitching moment near stall. More-negative values indicate a stronger nose-down tendency that the tail or trim system must counter.">
                          <Info size={14} className="text-stone-400 hover:text-stone-700 transition-colors cursor-help" />
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`font-mono dynamic-text text-sm tracking-tighter text-stone-600 w-28 ${colorMode && slatDeployment > 0 ? 'text-orange-600' : ''}`}>
                          α<sub>stall</sub> = {displayAlpha}°
                        </div>
                        <Tooltip text="Approximate stall angle in this teaching model. Higher values mean the airfoil can reach a steeper angle before losing lift, and slats help extend that range.">
                          <Info size={14} className="text-stone-400 hover:text-stone-700 transition-colors cursor-help" />
                        </Tooltip>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500 font-mono mb-2">Configuration Parameters</div>
                    <div className="space-y-1">
                      {config.params.map((param, index) => (
                        <div key={index} className="text-xs font-mono text-stone-700">{param}</div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Airfoil SVG */}
                <div className="sm:w-3/5 relative min-h-[230px] flex items-center justify-center bg-white/50 border border-stone-200">
                  <svg viewBox="-40 -50 160 100" className="w-full h-full overflow-visible">
                    <WindStreamlines alpha={config.interpolated.alpha} active={windTunnel} intensity={flowIntensity} />
                    <line x1="-20" y1="0" x2="110" y2="0" stroke="#ccc" strokeWidth="0.5" strokeDasharray="2 2" />

                    {config.type !== 'baseline' && (
                      <g className="text-stone-400">
                        <AirfoilBody type="baseline" colorMode={false} ghost />
                      </g>
                    )}

                    {/* AoA arrow */}
                    <g className="text-stone-500 vector-path" transform={`rotate(${-config.interpolated.alpha}, -10, 0)`}>
                      <line x1="-35" y1="0" x2="-15" y2="0" stroke="currentColor" strokeWidth="1" />
                      <polygon points="-15,0 -20,-2 -20,2" fill="currentColor" />
                      <text x="-40" y="8" fontSize="6" fontFamily="serif" fontStyle="italic" fill="currentColor" transform={`rotate(${config.interpolated.alpha}, -40, 8)`}>
                        α={displayAlpha}°
                      </text>
                      <path
                        d={`M -15 0 A 15 15 0 0 1 ${-15 * Math.cos((config.interpolated.alpha * Math.PI) / 180)} ${15 * Math.sin((config.interpolated.alpha * Math.PI) / 180)}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="0.5"
                      />
                    </g>

                    {/* Active airfoil + devices */}
                    <g className="text-black">
                      <AirfoilBody type={config.type} colorMode={colorMode} />

                      {(config.type === 'split' || config.type === 'split-modified') && (
                        <>
                          <path d="M 70 6 Q 82 9 96 3" fill="none" stroke="#cfcfcf" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.8" />
                          <g className="vector-path origin-[70px_6px]" transform={`rotate(${(config.gamma ?? config.delta ?? 0) * (flapDeployment / 100)})`}>
                            <line x1="70" y1="6" x2="100" y2="0" stroke={flapColor} strokeWidth="1.5" />
                          </g>
                        </>
                      )}

                      {config.type === 'slotted' && (
                        <>
                          <path d="M 80 -1 Q 88 1 100 1" fill="none" stroke="#cfcfcf" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.8" />
                          <g className="vector-path" style={{ transformOrigin: '80px 0px' }} transform={`translate(${2 * (flapDeployment / 100)}, ${4 * (flapDeployment / 100)}) rotate(${(config.delta ?? 0) * (flapDeployment / 100)})`}>
                            <path
                              d="M 80 -1 C 82 -4, 90 -2, 100 0 C 90 2, 82 4, 80 -1 Z"
                              fill={colorMode ? `${flapColor}20` : 'none'}
                              stroke={flapColor}
                              strokeWidth="1.5"
                            />
                          </g>
                        </>
                      )}

                      {config.type === 'multi' && (
                        <>
                          <path d="M 0 0 Q 3 -4 12 -3" fill="none" stroke="#cfcfcf" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.8" />
                          <path d="M 80 -1 Q 90 0 102 2" fill="none" stroke="#cfcfcf" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.8" />

                          {/* Slat */}
                          <g className="vector-path" style={{ transformOrigin: '5px 0px' }} transform={`translate(${-3 * (slatDeployment / 100)}, ${3 * (slatDeployment / 100)}) rotate(${-(config.slatAngle ?? 0) * (slatDeployment / 100)})`}>
                            <path
                              d="M 0 0 C -2 -6, 5 -12, 12 -3 C 8 -3, 2 -2, 0 0 Z"
                              fill={colorMode ? `${slatColor}20` : 'none'}
                              stroke={slatColor}
                              strokeWidth="1.5"
                            />
                          </g>

                          {/* Trailing elements */}
                          <g className="vector-path" style={{ transformOrigin: '80px 0px' }} transform={`translate(${3 * (flapDeployment / 100)}, ${5 * (flapDeployment / 100)}) rotate(${(config.delta ?? 0) * (flapDeployment / 100)})`}>
                            <path
                              d="M 80 -1 C 82 -3, 85 -2, 88 0 C 85 1, 82 2, 80 -1 Z"
                              fill={colorMode ? `${flapColor}40` : 'none'}
                              stroke={flapColor}
                              strokeWidth="1"
                            />
                            <path
                              d="M 85 1 C 88 -3, 95 -1, 102 2 C 95 4, 88 5, 85 1 Z"
                              fill={colorMode ? `${flapColor}20` : 'none'}
                              stroke={flapColor}
                              strokeWidth="1.5"
                            />
                          </g>
                        </>
                      )}
                    </g>
                  </svg>

                  <div className="absolute bottom-3 right-3 flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.14em] text-stone-500 bg-[#fdfcf9]/90 border border-stone-300 px-2 py-1">
                    <Eye size={12} />
                    Baseline Overlay
                  </div>
                </div>
              </div>

              {/* Narrative: cause → flow → outcome */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="border border-stone-300 p-3 bg-stone-50">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500 font-mono mb-2">Device Change</div>
                  <p className="text-sm text-stone-700 leading-relaxed">{config.narrative.geometry}</p>
                </div>
                <div className="border border-stone-300 p-3 bg-stone-50">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500 font-mono mb-2">Flow Response</div>
                  <p className="text-sm text-stone-700 leading-relaxed">{config.narrative.flow}</p>
                </div>
                <div className="border border-stone-300 p-3 bg-stone-50">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500 font-mono mb-2">Performance Outcome</div>
                  <p className="text-sm text-stone-700 leading-relaxed">{config.narrative.result}</p>
                </div>
              </div>

              {/* Benefit / Tradeoff / Use */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-stone-300 p-3 bg-[#f8f7f4]">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500 font-mono mb-2">Main Benefit</div>
                  <p className="text-sm text-stone-700 leading-relaxed">{config.narrative.benefit}</p>
                </div>
                <div className="border border-stone-300 p-3 bg-[#f8f7f4]">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500 font-mono mb-2">Main Tradeoff</div>
                  <p className="text-sm text-stone-700 leading-relaxed">{config.narrative.cost}</p>
                </div>
                <div className="border border-stone-300 p-3 bg-[#f8f7f4]">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500 font-mono mb-2">Typical Use</div>
                  <p className="text-sm text-stone-700 leading-relaxed">{config.narrative.bestUse}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div className="max-w-6xl mx-auto mt-10 border-t-2 border-[#1a1a1a] pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-stone-500">
          Interactive Airfoil Study · {configurations.length} Configurations · View: {formatFidelityLabel(fidelityMode)}
        </div>
        <div className="text-[11px] font-mono text-stone-400">
          Flaps {flapDeployment}% · Slats {slatDeployment}% · {selectedConfigId === 'all' ? 'All Figures' : `Fig. ${selectedConfigId}`}
        </div>
      </div>
    </div>
  );
}
