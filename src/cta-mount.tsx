import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CTASection from './components/CTASection';
import './cta.css';

const root = document.getElementById('cta-root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <CTASection />
    </StrictMode>,
  );
}
