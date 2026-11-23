import { useState } from 'react';
import { config } from '../../engine/config';
import { AVATAR_COLORS, createProfile, deleteProfile } from '../../store/profiles';
import { BigButton } from '../components/BigButton';
import { Card } from '../components/Card';
import { HoldButton } from '../components/HoldButton';
import { useProfiles } from '../ProfileContext';

/** Up to 4 local profiles with a name and an avatar color. */
export function ProfilesScreen({ onBack }: { onBack: () => void }) {
  const { profiles, activeId, setActive, refresh } = useProfiles();
  const [name, setName] = useState('');
  const [color, setColor] = useState(AVATAR_COLORS[1]!);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const full = profiles.length >= config.profiles.max;

  const add = async () => {
    if (!name.trim() || full) return;
    const p = await createProfile(name, color);
    setName('');
    await refresh();
    setActive(p.id);
  };

  const remove = async (id: string) => {
    await deleteProfile(id);
    setConfirmDelete(null);
    await refresh();
  };

  return (
    <main className="flex-1 px-4 py-6 max-w-2xl w-full mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <BigButton tone="ghost" className="!text-lg !px-5 !py-2" onClick={onBack}>← back</BigButton>
        <h1 className="font-display text-3xl font-bold text-slate-800">Who is reading?</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {profiles.map((p) => (
          <Card key={p.id} className={`p-4 flex items-center gap-3 ${p.id === activeId ? 'ring-4 ring-orange-300' : ''}`}>
            <button onClick={() => { setActive(p.id); }} className="flex items-center gap-3 flex-1 text-left">
              <span className="w-14 h-14 rounded-full text-white font-display text-2xl font-bold flex items-center justify-center shadow-inner" style={{ background: p.avatarColor }}>
                {p.name[0]?.toUpperCase()}
              </span>
              <span>
                <span className="font-display text-xl font-semibold text-slate-800 block">{p.name}</span>
                <span className="text-xs text-slate-500">{p.id === activeId ? 'reading now' : 'tap to switch'}</span>
              </span>
            </button>
            {confirmDelete === p.id ? (
              <span className="text-xs flex flex-col gap-1">
                <button onClick={() => void remove(p.id)} className="px-2 py-1 rounded-full bg-rose-500 text-white font-bold">delete everything</button>
                <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 rounded-full border border-slate-200">keep</button>
              </span>
            ) : (
              profiles.length > 1 && (
                <HoldButton onHeld={() => setConfirmDelete(p.id)} className="text-[11px] text-slate-400 px-2 py-1 rounded-full border border-slate-200">hold to delete</HoldButton>
              )
            )}
          </Card>
        ))}
      </div>

      {!full && (
        <Card className="p-4 flex flex-col gap-3">
          <div className="font-display text-xl font-semibold text-slate-800">Add a reader</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            placeholder="name"
            className="font-display text-xl border-2 border-slate-200 rounded-2xl px-4 py-2 focus:outline-none focus:border-sky-400"
          />
          <div className="flex gap-2 flex-wrap">
            {AVATAR_COLORS.map((c) => (
              <button key={c} aria-label={`color ${c}`} onClick={() => setColor(c)} className={`w-9 h-9 rounded-full border-4 ${color === c ? 'border-slate-800' : 'border-white'}`} style={{ background: c }} />
            ))}
          </div>
          <BigButton disabled={!name.trim()} onClick={() => void add()}>add {name.trim() || 'reader'}</BigButton>
        </Card>
      )}
      {full && <p className="text-sm text-slate-500 text-center">Up to {config.profiles.max} readers on this device.</p>}
      <p className="text-xs text-slate-400 text-center">Each reader has their own levels, stars and review words. Deleting a reader removes all of that.</p>
    </main>
  );
}
