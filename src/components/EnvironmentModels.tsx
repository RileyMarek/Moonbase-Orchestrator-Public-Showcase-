/**
 * Author: Riley Marek
 * Project: Project Moonbase
 * File: EnvironmentModels.tsx
 * Description: Contains 3D compositions for environmental landmarks (Huts, Rockets, Shelves, Conveyors).
 * Date: 2026-09-08
 */

import React from 'react';

/**
 * Name: LunarHut
 * Description: Renders a moon base habitat with a teal dome and orange lights.
 */
export const LunarHut: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    {/* Base */}
    <mesh position={[0, 1, 0]}>
      <cylinderGeometry args={[3, 3, 2, 32]} />
      <meshStandardMaterial color="#64748b" />
    </mesh>
    {/* Teal Glass Dome */}
    <mesh position={[0, 2, 0]}>
      <sphereGeometry args={[3, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color="#0d9488" transparent opacity={0.6} />
    </mesh>
    {/* Light Node on top */}
    <mesh position={[0, 5, 0]}>
      <cylinderGeometry args={[0.3, 0.3, 0.5]} />
      <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={2} />
    </mesh>
    {/* Stairs */}
    <mesh position={[3, 0.5, 0]}>
      <boxGeometry args={[1.5, 1, 2]} />
      <meshStandardMaterial color="#475569" />
    </mesh>
  </group>
);

/**
 * Name: Rocket
 * Description: Renders a tall spacecraft structure for the lunar base.
 */
export const Rocket: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    <mesh position={[0, 4, 0]}>
      <cylinderGeometry args={[1.5, 1.5, 8, 32]} />
      <meshStandardMaterial color="#e2e8f0" />
    </mesh>
    <mesh position={[0, 9, 0]}>
      <coneGeometry args={[1.5, 3, 32]} />
      <meshStandardMaterial color="#0ea5e9" />
    </mesh>
    {/* Fins */}
    {[-1, 1].map(x => 
      [-1, 1].map(z => (
        <mesh key={`fin-${x}-${z}`} position={[x * 1.5, 1, z * 1.5]} rotation={[0, Math.PI/4, 0]}>
          <boxGeometry args={[0.2, 2, 1.5]} />
          <meshStandardMaterial color="#0ea5e9" />
        </mesh>
      ))
    )}
  </group>
);

/**
 * Name: FactoryShelf
 * Description: Renders an industrial shelving unit with cargo.
 */
export const FactoryShelf: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    {/* Frame */}
    <mesh position={[0, 2, 0]}>
      <boxGeometry args={[4, 4, 1.5]} />
      <meshStandardMaterial color="#334155" wireframe />
    </mesh>
    {/* Shelves */}
    {[0.5, 1.5, 2.5, 3.5].map(y => (
      <group key={`shelf-${y}`}>
        <mesh position={[0, y, 0]}>
          <boxGeometry args={[3.8, 0.1, 1.4]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        <mesh position={[Math.sin(y * 7.3) * .8, y + 0.3, 0]}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="#b45309" />
        </mesh>
      </group>
    ))}
  </group>
);

/**
 * Name: ConveyorBelt
 * Description: Renders an industrial conveyor belt with items.
 */
export const ConveyorBelt: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    <mesh position={[0, 1, 0]}>
      <boxGeometry args={[10, 0.2, 2]} />
      <meshStandardMaterial color="#1e293b" />
    </mesh>
    <mesh position={[0, 0.5, 0]}>
      <boxGeometry args={[9.5, 1, 1.5]} />
      <meshStandardMaterial color="#334155" />
    </mesh>
    {/* Items on belt */}
    {[-4, -2, 0, 2, 4].map(x => (
      <mesh key={`item-${x}`} position={[x, 1.25, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#0284c7" />
      </mesh>
    ))}
  </group>
);
