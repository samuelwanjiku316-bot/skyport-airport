import { useRef } from 'react'; import { Canvas, useFrame } from '@react-three/fiber'; import { Stars, Float } from '@react-three/drei';
function Plane() {
  const g = useRef();
  useFrame(({ clock }) => { const t = clock.elapsedTime * 0.45; g.current.position.set(Math.cos(t) * 4.2, Math.sin(t * 2) * 0.5 + 0.6, Math.sin(t) * 4.2); g.current.rotation.y = -t - Math.PI / 2; g.current.rotation.x = 0.25; });
  const m = <meshStandardMaterial color="#e8f6ff" emissive="#00e5ff" emissiveIntensity={0.25} metalness={0.7} roughness={0.25} />;
  return (<group ref={g} scale={0.9}>
    <mesh rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.16, 1.5, 6, 16]} />{m}</mesh>
    <mesh position={[0, 0, 0]}><boxGeometry args={[0.55, 0.03, 2.3]} />{m}</mesh>
    <mesh position={[-0.75, 0.2, 0]}><boxGeometry args={[0.3, 0.4, 0.03]} />{m}</mesh>
    <mesh position={[-0.7, 0.05, 0]}><boxGeometry args={[0.3, 0.03, 0.8]} />{m}</mesh>
    <pointLight color="#ff2bd6" intensity={2} distance={4} />
  </group>);
}
function Globe() {
  const r = useRef(); useFrame((_, d) => { r.current.rotation.y += d * 0.15; });
  return (<group ref={r}>
    <mesh><sphereGeometry args={[2.2, 48, 48]} /><meshStandardMaterial color="#04122b" emissive="#062a5a" emissiveIntensity={0.6} /></mesh>
    <mesh><icosahedronGeometry args={[2.25, 3]} /><meshBasicMaterial color="#00e5ff" wireframe transparent opacity={0.35} /></mesh>
  </group>);
}
function Rig() { useFrame(({ camera, pointer }) => { const s = Math.min(window.scrollY / 600, 1); camera.position.x += (pointer.x * 1.2 - camera.position.x) * 0.04; camera.position.y += (1.5 - s * 2 + pointer.y * 0.5 - camera.position.y) * 0.04; camera.position.z = 8.5 - s * 3; camera.lookAt(0, 0, 0); }); return null; }
export default function Scene() {
  return (<Canvas className="scene" camera={{ position: [0, 1.5, 8.5], fov: 55 }} dpr={[1, 2]}>
    <color attach="background" args={['#030612']} /><fog attach="fog" args={['#030612', 10, 24]} />
    <ambientLight intensity={0.5} /><pointLight position={[6, 5, 5]} intensity={40} color="#00e5ff" />
    <Stars radius={60} depth={40} count={3500} factor={4} fade speed={1} />
    <Float speed={1.5} floatIntensity={0.4}><Globe /></Float><Plane />
    <gridHelper args={[60, 60, '#ff2bd6', '#12335c']} position={[0, -3, 0]} /><Rig />
  </Canvas>);
}
