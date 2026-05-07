import React, { useEffect, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, useGLTF, useAnimations, ContactShadows } from "@react-three/drei"
import * as THREE from "three"

// --- Wind Turbine Model with Native Animation ---
function TurbineModel({
  windSpeed,
  speedMultiplier = 1,
  position = [5, 16, -2],
  scale = 0.80,
  rotation = [0, 30, 0],
}: {
  windSpeed: number
  speedMultiplier?: number
  position?: [number, number, number]
  scale?: number
  rotation?: [number, number, number]
}) {
  const groupRef = useRef<THREE.Group>(null)
  const { scene, animations } = useGLTF("/wind_turbine.glb")
  const { actions, names } = useAnimations(animations, groupRef)

  // Play the first (or named) animation, control speed via timeScale
  useEffect(() => {
    if (names.length === 0) return

    const actionName = names[0] // or use a specific name like "spin", "rotate", etc.
    const action = actions[actionName]
    if (!action) return

    action.play()
    action.setLoop(THREE.LoopRepeat, Infinity)

    return () => {
      action.stop()
    }
  }, [actions, names])

  // Sync animation speed to wind speed every frame
  useFrame(() => {
    if (names.length === 0) return
    const action = actions[names[0]]
    if (!action) return

    // Base speed from wind, multiplied by user control
    const targetTimeScale = (windSpeed / 20) * speedMultiplier
    action.timeScale = targetTimeScale
  })

  return (
    <group ref={groupRef} position={position} scale={scale} rotation={rotation}>
      <primitive object={scene} castShadow receiveShadow />
    </group>
  )
}

// --- Ground ---

// --- Lighting ---
function Lighting({
  directionalIntensity,
  ambientIntensity,
  isDay,
}: {
  directionalIntensity: number
  ambientIntensity: number
  isDay: boolean
}) {
  return (
    <>
      <ambientLight intensity={ambientIntensity} color="#ffffff" />
      <directionalLight
        position={[50, 50, 30]}
        intensity={directionalIntensity}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      {!isDay && (
        <pointLight position={[-30, 20, -30]} intensity={0.3} color="#6688ff" />
      )}
    </>
  )
}

// --- Main Viewer ---
interface WindTurbineViewerProps {
  windSpeed: number
  isDay?: boolean
}

export const WindTurbineViewer: React.FC<WindTurbineViewerProps> = ({
  windSpeed,
  isDay = true,
}) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Canvas
        shadows
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 50] }}
        style={{ background: "transparent" }}
      >
        <Lighting
          directionalIntensity={2}
          ambientIntensity={0.8}
          isDay={isDay}
        />

        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.5}
          scale={100}
          blur={2}
          far={50}
        />

        <React.Suspense
          fallback={
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="orange" wireframe />
            </mesh>
          }
        >
          <TurbineModel windSpeed={windSpeed} />
        </React.Suspense>

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minDistance={10}
          maxDistance={200}
          maxPolarAngle={Math.PI / 2 - 0.05}
          target={[0, 10, 0]}
          autoRotate={false}
          autoRotateSpeed={1}
        />
      </Canvas>
    </div>
  )
}