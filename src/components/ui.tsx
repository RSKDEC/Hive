'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useSelection } from '@/store/selection';
import { useSettings } from '@/store/settings';

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose?: () => void; title?: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-paper p-5 text-ink shadow-2xl sm:rounded-3xl sm:p-7 ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} animate-rise`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || onClose) && (
          <div className="mb-4 flex items-start justify-between gap-4">
            {title ? <h2 className="font-display text-2xl font-semibold">{title}</h2> : <span />}
            {onClose ? <button onClick={onClose} className="btn-icon -mr-1 -mt-1 bg-ivory" aria-label="Close">✕</button> : null}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function Toast() {
  const toast = useSelection((s) => s.toast);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), Math.min(6000, 2200 + toast.text.length * 35));
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none absolute bottom-3 left-1/2 z-20 w-max max-w-[92%] -translate-x-1/2 rounded-2xl bg-charcoal/92 px-4 py-2.5 text-center text-[15px] leading-snug text-ivory shadow-lg transition-all duration-200 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
    >
      {toast?.text}
    </div>
  );
}

export function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
      <span>
        <span className="block font-medium">{label}</span>
        {hint ? <span className="block text-sm text-muted">{hint}</span> : null}
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-7 w-12 shrink-0 rounded-full bg-line transition peer-checked:bg-moss peer-focus-visible:ring-2 peer-focus-visible:ring-gold after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}

export function SettingsPanel() {
  const s = useSettings();
  return (
    <div className="divide-y divide-line">
      <Toggle label="Family mode" hint="Bigger tiles, calmer animations, extra guidance" checked={s.familyMode} onChange={(v) => s.set({ familyMode: v, hints: v ? true : s.hints })} />
      <Toggle label="Beginner hints" hint="Short tips about what to do next" checked={s.hints} onChange={(v) => s.set({ hints: v })} />
      <Toggle label="Reduce animations" checked={s.reduceMotion} onChange={(v) => s.set({ reduceMotion: v })} />
    </div>
  );
}

export function Confirm({ open, text, yes = 'Yes', no = 'Cancel', onYes, onNo }: { open: boolean; text: ReactNode; yes?: string; no?: string; onYes: () => void; onNo: () => void }) {
  return (
    <Modal open={open} onClose={onNo}>
      <p className="mb-5 text-lg">{text}</p>
      <div className="grid grid-cols-2 gap-3">
        <button className="btn btn-primary" onClick={onYes}>{yes}</button>
        <button className="btn" onClick={onNo}>{no}</button>
      </div>
    </Modal>
  );
}
