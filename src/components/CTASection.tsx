import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { images } from '@/constants';
import { MobileGlassFallback } from '@/components/MobileGlassFallback';
import FluidGlass from '@/components/FluidGlass';

interface CTASectionProps {
  heading?: string;
  buttonText?: string;
  buttonHref?: string;
}

function formatCtaHeading(heading: string) {
  const words = heading
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.toUpperCase());

  if (words.length <= 1) {
    return words[0] ?? '';
  }

  return `${words.slice(0, -1).join(' ')}\n${words[words.length - 1]}`;
}

function CTAMobileFallback({
  heading,
  buttonText,
  buttonHref,
}: Required<Pick<CTASectionProps, 'heading' | 'buttonText'>> & Pick<CTASectionProps, 'buttonHref'>) {
  const fontBase = 'var(--font-montserrat, Montserrat, sans-serif)';
  const headingLines = formatCtaHeading(heading).split('\n');

  return (
    <MobileGlassFallback
      backgroundColor="#1e2728"
      backgroundImage={images.ctaBg}
      gradientRgb="30,39,40"
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          textAlign: 'center',
        }}
      >
        <div style={{ marginBottom: '2.5rem' }}>
          {headingLines.map((line, i) => (
            <div key={i} style={{ overflow: 'hidden' }}>
              <span
                className="fg-inner"
                style={{
                  fontFamily: fontBase,
                  fontWeight: 300,
                  fontSize: 'clamp(2.4rem, 11vw, 5rem)',
                  letterSpacing: '0.07em',
                  color: '#ffffff',
                  lineHeight: 1,
                  animationDelay: `${i * 130}ms`,
                }}
              >
                {line}
              </span>
            </div>
          ))}
        </div>

        <div className="fg-fade">
          {buttonHref ? (
            <a href={buttonHref} className="aa-btn-link">
              <Button variant="primary" size="lg">
                {buttonText}
              </Button>
            </a>
          ) : (
            <Button variant="primary" size="lg">
              {buttonText}
            </Button>
          )}
        </div>
      </div>
      <div style={{ position: 'absolute', inset: 0, top: 0, height: '160px', background: 'linear-gradient(to bottom, #191818, transparent)', pointerEvents: 'none', zIndex: 20 }} />
      <div style={{ position: 'absolute', inset: 0, top: 'auto', bottom: 0, height: '160px', background: 'linear-gradient(to top, #1e2728, transparent)', pointerEvents: 'none', zIndex: 20 }} />
    </MobileGlassFallback>
  );
}

export default function CTASection({
  heading = 'SHARE YOUR VISION',
  buttonText = 'Get in touch',
  buttonHref = '#',
}: CTASectionProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const formattedHeading = formatCtaHeading(heading);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!isDesktop) {
    return (
      <CTAMobileFallback
        heading={formattedHeading}
        buttonText={buttonText}
        buttonHref={buttonHref}
      />
    );
  }

  return (
    <section
      style={{
        position: 'relative',
        marginTop: '-1px',
        height: '100vh',
        minHeight: '100svh',
        width: '100%',
        overflow: 'hidden',
        backgroundColor: '#1e2728',
      }}
      data-screen-label="07 CTA"
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '-2rem',
          height: '16rem',
          pointerEvents: 'none',
          zIndex: 10,
          background:
            'linear-gradient(to bottom, #1E2728 0%, rgba(30,39,40,0.64) 20%, rgba(30,39,40,0.18) 60%, transparent 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '10rem',
          pointerEvents: 'none',
          zIndex: 10,
          background: 'linear-gradient(to top, #1e2728, transparent)',
        }}
      />
      <FluidGlass
        lensProps={{ ior: 1.2, thickness: 3, chromaticAberration: 0.06, scale: 0.12 }}
        backgroundColor="#1e2728"
        backgroundImage={images.ctaBg}
        text={{ line1: formattedHeading }}
        textLayout="center"
      />
      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          left: 0,
          right: 0,
          top: '70%',
          display: 'flex',
          justifyContent: 'center',
          zIndex: 20,
        }}
      >
        {buttonHref ? (
          <a href={buttonHref} className="aa-btn-link">
            <Button variant="primary" size="lg">
              {buttonText}
            </Button>
          </a>
        ) : (
          <Button variant="primary" size="lg">
            {buttonText}
          </Button>
        )}
      </div>
    </section>
  );
}
