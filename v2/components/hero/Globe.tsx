"use client";

/* Globe.tsx - the R3F globe for Act 2 ("the search that travels").
 *
 * A fibonacci-sphere dot field (matte ink, never blooms) sits low in frame and
 * rotates as the film scrubs. Idle cities glow bronze (expert activity). As the
 * search scans, the active city lifts to green and throws an arc up toward the
 * probe; after the scan one arc holds forest-green (the match). Bloom is applied
 * only to the green search activity so the dot field stays quiet behind it.
 *
 * Choreography numbers come from film.ts (shared with the DOM timeline). The one
 * approximation vs the 2D prototype: the arc reaches a fixed world anchor that
 * tracks the probe's vertical position, rather than the probe's exact DOM box. */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { CITIES, PHASES, clamp, easeIO, lerp, seg } from "./film";
import { readGlobePalette } from "./tokens";

const CAM_Z = 6.2;

/* evenly spread N points on a unit sphere, scaled to radius R */
function fibonacci(n: number, R: number): Float32Array {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = 2.39996 * i;
    out[i * 3] = Math.cos(th) * r * R;
    out[i * 3 + 1] = y * R;
    out[i * 3 + 2] = Math.sin(th) * r * R;
  }
  return out;
}

/* the same city placement the prototype used, scaled to radius R */
function cityLocals(R: number): THREE.Vector3[] {
  return CITIES.map((_, i) => {
    const a = (i / CITIES.length) * Math.PI * 2;
    const b = (i % 2 ? 0.35 : -0.15) + (i % 3) * 0.14;
    return new THREE.Vector3(
      Math.cos(a) * Math.cos(b) * R,
      Math.sin(b) * R,
      Math.sin(a) * Math.cos(b) * R
    );
  });
}

const POINT_VERT = /* glsl */ `
  uniform float uAlpha;
  uniform float uSize;
  uniform float uDpr;
  uniform float uZFront;
  uniform float uZBack;
  varying float vFade;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    // front dots (nearer the camera) read brighter; back dots recede
    vFade = clamp(smoothstep(uZBack, uZFront, mv.z), 0.06, 1.0);
    gl_PointSize = uSize * uDpr * (0.6 + vFade * 0.9);
  }
`;

const POINT_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAlpha;
  varying float vFade;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float mask = smoothstep(0.5, 0.34, d);
    if (mask <= 0.001) discard;
    gl_FragColor = vec4(uColor, vFade * uAlpha * mask * 0.9);
  }
`;

const ARC_SEGMENTS = 24;

type SceneProps = {
  progressRef: RefObject<number>;
  mobile: boolean;
  reduced: boolean;
  staticProgress: number;
};

function GlobeScene({ progressRef, mobile, reduced, staticProgress }: SceneProps) {
  const { gl } = useThree();
  const palette = useMemo(readGlobePalette, []);
  const R = mobile ? 2.6 : 3.2;
  const N = mobile ? 480 : 850;
  // drop the sphere center below the frame so only the upper cap rises into view
  const groupY = -R * 0.75;

  const positions = useMemo(() => fibonacci(N, R), [N, R]);
  const cities = useMemo(() => cityLocals(R), [R]);

  const groupRef = useRef<THREE.Group>(null);
  const pointsMat = useRef<THREE.ShaderMaterial>(null);
  const cityRefs = useRef<(THREE.Mesh | null)[]>([]);

  const pointUniforms = useMemo(
    () => ({
      uAlpha: { value: 0 },
      uSize: { value: mobile ? 2.6 : 2.4 },
      uDpr: { value: gl.getPixelRatio() },
      uZFront: { value: R - CAM_Z },
      uZBack: { value: -R - CAM_Z },
      uColor: { value: palette.ink.clone() },
    }),
    [gl, R, mobile, palette]
  );

  /* one arc line, repointed each frame to the active / match city.
     Fixed-size buffer + draw range so there is no per-frame allocation. */
  const arc = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array((ARC_SEGMENTS + 1) * 3), 3)
    );
    const m = new THREE.LineBasicMaterial({
      transparent: true,
      depthTest: false,
      color: palette.sage.clone(),
    });
    const line = new THREE.Line(g, m);
    line.frustumCulled = false;
    line.renderOrder = 2;
    return line;
  }, [palette]);

  // scratch vectors (avoid per-frame allocation)
  const cityWorld = useMemo(() => new THREE.Vector3(), []);
  const anchor = useMemo(() => new THREE.Vector3(), []);
  const control = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const matchColor = useMemo(
    () => palette.sage.clone().multiplyScalar(2.4),
    [palette]
  );
  const activeColor = useMemo(
    () => palette.sage.clone().multiplyScalar(1.5),
    [palette]
  );

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const p = reduced ? staticProgress : progressRef.current;
    const t = state.clock.elapsedTime;

    // globe fades in over Act 1->2, then clears as the product panel rises (Act 3)
    const alpha =
      easeIO(seg(p, PHASES.globeIn[0], PHASES.globeIn[1])) *
      (1 - easeIO(seg(p, PHASES.globeOut[0], PHASES.globeOut[1])));

    group.rotation.y = (reduced ? 0.6 : t * 0.025) + p * 2.6;
    if (pointsMat.current) pointsMat.current.uniforms.uAlpha.value = alpha;

    // where the probe sits, mapped from screen % to a world Y the arc reaches
    const flyEase = easeIO(seg(p, PHASES.probeFly[0], PHASES.probeFly[1]));
    anchor.set(0, lerp(0.2, 1.3, flyEase), 0.8);

    // which city is the search touching
    const scan = seg(p, PHASES.scan[0], PHASES.scan[1]);
    const activeIdx = Math.min(
      CITIES.length - 1,
      Math.floor(scan * CITIES.length)
    );
    const matchHolds = p > PHASES.matchResolve[0];

    // update every marker's look + visibility (cull the back hemisphere)
    for (let i = 0; i < cities.length; i++) {
      const mesh = cityRefs.current[i];
      if (!mesh) continue;
      mesh.getWorldPosition(cityWorld);
      const front = cityWorld.z > 0.05;
      const isMatch = matchHolds && i === 0;
      const isActive = !matchHolds && i === activeIdx && scan > 0 && scan < 1;
      mesh.visible = front && alpha > 0.02;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = alpha;
      if (isMatch) mat.color.copy(matchColor);
      else if (isActive) mat.color.copy(activeColor);
      else mat.color.copy(palette.bronze);
      const s = isMatch ? 1.7 : isActive ? 1.4 : 1;
      mesh.scale.setScalar(s);
    }

    // draw the one arc that matters (active during the scan, match after)
    const arcMat = arc.material as THREE.LineBasicMaterial;
    const targetIdx = matchHolds ? 0 : activeIdx;
    const targetMesh = cityRefs.current[targetIdx];
    let drawn = 0;
    if (targetMesh && alpha > 0.02 && (matchHolds || (scan > 0 && scan < 1))) {
      targetMesh.getWorldPosition(cityWorld);
      if (cityWorld.z > 0.05) {
        const drawT = matchHolds
          ? 1
          : seg(scan * CITIES.length - activeIdx, 0.15, 0.85);
        control
          .copy(cityWorld)
          .add(anchor)
          .multiplyScalar(0.5);
        control.y += cityWorld.distanceTo(anchor) * 0.32;
        control.z += 0.5;
        const count = Math.max(2, Math.floor(ARC_SEGMENTS * drawT) + 1);
        const attr = arc.geometry.getAttribute(
          "position"
        ) as THREE.BufferAttribute;
        for (let k = 0; k < count; k++) {
          const u = (k / ARC_SEGMENTS) as number;
          // quadratic bezier city -> control -> anchor
          const mu = 1 - u;
          tmp
            .copy(cityWorld)
            .multiplyScalar(mu * mu)
            .addScaledVector(control, 2 * mu * u)
            .addScaledVector(anchor, u * u);
          attr.setXYZ(k, tmp.x, tmp.y, tmp.z);
        }
        attr.needsUpdate = true;
        arcMat.color.copy(matchHolds ? matchColor : palette.sage);
        arcMat.opacity = alpha;
        drawn = count;
      }
    }
    arc.geometry.setDrawRange(0, drawn);
    arc.visible = drawn > 1;
  });

  return (
    <>
      <group ref={groupRef} position={[0, groupY, 0]}>
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[positions, 3]}
            />
          </bufferGeometry>
          <shaderMaterial
            ref={pointsMat}
            args={[
              {
                uniforms: pointUniforms,
                vertexShader: POINT_VERT,
                fragmentShader: POINT_FRAG,
                transparent: true,
                depthWrite: false,
                depthTest: false,
              },
            ]}
          />
        </points>
        {cities.map((c, i) => (
          <mesh
            key={i}
            position={c}
            ref={(el) => {
              cityRefs.current[i] = el;
            }}
          >
            <sphereGeometry args={[0.04, 14, 14]} />
            <meshBasicMaterial transparent color={palette.bronze} />
          </mesh>
        ))}
      </group>
      <primitive object={arc} />
      <EffectComposer>
        <Bloom
          intensity={0.75}
          luminanceThreshold={0.5}
          luminanceSmoothing={0.25}
          mipmapBlur
          radius={0.5}
        />
      </EffectComposer>
    </>
  );
}

type GlobeProps = {
  progressRef: RefObject<number>;
  mobile: boolean;
  reduced: boolean;
  /** film progress to freeze on when reduced motion is on */
  staticProgress?: number;
  className?: string;
};

export default function Globe({
  progressRef,
  mobile,
  reduced,
  staticProgress = 0.55,
  className,
}: GlobeProps) {
  return (
    <Canvas
      className={className}
      flat
      dpr={[1, mobile ? 1.5 : 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [0, 0, CAM_Z], fov: 42, near: 0.1, far: 100 }}
      frameloop={reduced ? "demand" : "always"}
      style={{ pointerEvents: "none" }}
    >
      <GlobeScene
        progressRef={progressRef}
        mobile={mobile}
        reduced={reduced}
        staticProgress={staticProgress}
      />
    </Canvas>
  );
}
