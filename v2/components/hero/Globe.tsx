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
import { VignetteEffect } from "postprocessing";
import { useEffect, useMemo, useRef, type RefObject } from "react";
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

/* --- render pipeline (Task 4) ---------------------------------------------
 * The dome is a point cloud drawn with depthWrite:false / depthTest:false, so
 * the depth buffer is empty apart from the 12 city spheres. A postprocessing
 * DepthOfField pass reads that buffer and would therefore blur the entire dome
 * uniformly, which is why depth of field is done IN THE POINT SHADER instead:
 * each dot spreads into a bokeh disc as it leaves the focal plane, which is
 * literally what a lens does to a point light. It costs no extra pass. */

/* Circle of confusion gain per world-unit of defocus, and its ceiling in
   multiples of the in-focus sprite.

   Mobile runs NEITHER lens effect: aperture and streak are both zero, which
   collapses the shader to the plain disc it drew before. Both spread the point
   sprites, and sprite spread is fill cost, which is the budget a phone has
   least of. On the M4 this machine measures with, mobile's depth of field cost
   sits inside run-to-run noise, so the measurement cannot clear it on hardware
   several times slower. The rack focus is also close to illegible on a dome
   375px wide, so it was buying the least of anything added here. */
const APERTURE = 0.38;
const MAX_COC = 1.2;

/* Directional motion smear. SHUTTER is the fraction of a frame interval a real
   camera exposes for: 0.5 is the classic 180-degree shutter. The pixel cap keeps
   a hard scrub from ballooning the sprites into fill-rate cost. */
const SHUTTER = 0.5;
const MAX_STREAK_PX = 12;

/* The approved bloom, verbatim. Task 4 adds passes around it and never retunes it. */
const BLOOM = {
  intensity: 0.75,
  luminanceThreshold: 0.5,
  luminanceSmoothing: 0.25,
  mipmapBlur: true,
  radius: 0.5,
} as const;
const SPIN = 0.21; // free-spin speed (rad/s), matches the prototype's 0.0035/frame
const SLOW = 0.04; // slow continuous drift (rad/s) applied through the hold + finale so
// the globe NEVER freezes: a perpetually-moving scene always has a real frame to render,
// so the WebGL buffer can never go stale/black on render-on-demand-stalling GPUs.

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

/* The dot field carries both lens effects itself. With uAperture and uRotVel at
   zero every varying collapses to its old constant (vRad .42, vSoft .08, vDim 1,
   vStreak 0) and the fragment shader reduces exactly to the previous
   smoothstep(0.5, 0.34, d) disc, so an unfocused, unmoving frame is unchanged. */
const POINT_VERT = /* glsl */ `
  uniform float uAlpha;
  uniform float uSize;
  uniform float uDpr;
  uniform float uZFront;
  uniform float uZBack;
  uniform float uFocusZ;    // view-space z of the focal plane
  uniform float uAperture;  // circle-of-confusion gain per unit of defocus
  uniform float uMaxCoc;    // CoC ceiling, in multiples of the base sprite
  uniform float uRotVel;    // radians of globe rotation smeared into one frame
  uniform float uMaxStreak; // streak ceiling, device pixels
  uniform vec2  uRes;       // drawing buffer size, device pixels
  varying float vFade;
  varying float vRad;       // disc radius, in sprite units
  varying float vSoft;      // half-width of the disc edge, in sprite units
  varying float vDim;       // energy conservation as the dot spreads
  varying vec2  vStreak;    // half smear vector, in sprite units
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec4 clip = projectionMatrix * mv;
    gl_Position = clip;
    // front dots (nearer the camera) read brighter; back dots recede
    vFade = clamp(smoothstep(uZBack, uZFront, mv.z), 0.06, 1.0);
    float base = uSize * uDpr * (0.6 + vFade * 0.9);

    // depth of field: distance from the focal plane spreads the dot into bokeh
    float coc = clamp(abs(mv.z - uFocusZ) * uAperture, 0.0, uMaxCoc);
    float disc = base * (1.0 + coc);

    // motion smear: screen velocity under rotation about world Y, where
    // d(position)/d(rotation) = cross(yAxis, worldPosition) = (z, 0, -x)
    vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;
    vec4 clipB = projectionMatrix * viewMatrix *
      vec4(wp + vec3(wp.z, 0.0, -wp.x) * uRotVel, 1.0);
    vec2 dPix = (clipB.xy / clipB.w - clip.xy / clip.w) * 0.5 * uRes;
    float streak = min(length(dPix), uMaxStreak);

    float size = disc + streak;
    gl_PointSize = size;
    vRad = 0.42 * disc / size;
    vSoft = (0.08 + 0.30 * coc / max(uMaxCoc, 0.001)) * disc / size;
    vStreak = (dPix / max(length(dPix), 1e-4)) * (streak * 0.5 / size);
    vDim = 1.0 / (1.0 + (size / base - 1.0) * 1.2);
  }
`;

const POINT_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAlpha;
  varying float vFade;
  varying float vRad;
  varying float vSoft;
  varying float vDim;
  varying vec2 vStreak;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    // distance to the smear's spine: a capsule when moving, a disc when still
    float h = length(vStreak);
    vec2 dir = vStreak / max(h, 1e-4);
    float t = clamp(dot(c, dir), -h, h);
    float d = length(c - dir * t);
    float mask = smoothstep(vRad + vSoft, vRad - vSoft, d);
    if (mask <= 0.001) discard;
    gl_FragColor = vec4(uColor, vFade * uAlpha * mask * 0.9 * vDim);
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
  // rotation state: free spin, then ease to HOLD_ROT over the HOLD window, then a slow
  // continuous drift on top (never frozen). driftRef is the ever-growing slow offset.
  const rotRef = useRef(0);
  const rotFromRef = useRef<number | null>(null);
  const rotToRef = useRef<number | null>(null);
  // last applied rotation, for the one-frame motion smear delta (not an accumulator)
  const prevRotRef = useRef<number | null>(null);
  const driftRef = useRef(0);

  const pointUniforms = useMemo(
    () => ({
      uAlpha: { value: 0 },
      uSize: { value: mobile ? 2.8 : 2.6 },
      uDpr: { value: gl.getPixelRatio() },
      uZFront: { value: R - CAM_Z },
      uZBack: { value: -R - CAM_Z },
      uColor: { value: palette.ink.clone() },
      uFocusZ: { value: -CAM_Z },
      uAperture: { value: 0 },
      uMaxCoc: { value: MAX_COC },
      uRotVel: { value: 0 },
      uMaxStreak: { value: mobile ? 0 : MAX_STREAK_PX },
      uRes: { value: new THREE.Vector2(1, 1) },
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
  const focusScratch = useMemo(() => new THREE.Vector3(), []);

  /* The vignette is constructed here and mounted as a primitive rather than
     through the <Vignette> wrapper. That wrapper memoizes on
     JSON.stringify(props), so handing it a ref throws "circular structure" the
     moment the ref fills with the effect instance. Owning the instance also
     means the per-frame update below needs no ref indirection. */
  const vignette = useMemo(
    () => new VignetteEffect({ offset: 0.3, darkness: 0.42 }),
    []
  );
  useEffect(() => () => vignette.dispose(), [vignette]);
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

    // The globe's own visibility, driven IN-SHADER (not via the DOM wrapper's
    // opacity). A WebGL canvas under a fractional-opacity ancestor drops to nothing
    // on some GPUs while sibling DOM (the sweep) still composites, which zeroed the
    // dome during the emergence. Fade in .20-.30, hold near-full through the head
    // pop (~.56), fade out .56-.63 so the dome is present through the emergence.
    const alpha = reduced
      ? 1
      : easeIO(seg(p, 0.2, 0.3)) * (1 - easeIO(seg(p, 0.56, 0.63)));

    // free spin, then ease to the hold angle (dot -> lower-right), then a slow
    // continuous drift ON TOP so the globe never freezes. The match dot is projected
    // live every frame below, so the flash/head/arc follow the slowly drifting point.
    if (reduced) {
      group.rotation.y = 0.6;
    } else {
      const holdT = easeIO(seg(p, HOLD[0], HOLD[1]));
      if (holdT <= 0) {
        // fast free spin before the hold; drift not yet accruing
        rotRef.current += delta * SPIN;
        rotFromRef.current = null;
        rotToRef.current = null;
        driftRef.current = 0;
        group.rotation.y = rotRef.current;
      } else {
        // ease the base toward the hold angle so the dot settles lower-right...
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
        // ...but keep a slow nonzero drift on top (accrues every frame, even parked),
        // so the applied rotation always changes and the scene is never static.
        driftRef.current += delta * SLOW;
        group.rotation.y = rotRef.current + driftRef.current;
      }
    }

    if (pointsMat.current) {
      pointsMat.current.uniforms.uAlpha.value = alpha;
      // dusk grade: lighten the dome dots as the room darkens (day -> dusk)
      domeScratch.copy(domeDay).lerp(domeNight, grade);
      pointsMat.current.uniforms.uColor.value.copy(domeScratch);
    }
    // limb glow rises with the dusk grade so the dome reads as a sphere at night,
    // and fades with the dome (alpha) so it does not linger after the globe clears
    if (rimMat.current)
      rimMat.current.uniforms.uIntensity.value = (0.1 + grade * 0.14) * alpha;

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

    /* ---- focal plane: focus racks onto whichever dot the film is about ----
       During the scan it follows the active city, racking over the first third
       of each city's slot so the pull reads as a rack rather than a cut. Once
       the match holds it settles on the held dot and stays there. Purely a
       function of progress, so a backwards scrub racks back the same way. */
    const viewZ = (mesh: THREE.Mesh | null | undefined) => {
      if (!mesh) return -CAM_Z;
      mesh.getWorldPosition(focusScratch);
      return focusScratch.applyMatrix4(camera.matrixWorldInverse).z;
    };
    let focusZ = -CAM_Z; // sphere centre before the theatre opens
    if (matchHolds) {
      const t = easeIO(seg(p, MATCH_HOLDS_AT, PHASES.matchResolve[1]));
      focusZ = lerp(
        viewZ(cityRefs.current[CITIES.length - 1]),
        viewZ(cityRefs.current[0]),
        t
      );
    } else if (scan > 0 && scan < 1) {
      const rack = easeIO(seg(scan * CITIES.length - activeIdx, 0, 0.35));
      focusZ = lerp(
        viewZ(cityRefs.current[Math.max(0, activeIdx - 1)]),
        viewZ(cityRefs.current[activeIdx]),
        rack
      );
    }

    /* ---- motion smear velocity: how far the globe actually turned this frame,
       times a 180-degree shutter, which is the fraction of a frame interval a
       real camera exposes for.

       This is the frame-to-frame form rather than the analytic derivative with
       respect to progress, and it needs no direction-change reset: the streak is
       a capsule centred on the dot, so reversing the sign draws the identical
       shape. It holds one previous scalar and accumulates nothing, and the smear
       never feeds back into position, so scrubbing backwards retraces exactly.

       The analytic form was tried first and rejected: it reports the rotation per
       unit progress, which stays large when the film is PARKED inside the hold
       window, leaving the dome permanently smeared while nothing moves on screen.
       Velocity per frame is zero when parked, which is the whole point. It also
       picks up the free spin and the drift for free. */
    const dRot =
      prevRotRef.current === null ? 0 : group.rotation.y - prevRotRef.current;
    prevRotRef.current = group.rotation.y;
    const rotVel = mobile || reduced ? 0 : dRot * SHUTTER;

    if (pointsMat.current) {
      const u = pointsMat.current.uniforms;
      u.uFocusZ.value = focusZ;
      // the lens opens as the theatre does, so the film's opening frames are sharp
      u.uAperture.value = mobile
        ? 0
        : APERTURE * easeIO(seg(p, PHASES.theatre[0], 0.3));
      u.uRotVel.value = rotVel;
      u.uRes.value.set(gl.domElement.width, gl.domElement.height);
    }

    /* The vignette cooperates with the dusk grade rather than fighting it: it
       eases off as the room darkens, since the grade is already removing light
       from the frame. */
    vignette.darkness = lerp(0.42, 0.26, grade);

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
      {/* The vignette runs after bloom, so it reads as the lens rather than as
          scene shading. It darkens the dot field toward the frame edge, which
          is most of what the canvas draws, so it holds attention centre-frame.

          There is deliberately NO grain pass here. The canvas is alpha:true and
          covers only the theatre, so a composer noise pass can only touch pixels
          the globe already drew: at full strength it lands on the dots and
          nowhere else, and contributes nothing between them. It was measured,
          seen to buy nothing, and removed rather than left costing a full
          EffectPass. Stage-wide grain stays in hero.module.css. */}
      <EffectComposer>
        <Bloom {...BLOOM} />
        <primitive object={vignette} />
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
      // preserveDrawingBuffer keeps the last rendered frame in the WebGL buffer, so
      // if a render is ever skipped (e.g. the scene freezes at the rotation hold) the
      // dome stays on screen instead of the buffer clearing to black on some GPUs.
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      camera={{ position: [0, 0, CAM_Z], fov: 42, near: 0.1, far: 100 }}
      // render every frame (never render-on-demand) so a frozen globe keeps
      // refreshing its buffer; the paired preserveDrawingBuffer is the belt-and-braces.
      frameloop="always"
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
