"use client";

import * as THREE from 'three';
import { Suspense, useRef, useState, useEffect, memo, useMemo } from 'react';
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber';
import {
  useFBO,
  useGLTF,
  MeshTransmissionMaterial,
  Text,
  Image,
} from '@react-three/drei';
import { easing } from 'maath';

// ─── Props ──────────────────────────────────────────────────────────────────

interface FluidGlassProps {
  lensProps?: {
    scale?: number;
    ior?: number;
    thickness?: number;
    anisotropy?: number;
    chromaticAberration?: number;
    [key: string]: unknown;
  };
  backgroundColor?: string;
  backgroundImage?: string | null;
  text?: { line1: string; line2?: string };
  textLayout?: 'left' | 'center';
}

// ─── Root component ─────────────────────────────────────────────────────────

export default function FluidGlass({
  lensProps = {},
  backgroundColor = '#0c0f0f',
  backgroundImage = null,
  text = { line1: 'WHERE WATER IS THE', line2: 'FOUNDATION' },
  textLayout = 'left',
}: FluidGlassProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(true);
  // scrollRef: 0 = section just entered viewport, 1 = fully scrolled through
  const scrollRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let rafId: number;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // progress: 0 when bottom of section hits bottom of viewport,
      //           1 when top of section hits top of viewport
      const raw = (vh - rect.top) / (vh + rect.height);
      scrollRef.current = Math.max(0, Math.min(1, raw));
      visibleRef.current = rect.bottom > 0 && rect.top < vh;
      rafId = requestAnimationFrame(update);
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, 20], fov: 15 }}
        gl={{ alpha: true, powerPreference: 'high-performance' }}
        style={{ background: backgroundColor }}
      >
        <Suspense fallback={null}>
          <LensWithBackground
            visibleRef={visibleRef}
            scrollRef={scrollRef}
            modeProps={lensProps}
            backgroundColor={backgroundColor}
            backgroundImage={backgroundImage}
            text={text}
            textLayout={textLayout}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

// ─── Lens + FBO ─────────────────────────────────────────────────────────────

interface LensWithBackgroundProps {
  visibleRef: React.RefObject<boolean>;
  scrollRef: React.RefObject<number>;
  modeProps?: Record<string, unknown>;
  backgroundColor?: string;
  backgroundImage?: string | null;
  text?: { line1: string; line2?: string };
  textLayout?: 'left' | 'center';
}

const LensWithBackground = memo(function LensWithBackground({
  visibleRef,
  scrollRef,
  modeProps = {},
  backgroundColor = '#0c0f0f',
  backgroundImage,
  text,
  textLayout = 'left',
}: LensWithBackgroundProps) {
  const ref = useRef<THREE.Mesh>(null!);
  const { nodes } = useGLTF('/assets/3d/lens.glb');

  const buffer = useFBO(2048, 2048);
  const [scene] = useState(() => new THREE.Scene());
  const geoWidthRef = useRef(1);

  const clearColor = useMemo(() => new THREE.Color(backgroundColor), [backgroundColor]);

  useEffect(() => {
    const geo = (nodes['Cylinder'] as THREE.Mesh)?.geometry;
    if (geo) {
      geo.computeBoundingBox();
      geoWidthRef.current = geo.boundingBox!.max.x - geo.boundingBox!.min.x || 1;
    }
  }, [nodes]);

  useFrame((state, delta) => {
    if (!visibleRef.current) return;

    const { gl, viewport, pointer, camera } = state;
    const v = viewport.getCurrentViewport(camera, [0, 0, 15]);

    const destX = (pointer.x * v.width) / 2;
    const destY = (pointer.y * v.height) / 2;
    easing.damp3(ref.current.position, [destX, destY, 15], 0.15, delta);

    if (modeProps.scale == null) {
      const maxWorld = v.width * 0.9;
      const desired = maxWorld / geoWidthRef.current;
      ref.current.scale.setScalar(Math.min(0.15, desired));
    }

    gl.setRenderTarget(buffer);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.setClearColor(clearColor, 1);
  });

  const { scale, ior, thickness, anisotropy, chromaticAberration, ...extraMat } = modeProps;

  const vpWidth = useThree((s) => s.viewport.width);
  const vpHeight = useThree((s) => s.viewport.height);

  return (
    <>
      {createPortal(
        <SceneContent
          backgroundImage={backgroundImage}
          text={text}
          textLayout={textLayout}
          visibleRef={visibleRef}
          scrollRef={scrollRef}
        />,
        scene,
      )}

      <mesh scale={[vpWidth, vpHeight, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={buffer.texture} />
      </mesh>

      <mesh
        ref={ref}
        scale={(scale ?? 0.15) as number}
        rotation-x={Math.PI / 2}
        geometry={(nodes['Cylinder'] as THREE.Mesh)?.geometry}
      >
        <MeshTransmissionMaterial
          buffer={buffer.texture}
          ior={(ior ?? 1.15) as number}
          thickness={(thickness ?? 5) as number}
          anisotropy={(anisotropy ?? 0.01) as number}
          chromaticAberration={(chromaticAberration ?? 0.1) as number}
          samples={6}
          resolution={1024}
          {...(extraMat as Record<string, unknown>)}
        />
      </mesh>
    </>
  );
});

// ─── Scene content ──────────────────────────────────────────────────────────

interface SceneContentProps {
  backgroundImage?: string | null;
  text?: { line1: string; line2?: string };
  textLayout?: 'left' | 'center';
  visibleRef?: React.RefObject<boolean>;
  scrollRef?: React.RefObject<number>;
}

const SceneContent = memo(function SceneContent({
  backgroundImage,
  text,
  textLayout = 'left',
  visibleRef,
  scrollRef,
}: SceneContentProps) {
  const viewport = useThree((s) => s.viewport);

  if (textLayout === 'center') {
    return (
      <CenterLayout
        text={text}
        viewport={viewport}
        backgroundImage={backgroundImage}
        scrollRef={scrollRef}
      />
    );
  }

  return (
    <LeftLayout
      text={text}
      viewport={viewport}
      backgroundImage={backgroundImage}
      visibleRef={visibleRef}
      scrollRef={scrollRef}
    />
  );
});

// ─── Shared background ─────────────────────────────────────────────────────

interface BackgroundProps {
  backgroundImage?: string | null;
  bgScale: [number, number];
}

const Background = memo(function Background({
  backgroundImage,
  bgScale,
}: BackgroundProps) {
  return (
    <>
      {backgroundImage && (
        // eslint-disable-next-line jsx-a11y/alt-text -- drei Image is a Three.js mesh, not an HTML <img>
        <Image url={backgroundImage} scale={bgScale} position={[0, 0, -1]} />
      )}
    </>
  );
});

// ─── Stylized word (big first letter + rest) ────────────────────────────────
//
// Uses onSync to measure the first character's rendered width automatically,
// and anchorY="baseline" so different font sizes align naturally — just like
// CSS baseline alignment. No manual pixel offset guessing.

interface StylizedWordProps {
  word: string;
  firstFontSize: number;
  restFontSize: number;
  firstFont: string;
  restFont: string;
  firstColor?: string;
  restColor?: string;
  position?: [number, number, number];
  anchorX?: 'left' | 'center' | 'right';
  initialOpacity?: number;
  initialBlur?: number;
}

const StylizedWord = memo(function StylizedWord({
  word,
  firstFontSize,
  restFontSize,
  firstFont,
  restFont,
  firstColor = 'white',
  restColor = '#e0ddd9',
  position = [0, 0, 0],
  anchorX = 'left',
  initialOpacity = 1,
  initialBlur = 0,
}: StylizedWordProps) {
  const [firstCharWidth, setFirstCharWidth] = useState(0);

  const firstChar = word.charAt(0);
  const restChars = word.slice(1);

  return (
    <group position={position}>
      <Text
        fontSize={firstFontSize}
        letterSpacing={-0.02}
        color={firstColor}
        anchorX={anchorX}
        anchorY="top-baseline"
        font={firstFont}
        fillOpacity={initialOpacity}
        outlineBlur={initialBlur}
        outlineColor="white"
        onSync={(troika: { textRenderInfo?: { blockBounds?: number[] } }) => {
          const info = troika.textRenderInfo;
          if (info?.blockBounds) {
            setFirstCharWidth(info.blockBounds[2]);
          }
        }}
      >
        {firstChar}
      </Text>

      {firstCharWidth > 0 && (
        <Text
          position={[firstCharWidth, 0, 0]}
          fontSize={restFontSize}
          letterSpacing={-0.02}
          color={restColor}
          anchorX="left"
          anchorY="top-baseline"
          font={restFont}
          fillOpacity={initialOpacity}
          outlineBlur={initialBlur}
          outlineColor="white"
        >
          {restChars}
        </Text>
      )}
    </group>
  );
});

// ─── Center layout ──────────────────────────────────────────────────────────

interface LayoutProps {
  text?: { line1: string; line2?: string };
  viewport: { width: number; height: number };
  backgroundImage?: string | null;
  visibleRef?: React.RefObject<boolean>;
  scrollRef?: React.RefObject<number>;
}

const CenterLayout = memo(function CenterLayout({
  text,
  viewport,
  backgroundImage,
  scrollRef,
}: LayoutProps) {
  const fontSizeBig = Math.max(0.4, Math.min(1.8, viewport.width * 0.12));
  const fontSizeSmall = Math.max(0.08, viewport.width * 0.02);
  const lineGap = fontSizeBig * 0.25;

  const line2Y = -lineGap * 0.3;
  const line1Y = line2Y + fontSizeBig * 0.5 + lineGap + fontSizeSmall * 0.5;

  // Measure widths of "F" and "OUNDATION" to center the pair as a group
  const [fWidth, setFWidth] = useState(0);
  const [oundationWidth, setOundationWidth] = useState(0);
  const totalWidth = fWidth + oundationWidth;
  const groupX = totalWidth > 0 ? -totalWidth / 2 : 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const line1Ref = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oundRef = useRef<any>(null);

  const blurMax1 = fontSizeSmall * 0.2;
  const blurMax2 = fontSizeBig * 0.15;

  const SCROLL_START = 0.26;
  const WORD_SCROLL = 0.14;
  const STAGGER = 0.07;

  const hasTwoLines = Boolean(text?.line2);

  useFrame(() => {
    // Single-line mode (CTA): always fully visible, no scroll animation needed
    if (!hasTwoLines) return;

    const s = scrollRef?.current ?? 1;

    if (line1Ref.current) {
      const p = THREE.MathUtils.clamp((s - SCROLL_START) / WORD_SCROLL, 0, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      line1Ref.current.fillOpacity = ease;
      line1Ref.current.outlineBlur = blurMax1 * (1 - ease);
    }

    const s2start = SCROLL_START + STAGGER;
    const p2 = THREE.MathUtils.clamp((s - s2start) / WORD_SCROLL, 0, 1);
    const ease2 = 1 - Math.pow(1 - p2, 3);
    if (fRef.current) {
      fRef.current.fillOpacity = ease2;
      fRef.current.outlineBlur = blurMax2 * (1 - ease2);
    }
    if (oundRef.current) {
      oundRef.current.fillOpacity = ease2;
      oundRef.current.outlineBlur = blurMax2 * (1 - ease2);
    }
  });

  const bgScale = useMemo<[number, number]>(
    () => [viewport.width * 1.05, viewport.height * 1.05],
    [viewport.width, viewport.height],
  );

  // ── Single-line mode: original CTA behaviour ────────────────────────────
  if (!hasTwoLines) {
    const fontSize = Math.max(0.2, Math.min(0.8, viewport.width * 0.08));
    return (
      <>
        <Background backgroundImage={backgroundImage} bgScale={bgScale} />
        <Text
          position={[0, 0, 0]}
          fontSize={fontSize}
          lineHeight={1.3}
          letterSpacing={-0.03}
          color="white"
          anchorX="center"
          anchorY="middle"
          textAlign="center"
          font="/fonts/Montserrat-Regular.ttf"
          maxWidth={viewport.width * 0.85}
        >
          {text?.line1 ?? ''}
        </Text>
      </>
    );
  }

  // ── Two-line mode: small tagline + big F/OUNDATION with scroll animation ─
  return (
    <>
      <Background backgroundImage={backgroundImage} bgScale={bgScale} />

      {/* Line 1 — small, light, letter-spaced tagline */}
      <Text
        ref={line1Ref}
        position={[0, line1Y, 0]}
        fontSize={fontSizeSmall}
        letterSpacing={0.18}
        color="#b0ada6"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Montserrat-Light.ttf"
        fillOpacity={0}
        outlineBlur={blurMax1}
        outlineColor="white"
      >
        {text?.line1 ?? ''}
      </Text>

      {/* Line 2 — bold F + light OUNDATION, measured and centered as a group */}
      <group position={[groupX, line2Y, 0]}>
        <Text
          ref={fRef}
          position={[0, 0, 0]}
          fontSize={fontSizeBig}
          letterSpacing={-0.02}
          color="#ffffff"
          anchorX="left"
          anchorY="middle"
          font="/fonts/Montserrat-Regular.ttf"
          fillOpacity={0}
          outlineBlur={blurMax2}
          outlineColor="white"
          onSync={(troika: { textRenderInfo?: { blockBounds?: number[] } }) => {
            const bounds = troika.textRenderInfo?.blockBounds;
            if (bounds) setFWidth(bounds[2]);
          }}
        >
          F
        </Text>

        {fWidth > 0 && (
          <Text
            ref={oundRef}
            position={[fWidth, 0, 0]}
            fontSize={fontSizeBig}
            letterSpacing={-0.02}
            color="#ccc9c2"
            anchorX="left"
            anchorY="middle"
            font="/fonts/Montserrat-Light.ttf"
            fillOpacity={0}
            outlineBlur={blurMax2}
            outlineColor="white"
            onSync={(troika: { textRenderInfo?: { blockBounds?: number[] } }) => {
              const bounds = troika.textRenderInfo?.blockBounds;
              if (bounds) setOundationWidth(bounds[2]);
            }}
          >
            OUNDATION
          </Text>
        )}
      </group>
    </>
  );
});

// ─── Left layout ────────────────────────────────────────────────────────────

// ─── RevealWord — horizontal mask-wipe reveal (left → right) ────────────────

interface RevealWordProps {
  text: string;
  fontSize: number;
  font: string;
  color?: string;
  anchorX?: 'left' | 'center' | 'right';
  anchorY?: 'top' | 'middle' | 'bottom' | 'top-baseline' | 'bottom-baseline';
  targetY: number;
  scrollStart: number;
  scrollEnd: number;
  scrollRef: React.RefObject<number>;
  onWidth?: (w: number) => void;
  initialX?: number;
}

function RevealWord({
  text: word,
  fontSize,
  font,
  color = 'white',
  anchorX = 'left',
  anchorY = 'top',
  targetY,
  scrollStart,
  scrollEnd,
  scrollRef,
  onWidth,
  initialX = 0,
}: RevealWordProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null);

  const blurMax = fontSize * 0.15;

  useFrame(() => {
    if (!ref.current) return;
    const s = scrollRef.current;
    const p = THREE.MathUtils.clamp((s - scrollStart) / (scrollEnd - scrollStart), 0, 1);

    const ease = 1 - Math.pow(1 - p, 3);

    ref.current.outlineBlur = blurMax * (1 - ease);
    ref.current.fillOpacity = ease;
  });

  return (
    <Text
      ref={ref}
      position={[initialX, targetY, 0]}
      fontSize={fontSize}
      letterSpacing={-0.02}
      color={color}
      anchorX={anchorX}
      anchorY={anchorY}
      font={font}
      fillOpacity={0}
      outlineBlur={blurMax}
      outlineColor="white"
      onSync={(troika: { textRenderInfo?: { blockBounds?: number[] } }) => {
        const bounds = troika.textRenderInfo?.blockBounds;
        if (bounds && onWidth) onWidth(bounds[2]);
      }}
    >
      {word}
    </Text>
  );
}

// ─── Left layout ────────────────────────────────────────────────────────────

const LeftLayout = memo(function LeftLayout({
  text,
  viewport,
  backgroundImage,
  scrollRef,
}: LayoutProps) {
  // ── TUNING KNOBS ────────────────────────────────────────────────
  const fontSize = Math.max(0.25, viewport.width * 0.09);
  const fontSizeF = fontSize * 1.22;
  const gap = fontSize * 0.001;
  const gap3 = fontSize * 0.22;
  const groupX = -viewport.width * 0.4;
  const capRatio = 0.72;
  // ── END TUNING KNOBS ───────────────────────────────────────────

  const foundationVisualHeight = fontSizeF * capRatio;
  const totalHeight = fontSize + gap + fontSize + gap + foundationVisualHeight;
  const topY = totalHeight / 2;

  const line1Y = topY;
  const line2Y = topY - fontSize - gap;
  const line3Y = line2Y - fontSize - gap3 - capRatio * fontSizeF;

  const wordGap = fontSize * 0.35;

  // Scroll-based stagger: each word clears over a slice of scroll progress
  const SCROLL_START = 0.2;   // scroll progress where first word starts
  const WORD_SCROLL = 0.12;    // scroll range per word to fully clear
  const WORD_STAGGER = 0.05;   // scroll offset between each word

  // Track measured widths for word positioning
  const [whereW, setWhereW] = useState(0);
  const [isW, setIsW] = useState(0);

  const line3GroupRef = useRef<THREE.Group>(null!);

  useFrame(() => {
    if (!scrollRef?.current) return;
    const s = scrollRef.current;

    // Animate FOUNDATION group (word index 4) — blur → clear with scroll
    if (line3GroupRef.current) {
      const start = SCROLL_START + 4 * WORD_STAGGER;
      const end = start + WORD_SCROLL;
      const p = THREE.MathUtils.clamp((s - start) / (end - start), 0, 1);
      const ease = 1 - Math.pow(1 - p, 3);

      const blurMax = fontSize * 0.15;

      line3GroupRef.current.traverse((child) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const troikaText = child as any;
        if ('fillOpacity' in troikaText) {
          troikaText.fillOpacity = ease;
          troikaText.outlineBlur = blurMax * (1 - ease);
        }
      });
    }
  });

  const bgScale = useMemo<[number, number]>(
    () => [viewport.width * 1.2, viewport.height * 1.2],
    [viewport.width, viewport.height],
  );

  return (
    <>
      <Background
        backgroundImage={backgroundImage}
        bgScale={bgScale}
      />

      <group position={[groupX, 0, 0]}>
        {/* Line 1: WHERE (word 0) + WATER (word 1) */}
        <RevealWord
          text="WHERE"
          fontSize={fontSize}
          font="/fonts/Montserrat-ExtraLight.ttf"
          targetY={line1Y}
          scrollStart={SCROLL_START + 0 * WORD_STAGGER}
          scrollEnd={SCROLL_START + 0 * WORD_STAGGER + WORD_SCROLL}
          scrollRef={scrollRef!}
          onWidth={setWhereW}
        />
        {whereW > 0 && (
          <RevealWord
            text="WATER"
            fontSize={fontSize}
            font="/fonts/Montserrat-ExtraLight.ttf"
            targetY={line1Y}
            scrollStart={SCROLL_START + 1 * WORD_STAGGER}
            scrollEnd={SCROLL_START + 1 * WORD_STAGGER + WORD_SCROLL}
            scrollRef={scrollRef!}
            initialX={whereW + wordGap}
          />
        )}

        {/* Line 2: IS (word 2) + THE (word 3) */}
        <RevealWord
          text="IS"
          fontSize={fontSize}
          font="/fonts/Montserrat-ExtraLight.ttf"
          targetY={line2Y}
          scrollStart={SCROLL_START + 2 * WORD_STAGGER}
          scrollEnd={SCROLL_START + 2 * WORD_STAGGER + WORD_SCROLL}
          scrollRef={scrollRef!}
          onWidth={setIsW}
        />
        {isW > 0 && (
          <RevealWord
            text="THE"
            fontSize={fontSize}
            font="/fonts/Montserrat-ExtraLight.ttf"
            targetY={line2Y}
            scrollStart={SCROLL_START + 3 * WORD_STAGGER}
            scrollEnd={SCROLL_START + 3 * WORD_STAGGER + WORD_SCROLL}
            scrollRef={scrollRef!}
            initialX={isW + wordGap}
          />
        )}

        {/* Line 3: FOUNDATION (word 4) — stylized first letter */}
        {text?.line2 && (
          <group ref={line3GroupRef} position={[2, line3Y, 0]}>
            <StylizedWord
              word={text.line2}
              firstFontSize={fontSizeF}
              restFontSize={fontSize}
              firstFont="/fonts/Montserrat-Regular.ttf"
              restFont="/fonts/Montserrat-ExtraLight.ttf"
              firstColor="white"
              restColor="#e0ddd9"
              position={[0, 0, 0]}
              anchorX="left"
              initialOpacity={0}
              initialBlur={fontSize * 0.15}
            />
          </group>
        )}
      </group>
    </>
  );
});

// Preload the GLB
useGLTF.preload('/assets/3d/lens.glb');