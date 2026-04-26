import React, { useCallback, useEffect, useState, useRef } from 'react';
import * as Cesium from 'cesium';

interface CameraGizmoProps {
  viewer: Cesium.Viewer | null;
}

/** Converts Cesium pitch (radians, 0=horizontal, -PI/2=top-down) to a 0-100 tilt slider value */
function pitchToTilt(pitch: number): number {
  // pitch: 0 (horizontal) to -PI/2 (top-down), map to 0 (top-down) – 100 (horizontal)
  const clamped = Math.max(-Math.PI / 2, Math.min(0, pitch));
  return Math.round(((clamped + Math.PI / 2) / (Math.PI / 2)) * 100);
}

function tiltToPitch(tilt: number): number {
  return ((tilt / 100) * Math.PI) / 2 - Math.PI / 2;
}

function headingToDeg(heading: number): number {
  return Math.round(Cesium.Math.toDegrees(heading) % 360);
}

export const CameraGizmo: React.FC<CameraGizmoProps> = ({ viewer }) => {
  const [tilt, setTilt] = useState(30); // 0=top-down, 100=horizontal
  const [heading, setHeading] = useState(0); // degrees
  const animFrameRef = useRef<number | null>(null);

  // Keep tilt/heading in sync with actual camera state
  useEffect(() => {
    if (!viewer) return;
    const poll = () => {
      if (!viewer.isDestroyed()) {
        const pitch = viewer.camera.pitch;
        const h = viewer.camera.heading;
        setTilt(pitchToTilt(pitch));
        setHeading(headingToDeg(h));
      }
      animFrameRef.current = requestAnimationFrame(poll);
    };
    animFrameRef.current = requestAnimationFrame(poll);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [viewer]);

  const applyTilt = useCallback((newTilt: number) => {
    if (!viewer) return;
    const pitch = tiltToPitch(newTilt);
    viewer.camera.setView({
      orientation: {
        heading: viewer.camera.heading,
        pitch,
        roll: viewer.camera.roll,
      },
    });
    setTilt(newTilt);
  }, [viewer]);

  const applyHeading = useCallback((delta: number) => {
    if (!viewer) return;
    const newHeading = viewer.camera.heading + Cesium.Math.toRadians(delta);
    viewer.camera.setView({
      orientation: {
        heading: newHeading,
        pitch: viewer.camera.pitch,
        roll: viewer.camera.roll,
      },
    });
  }, [viewer]);

  const resetNorth = useCallback(() => {
    if (!viewer) return;
    viewer.camera.setView({
      orientation: {
        heading: 0,
        pitch: viewer.camera.pitch,
        roll: 0,
      },
    });
  }, [viewer]);

  const setPreset = useCallback((preset: 'top' | 'tilt45' | 'tilt60') => {
    if (!viewer) return;
    const pitchMap = { top: -Math.PI / 2, tilt45: -Math.PI / 4, tilt60: -Math.PI / 3 };
    viewer.camera.flyTo({
      destination: viewer.camera.positionWC,
      orientation: {
        heading: viewer.camera.heading,
        pitch: pitchMap[preset],
        roll: 0,
      },
      duration: 0.6,
    });
  }, [viewer]);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Compass Ring */}
      <div
        className="relative w-14 h-14 rounded-full border-2 border-white/20 bg-black/50 backdrop-blur-md shadow-xl flex items-center justify-center cursor-pointer group"
        title="Reset North"
        onClick={resetNorth}
        style={{ transform: `rotate(${-heading}deg)`, transition: 'transform 0.1s linear' }}
      >
        {/* Cardinal ticks */}
        {['N','E','S','W'].map((dir, i) => (
          <div
            key={dir}
            className="absolute inset-0 flex items-start justify-center pt-0.5"
            style={{ transform: `rotate(${i * 90}deg)` }}
          >
            <span
              className={`text-[9px] font-bold leading-none select-none ${dir === 'N' ? 'text-red-400' : 'text-white/60'}`}
            >
              {dir}
            </span>
          </div>
        ))}
        {/* Needle */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[2px] h-4 bg-red-400 rounded-t-full" style={{ marginBottom: '8px' }} />
        </div>
        {/* Center dot */}
        <div className="w-2 h-2 rounded-full bg-white/80 shadow z-10" />
      </div>

      {/* Rotate buttons */}
      <div className="flex gap-1">
        <button
          onClick={() => applyHeading(-15)}
          className="w-6 h-6 rounded-full bg-black/50 backdrop-blur border border-white/20 text-white/80 hover:bg-white/20 flex items-center justify-center transition-colors"
          title="Rotate Left"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M6 2 A4 4 0 0 0 2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <polygon points="1.5,4.5 3,7 4.5,5" fill="currentColor"/>
          </svg>
        </button>
        <button
          onClick={() => applyHeading(15)}
          className="w-6 h-6 rounded-full bg-black/50 backdrop-blur border border-white/20 text-white/80 hover:bg-white/20 flex items-center justify-center transition-colors"
          title="Rotate Right"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M4 2 A4 4 0 0 1 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <polygon points="8.5,4.5 7,7 5.5,5" fill="currentColor"/>
          </svg>
        </button>
      </div>

      {/* Tilt Preset Buttons */}
      <div className="flex flex-col gap-1 bg-black/50 backdrop-blur-md rounded-lg border border-white/20 p-1 shadow-xl w-14">
        <button
          onClick={() => setPreset('top')}
          className="px-1 py-1 rounded text-[9px] font-semibold text-white/70 hover:bg-white/20 hover:text-white transition-colors leading-none"
          title="Top-down view"
        >
          TOP
        </button>
        <button
          onClick={() => setPreset('tilt45')}
          className="px-1 py-1 rounded text-[9px] font-semibold text-white/70 hover:bg-white/20 hover:text-white transition-colors leading-none"
          title="45° tilt"
        >
          45°
        </button>
        <button
          onClick={() => setPreset('tilt60')}
          className="px-1 py-1 rounded text-[9px] font-semibold text-white/70 hover:bg-white/20 hover:text-white transition-colors leading-none"
          title="60° tilt"
        >
          60°
        </button>
      </div>

      {/* Tilt Slider */}
      <div className="flex flex-col items-center gap-1 bg-black/50 backdrop-blur-md rounded-lg border border-white/20 p-2 shadow-xl">
        <span className="text-[9px] text-white/60 font-semibold uppercase tracking-wider">Tilt</span>
        <input
          type="range"
          min={0}
          max={100}
          value={tilt}
          onChange={(e) => applyTilt(Number(e.target.value))}
          className="h-20 cursor-pointer appearance-none [writing-mode:vertical-lr] [direction:rtl] accent-blue-400"
          style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
          title={`Tilt: ${tilt}%`}
        />
        <span className="text-[9px] text-white/50 font-mono">{tilt}%</span>
      </div>
    </div>
  );
};
