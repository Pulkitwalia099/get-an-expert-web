"use client";

/* Globe.tsx - the R3F globe for Act 02 ("the search"), restructured for "The Wall".
 *
 * A fibonacci-sphere dot field (matte ink, never blooms) sits centered in the
 * search theatre and rotates as the film scrubs. Idle cities glow bronze (expert
 * activity within approved access). As the search scans, the active city lifts to
 * green and throws an arc up toward the detached probe; after the scan one dot
 * (Barcelona, index 0) holds forest-green as the match. Bloom is applied only to
 * the green search activity so the dot field stays quiet behind it.
 *
 * The globe also projects the held match dot to screen coordinates each frame
 * (matchDotRef), so the DOM match card can emerge from exactly that point.
 *
 * Choreography numbers come from film.ts (shared with the DOM timeline). The one
 * approximation vs the 2D prototype: the arc reaches a fixed world anchor that
 * tracks the probe's vertical position, rather than the probe's exact DOM box. */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import {
  CITIES,
  HELD_LAT,
  HOLD,
  HOLD_TARGET_AZ,
  MATCH_HOLDS_AT,
  PHASES,
  easeIO,
  lerp,
  seg,
} from "./film";
import { readGlobePalette } from "./tokens";

const CAM_Z = 6.2;
const SPIN = 0.21; // free-spin speed (rad/s), matches the prototype's 0.0035/frame

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

/* city placement spread over the sphere, scaled to radius R */
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

/* fresnel limb glow: transparent except at the grazing silhouette, so the dome
   reads as a sphere. Intensity rises with the dusk grade. */
const RIM_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const RIM_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vView))), uPower);
    gl_FragColor = vec4(uColor, f * uIntensity);
  }
`;

const ARC_SEGMENTS = 24;

type SceneProps = {
  progressRef: RefObject<number>;
  matchDotRef: RefObject<[number, number]>;
  gradeRef: RefObject<number>;
  mobile: boolean;
  reduced: boolean;
  staticProgress: number;
};

function GlobeScene({
  progressRef,
  matchDotRef,
  gradeRef,
  mobile,
  reduced,
  staticProgress,
}: SceneProps) {
  const { gl, camera } = useThree();
  const palette = useMemo(readGlobePalette, []);
  const R = mobile ? 1.7 : 2.0;
  const N = mobile ? 480 : 850;

  const positions = useMemo(() => fibonacci(N, R), [N, R]);
  const cities = useMemo(() => {
    const c = cityLocals(R);
    // the held city (index 0) sits lower on the front so, once the spin eases to
    // the hold angle, it projects into the dome's lower-right quadrant (4-5 o'clock)
    c[0] = new THREE.Vector3(Math.cos(HELD_LAT) * R, Math.sin(HELD_LAT) * R, 0);
    return c;
  }, [R]);
  // rotation.y that brings the held city to the target front-right azimuth.
  // three.js world azimuth = localAzimuth - rotation.y, so rot = phi0 - target.
  const HOLD_ROT = useMemo(
    () => Math.atan2(cities[0].z, cities[0].x) - HOLD_TARGET_AZ,
    [cities]
  );

  const groupRef = useRef<THREE.Group>(null);
  const pointsMat = useRef<THREE.ShaderMaterial>(null);
  const rimMat = useRef<THREE.ShaderMaterial>(null);
  const cityRefs = useRef<(THREE.Mesh | null)[]>([]);
  // rotation hold state: free spin, then ease to HOLD_ROT over the HOLD window
  const rotRef = useRef(0);
  const rotFromRef = useRef<number | null>(null);
  const rotToRef = useRef<number | null>(null);

  const pointUniforms = useMemo(
    () => ({
      uAlpha: { value: 0 },
      uSize: { value: mobile ? 2.8 : 2.6 },
      uDpr: { value: gl.getPixelRatio() },
      uZFront: { value: R - CAM_Z },
      uZBack: { value: -R - CAM_Z },
      uColor: { value: palette.ink.clone() },
    }),
    [gl, R, mobile, palette]
  );

  const rimUniforms = useMemo(
    () => ({
      uColor: { value: palette.paper.clone() },
      uIntensity: { value: 0 },
      uPower: { value: 2.6 },
    }),
    [palette]
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
  const proj = useMemo(() => new THREE.Vector3(), []);
  const matchColor = useMemo(
    () => palette.sage.clone().multiplyScalar(2.4),
    [palette]
  );
  const activeColor = useMemo(
    () => palette.sage.clone().multiplyScalar(1.5),
    [palette]
  );
  // dome dots grade from matte ink (day) to warm light (dusk) so they stay
  // legible when the room darkens behind the globe. Isolated dusk experiment.
  const domeDay = useMemo(() => palette.ink.clone(), [palette]);
  const domeNight = useMemo(() => palette.paper.clone(), [palette]);
  const domeScratch = useMemo(() => palette.ink.clone(), [palette]);

  useFrame((_state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const p = reduced ? staticProgress : progressRef.current;
    const grade = reduced ? 0 : gradeRef.current;

    // the theatre wrapper (DOM) owns the fade in/out; the dot field stays full.
    const alpha = 1;

    // free spin (time-based), then ease to the hold angle over the HOLD window and
    // freeze there, so the match dot pins in the dome's lower-right quadrant.
    if (reduced) {
      group.rotation.y = 0.6;
    } else {
      const holdT = easeIO(seg(p, HOLD[0], HOLD[1]));
      if (holdT <= 0) {
        rotRef.current += delta * SPIN;
        rotFromRef.current = null;
        rotToRef.current = null;
      } else {
        if (rotToRef.current === null) {
          rotFromRef.current = rotRef.current;
          let d = (HOLD_ROT - rotRef.current) % (2 * Math.PI);
          if (d > Math.PI) d -= 2 * Math.PI;
          if (d <= -Math.PI) d += 2 * Math.PI;
          rotToRef.current = rotRef.current + d;
        }
        const from = rotFromRef.current ?? rotRef.current;
        const to = rotToRef.current ?? rotRef.current;
        rotRef.current = lerp(from, to, holdT);
      }
      group.rotation.y = rotRef.current;
    }

    if (pointsMat.current) {
      pointsMat.current.uniforms.uAlpha.value = alpha;
      // dusk grade: lighten the dome dots as the room darkens (day -> dusk)
      domeScratch.copy(domeDay).lerp(domeNight, grade);
      pointsMat.current.uniforms.uColor.value.copy(domeScratch);
    }
    // limb glow rises with the dusk grade so the dome reads as a sphere at night
    if (rimMat.current)
      rimMat.current.uniforms.uIntensity.value = 0.1 + grade * 0.14;

    // where the probe sits, mapped to a world Y the arc reaches up toward
    const flyEase = easeIO(seg(p, PHASES.probeRise[0], PHASES.probeRise[1]));
    anchor.set(0, lerp(0.2, R * 0.95, flyEase), 0.8);

    // which city is the search touching (spec globe window: 0.26 -> 0.52)
    const scan = seg(p, PHASES.scan[0], PHASES.scan[1]);
    const activeIdx = Math.min(
      CITIES.length - 1,
      Math.floor(scan * CITIES.length)
    );
    const matchHolds = p > MATCH_HOLDS_AT;

    // update every marker's look + visibility (cull the back hemisphere)
    for (let i = 0; i < cities.length; i++) {
      const mesh = cityRefs.current[i];
      if (!mesh) continue;
      mesh.getWorldPosition(cityWorld);
      const front = cityWorld.z > 0.05;
      const isMatch = matchHolds && i === 0;
      const isActive = !matchHolds && i === activeIdx && scan > 0 && scan < 1;
      mesh.visible = front;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = alpha;
      if (isMatch) mat.color.copy(matchColor);
      else if (isActive) mat.color.copy(activeColor);
      else mat.color.copy(palette.bronze);
      const s = isMatch ? 1.9 : isActive ? 1.5 : 1;
      mesh.scale.setScalar(s);
    }

    // project the held match dot (Barcelona) to screen coords for the DOM origin
    if (matchHolds) {
      const held = cityRefs.current[0];
      if (held) {
        held.getWorldPosition(proj);
        proj.project(camera);
        const rect = gl.domElement.getBoundingClientRect();
        const sx = rect.left + (proj.x * 0.5 + 0.5) * rect.width;
        const sy = rect.top + (-proj.y * 0.5 + 0.5) * rect.height;
        matchDotRef.current[0] = (sx / window.innerWidth) * 100;
        matchDotRef.current[1] = (sy / window.innerHeight) * 100;
      }
    }

    // draw the one arc that matters (active during the scan, match after)
    const arcMat = arc.material as THREE.LineBasicMaterial;
    const targetIdx = matchHolds ? 0 : activeIdx;
    const targetMesh = cityRefs.current[targetIdx];
    let drawn = 0;
    if (targetMesh && (matchHolds || (scan > 0 && scan < 1))) {
      targetMesh.getWorldPosition(cityWorld);
      if (cityWorld.z > 0.05) {
        const drawT = matchHolds
          ? 1
          : seg(scan * CITIES.length - activeIdx, 0.15, 0.85);
        control.copy(cityWorld).add(anchor).multiplyScalar(0.5);
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
      <group ref={groupRef} position={[0, 0, 0]}>
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
            <sphereGeometry args={[0.045, 14, 14]} />
            <meshBasicMaterial transparent color={palette.bronze} />
          </mesh>
        ))}
        {/* fresnel limb glow so the dome reads as a sphere */}
        <mesh>
          <sphereGeometry args={[R * 1.02, 48, 48]} />
          <shaderMaterial
            ref={rimMat}
            args={[
              {
                uniforms: rimUniforms,
                vertexShader: RIM_VERT,
                fragmentShader: RIM_FRAG,
                transparent: true,
                depthWrite: false,
                depthTest: false,
                blending: THREE.AdditiveBlending,
              },
            ]}
          />
        </mesh>
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
  matchDotRef: RefObject<[number, number]>;
  gradeRef: RefObject<number>;
  mobile: boolean;
  reduced: boolean;
  /** film progress to freeze on when reduced motion is on */
  staticProgress?: number;
  className?: string;
};

export default function Globe({
  progressRef,
  matchDotRef,
  gradeRef,
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
        matchDotRef={matchDotRef}
        gradeRef={gradeRef}
        mobile={mobile}
        reduced={reduced}
        staticProgress={staticProgress}
      />
    </Canvas>
  );
}
