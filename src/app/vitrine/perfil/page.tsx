import { Suspense } from 'react';
import PerfilContent from './PerfilContent';

export default function PerfilClientePage() {
  return (
    <Suspense fallback={
      <div className="mv-container mv-section">
        <div className="mv-skel h-12 w-64 mb-6" />
        <div className="mv-skel h-40" />
      </div>
    }>
      <PerfilContent />
    </Suspense>
  );
}
