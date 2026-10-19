import { Environment, Grid, Lightformer } from '@react-three/drei';
import { useAppStore } from '../store';

export function SceneStage() {
  const light = useAppStore(s => s.colorMode === 'light');
  return <>
    <color attach="background" args={[light ? '#e6ecf0' : '#101b28']}/>
    <fog attach="fog" args={[light ? '#e6ecf0' : '#101b28', 16, 55]}/>
    <hemisphereLight args={[light ? '#f7fbff' : '#b9d7f4', light ? '#8b9baa' : '#283242', .8]}/>
    <directionalLight position={[7,12,8]} intensity={3.1} color="#fff7ea" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-camera-near={.1} shadow-camera-far={45} shadow-normalBias={.025} shadow-bias={-.00015} shadow-radius={3}/>
    <directionalLight position={[-6,5,-4]} intensity={1.25} color="#a6ceff"/>
    <Environment resolution={128} environmentIntensity={.45}>
      <Lightformer intensity={2.5} position={[0,7,0]} rotation={[Math.PI/2,0,0]} scale={[10,10,1]}/>
      <Lightformer intensity={2} color="#b6d9ff" position={[-5,3,0]} rotation={[0,Math.PI/2,0]} scale={[4,6,1]}/>
      <Lightformer intensity={1.5} position={[3,4,5]} scale={[5,3,1]}/>
    </Environment>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.015,0]} receiveShadow>
      <planeGeometry args={[160,160]}/><meshStandardMaterial color={light ? '#dfe6eb' : '#172536'} roughness={.84} metalness={.08}/>
    </mesh>
    <Grid infiniteGrid cellSize={1} sectionSize={5} cellThickness={.45} sectionThickness={.75} fadeDistance={28} fadeStrength={1.5} cellColor={light ? '#bac7d0' : '#30465b'} sectionColor={light ? '#a9b9c4' : '#44637c'} position={[0,.002,0]}/>
  </>;
}
