'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Field, RulesetPicker, Segmented, SetupShell } from '@/components/Setup';
import { BASIC_CONFIG, type GameConfig } from '@/engine';
import { api } from '@/lib/api';
import { saves } from '@/lib/saves';
import { useMounted } from '@/lib/use-mounted';
import { useSettings } from '@/store/settings';

export default function OnlinePage() {
  const router = useRouter();
  const mounted = useMounted();
  const { nickname, setNickname } = useSettings();
  const [config, setConfig] = useState<GameConfig>(BASIC_CONFIG);
  const [color, setColor] = useState<'w' | 'b' | 'random'>('random');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => { api.health().then((h) => setAvailable(h.online)); }, []);

  const create = async () => {
    if (!nickname.trim()) { setError('Please enter your nickname first.'); return; }
    setBusy(true);
    setError(null);
    const res = await api.create(nickname.trim(), config, color);
    if (res.ok && res.game) {
      saves.rememberOnline({ id: res.game.id, opponent: null, you: res.game.you, status: 'waiting', updatedAt: Date.now() });
      router.push(`/g/${res.game.id}`);
    } else {
      setBusy(false);
      setError(res.error ?? 'Could not create the game.');
    }
  };

  return (
    <SetupShell title="Play online" subtitle="Create a private game and send the link to someone in your family — anywhere in the world.">
      {available === false ? (
        <div className="rounded-2xl border border-terracotta/40 bg-terracotta/10 p-4 text-sm">
          Online play isn’t set up on this server yet. The owner needs to add the Supabase settings (see the README). You can still play on one device or against the computer.
        </div>
      ) : null}
      <Field label="Your nickname">
        <input className="field" value={mounted ? nickname : ''} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. Mum" maxLength={20} data-testid="nickname" />
      </Field>
      <Field label="Tiles"><RulesetPicker value={config} onChange={setConfig} /></Field>
      <Field label="Your colour">
        <Segmented value={color} onChange={setColor} options={[{ value: 'random', label: 'Random' }, { value: 'w', label: 'Sun (first)' }, { value: 'b', label: 'Moon' }]} />
      </Field>
      {error ? <p className="text-sm font-medium text-terracotta" role="alert">{error}</p> : null}
      <button className="btn btn-primary w-full" disabled={busy || available === false} onClick={create} data-testid="create-game">
        {busy ? 'Creating…' : 'Create game'}
      </button>
    </SetupShell>
  );
}
