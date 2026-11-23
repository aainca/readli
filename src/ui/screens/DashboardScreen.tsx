import { useEffect, useMemo, useState } from 'react';
import { SET1_SKILL_IDS, SET2_SKILL_IDS, SKILLS, type Level, type SkillId } from '../../content/schema';
import type { TeachingNote } from '../../content/teachingNotes';
import { config } from '../../engine/config';
import type { CoachMode } from '../../engine/coach';
import { levelStats, retestDue, trickiestWords, weeklyPractice, type DashAttempt, type LevelStats } from '../../engine/dashboard';
import { backupFileName, exportBackup, importBackup, resetProfileHistory, validateBackup } from '../../store/backup';
import type { AttemptRecord, PlacementResult, Profile } from '../../store/db';
import { getDB } from '../../store/db';
import { getAllNotes, restoreNote, saveNoteOverride } from '../../store/notes';
import { placementHistory } from '../../store/placements';
import { getProfile, saveProfile, setSkillLevel } from '../../store/profiles';
import { getSetting, setSetting, settingKeys } from '../../store/settings';
import { BigButton } from '../components/BigButton';
import { Card } from '../components/Card';
import { NoteView } from '../components/NoteView';
import { useProfiles } from '../ProfileContext';

type Tab = 'progress' | 'words' | 'time' | 'notes' | 'settings' | 'data';

interface Props {
  onBack: () => void;
  onLevelTest: () => void;
}

export function DashboardScreen({ onBack, onLevelTest }: Props) {
  const { profiles, activeId, setActive, refresh } = useProfiles();
  const [tab, setTab] = useState<Tab>('progress');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [placements, setPlacements] = useState<PlacementResult[]>([]);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    void (async () => {
      const db = await getDB();
      const [p, a, pl] = await Promise.all([getProfile(activeId), db.getAllFromIndex('attempts', 'byProfile', activeId), placementHistory(activeId)]);
      setProfile(p ?? null);
      setAttempts(a);
      setPlacements(pl);
    })();
  }, [activeId, reload]);

  const dash = attempts as DashAttempt[];
  const stats = useMemo(() => (profile ? levelStats(dash, profile.levels, profile.mastered ?? {}, profile.placedOut ?? {}) : []), [dash, profile]);

  const tabs: [Tab, string][] = [['progress', 'Progress'], ['words', 'Tricky words'], ['time', 'Practice time'], ['notes', 'Teaching notes'], ['settings', 'Settings'], ['data', 'Data']];

  return (
    <main className="flex-1 px-4 py-6 max-w-4xl w-full mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <BigButton tone="ghost" className="!text-lg !px-5 !py-2" onClick={onBack}>← back</BigButton>
        <h1 className="font-display text-3xl font-bold text-slate-800">Parent dashboard</h1>
        <select value={activeId} onChange={(e) => setActive(e.target.value)} className="ml-auto border border-slate-200 rounded-xl px-3 py-1.5 bg-white font-bold text-sm">
          {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="flex gap-1.5 flex-wrap text-sm font-bold">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-3.5 py-2 rounded-full border ${tab === id ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}>{label}</button>
        ))}
      </div>

      {tab === 'progress' && profile && <ProgressTab stats={stats} profile={profile} placements={placements} onLevelTest={onLevelTest} onChanged={() => setReload((r) => r + 1)} />}
      {tab === 'words' && <WordsTab attempts={dash} />}
      {tab === 'time' && <TimeTab attempts={dash} />}
      {tab === 'notes' && <NotesTab />}
      {tab === 'settings' && profile && <SettingsTab profile={profile} onChanged={async () => { await refresh(); setReload((r) => r + 1); }} />}
      {tab === 'data' && <DataTab profileId={activeId} profileName={profile?.name ?? ''} onChanged={async () => { await refresh(); setReload((r) => r + 1); }} />}
    </main>
  );
}

/* ---------- Progress ---------- */

function ProgressTab({ stats, profile, placements, onLevelTest, onChanged }: { stats: LevelStats[]; profile: Profile; placements: PlacementResult[]; onLevelTest: () => void; onChanged: () => void }) {
  const last = placements[placements.length - 1];
  const due = retestDue(profile.lastPlacementAt);
  const skills = [...SET1_SKILL_IDS, '2.1' as SkillId];

  const setLevel = async (skillId: SkillId, level: Level) => {
    await setSkillLevel(profile.id, skillId, level);
    onChanged();
  };

  const statusLabel: Record<LevelStats['status'], string> = { mastered: '✅ mastered', current: '▶ current', locked: '🔒', 'placed-out': '✅ placed out', 'not started': '' };

  return (
    <div className="flex flex-col gap-3">
      {due && (
        <Card className="p-4 flex items-center gap-3 flex-wrap bg-amber-50 border-amber-200">
          <span className="flex-1 text-sm font-semibold text-amber-900">It has been {Math.floor((Date.now() - (profile.lastPlacementAt ?? 0)) / (7 * 86400000))} weeks since the last level test. A retest shows how much has changed.</span>
          <BigButton tone="secondary" className="!text-base !px-4 !py-2" onClick={onLevelTest}>rerun the level test</BigButton>
        </Card>
      )}
      {!profile.lastPlacementAt && (
        <Card className="p-4 flex items-center gap-3 flex-wrap">
          <span className="flex-1 text-sm font-semibold text-slate-600">No level test yet. Everything started at Level 1.</span>
          <BigButton tone="secondary" className="!text-base !px-4 !py-2" onClick={onLevelTest}>take the level test</BigButton>
        </Card>
      )}
      <Card className="p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 text-xs uppercase tracking-wide">
              <th className="py-1 pr-2">Group</th>
              <th className="py-1">Level</th>
              <th className="py-1">Status</th>
              <th className="py-1">Attempts</th>
              <th className="py-1">First try</th>
              <th className="py-1">Last 20</th>
              <th className="py-1">Rule on / off</th>
              <th className="py-1">Set</th>
            </tr>
          </thead>
          <tbody>
            {skills.map((skillId) => {
              const rows = stats.filter((s) => s.skillId === skillId);
              return rows.map((s, i) => (
                <tr key={`${skillId}-${s.level}`} className={`border-t ${i === 0 ? 'border-slate-200' : 'border-slate-100'} ${s.status === 'current' ? 'bg-amber-50/60' : ''}`}>
                  <td className="py-1.5 pr-2 font-bold text-slate-700 whitespace-nowrap">{i === 0 && <><span className="text-slate-400 mr-1">{skillId}</span>{SKILLS[skillId].name}</>}</td>
                  <td className="py-1.5 font-display">Level {s.level}</td>
                  <td className="py-1.5 text-xs">{statusLabel[s.status]}</td>
                  <td className="py-1.5">{s.attempts}</td>
                  <td className="py-1.5">{s.attempts ? `${Math.round(s.accuracy * 100)}%` : '–'}</td>
                  <td className="py-1.5 text-xs text-slate-500">{s.report.attemptsInWindow ? `${s.report.cleanReads}/${s.report.attemptsInWindow} · ${s.report.distinctDays}d${s.report.mastered ? ' ✓' : s.report.stepBack ? ' ↓' : ''}` : '–'}</td>
                  <td className="py-1.5 text-xs text-slate-500">
                    {s.panelOnAccuracy !== null ? `${Math.round(s.panelOnAccuracy * 100)}%` : '–'} / {s.panelOffAccuracy !== null ? `${Math.round(s.panelOffAccuracy * 100)}%` : '–'}
                  </td>
                  <td className="py-1.5">
                    {s.status !== 'current' && <button onClick={() => void setLevel(skillId, s.level)} className="text-xs font-bold text-sky-700 underline">make current</button>}
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
        <p className="text-[11px] text-slate-400 mt-2">
          Mastery: {Math.round(config.mastery.masteryAccuracy * 100)}% first try over the last {config.mastery.windowSize} words on {config.mastery.minDistinctDays}+ days. "Rule on / off" compares first-try accuracy with the rule panel showing and hidden.
        </p>
      </Card>
      {last && (
        <Card className="p-4 text-sm">
          <div className="font-bold text-slate-700 mb-1">Last level test: {new Date(last.date).toLocaleDateString()}</div>
          <div className="flex flex-wrap gap-2">
            {SET1_SKILL_IDS.map((id) => <span key={id} className="bg-slate-100 rounded-full px-2.5 py-1 text-xs"><span className="text-slate-400">{id}</span> Level {last.placement[id]}</span>)}
          </div>
          <div className="text-xs text-slate-500 mt-2">{last.wordsTested} words · {last.missedWords.length} missed{last.endedEarly ? ' · ended early' : ''}{placements.length > 1 ? ` · ${placements.length} tests so far` : ''}</div>
        </Card>
      )}
    </div>
  );
}

/* ---------- Tricky words ---------- */

function WordsTab({ attempts }: { attempts: DashAttempt[] }) {
  const words = trickiestWords(attempts);
  return (
    <Card className="p-4">
      {words.length === 0 ? (
        <p className="text-sm text-slate-500">No tricky words yet. Words missed more than once will show here.</p>
      ) : (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-400 text-xs uppercase tracking-wide"><th className="py-1">Word</th><th className="py-1">Group</th><th className="py-1">Tries</th><th className="py-1">Missed</th><th className="py-1">Last seen</th></tr></thead>
          <tbody>
            {words.map((w) => (
              <tr key={w.word} className="border-t border-slate-100">
                <td className="py-1.5 font-display text-lg">{w.word}</td>
                <td className="py-1.5 text-xs text-slate-500"><span className="text-slate-400">{w.skillId}</span> L{w.level}</td>
                <td className="py-1.5">{w.attempts}</td>
                <td className="py-1.5 font-bold text-rose-700">{w.misses} ({Math.round(w.missRate * 100)}%)</td>
                <td className="py-1.5 text-xs text-slate-500">{new Date(w.lastSeen).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

/* ---------- Practice time ---------- */

function TimeTab({ attempts }: { attempts: DashAttempt[] }) {
  const weeks = weeklyPractice(attempts, 8);
  const max = Math.max(1, ...weeks.map((w) => w.minutes));
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Last 8 weeks (week starting Monday)</div>
      <div className="flex flex-col gap-1.5">
        {weeks.map((w) => (
          <div key={w.week} className="flex items-center gap-3 text-sm">
            <span className="w-24 text-slate-500 text-xs">{new Date(w.week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-sky-400" style={{ width: `${(w.minutes / max) * 100}%` }} /></div>
            <span className="w-40 text-xs text-slate-600 font-bold">{w.minutes} min · {w.days} day{w.days === 1 ? '' : 's'} · {w.attempts} words</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 mt-2">Minutes are estimated from the time between the first and last word of each sitting.</p>
    </Card>
  );
}

/* ---------- Teaching notes ---------- */

function NotesTab() {
  const [notes, setNotes] = useState<{ note: TeachingNote; edited: boolean }[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const load = () => void getAllNotes().then(setNotes);
  useEffect(load, []);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-slate-600">Short guides for teaching each rule. If your child has a teacher or tutor, edit these to match their wording.</p>
      {notes.map(({ note, edited }) => (
        <Card key={note.id} className="p-4">
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => setOpenId(openId === note.id ? null : note.id)} className="font-display text-lg font-semibold text-slate-800 text-left flex-1">
              {note.title} {edited && <span className="text-xs text-amber-700 font-body font-bold ml-1">(edited)</span>}
            </button>
            <div className="flex gap-2 text-xs font-bold">
              {editing !== note.id && <button onClick={() => { setEditing(note.id); setDraft(note.markdown); setOpenId(note.id); }} className="text-sky-700 underline">edit</button>}
              {edited && <button onClick={async () => { await restoreNote(note.id); setEditing(null); load(); }} className="text-rose-700 underline">restore original</button>}
            </div>
          </div>
          {openId === note.id && editing !== note.id && <div className="mt-3"><NoteView note={note} /></div>}
          {editing === note.id && (
            <div className="mt-3 flex flex-col gap-2">
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={16} className="w-full font-mono text-sm border border-slate-200 rounded-xl p-3" />
              <div className="flex gap-2">
                <BigButton className="!text-base !px-4 !py-2" onClick={async () => { await saveNoteOverride(note.id, draft); setEditing(null); load(); }}>save</BigButton>
                <BigButton tone="ghost" className="!text-base !px-4 !py-2" onClick={() => setEditing(null)}>cancel</BigButton>
              </div>
              <p className="text-[11px] text-slate-400">Keep the six headings (## Rule, ## How to teach, ## What to say, ## Common mistakes, ## Activity, ## Ready when).</p>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

/* ---------- Settings ---------- */

function SettingsTab({ profile, onChanged }: { profile: Profile; onChanged: () => Promise<void> }) {
  const [parentNotes, setParentNotes] = useState(false);
  const [coachMode, setCoachMode] = useState<CoachMode>('guided');
  useEffect(() => {
    void getSetting<boolean>(settingKeys.parentNotes, false).then(setParentNotes);
    void getSetting<CoachMode>(settingKeys.coachMode(profile.id), 'guided').then(setCoachMode);
  }, [profile.id]);

  const toggleUnlock = async (id: SkillId) => {
    const list = profile.manualUnlocks ?? [];
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    await saveProfile({ ...profile, manualUnlocks: next });
    await onChanged();
  };

  return (
    <div className="flex flex-col gap-3">
      <Card className="p-4 flex items-center justify-between gap-3">
        <div>
          <div className="font-bold text-slate-800">Parent teaching notes</div>
          <div className="text-xs text-slate-500">Shows a "Parent tip" tab on the practice screen with the note for the current rule. Never shown during the level test.</div>
        </div>
        <button role="switch" aria-checked={parentNotes} onClick={() => { const v = !parentNotes; setParentNotes(v); void setSetting(settingKeys.parentNotes, v); }} className={`relative inline-flex h-6 w-11 rounded-full transition ${parentNotes ? 'bg-emerald-500' : 'bg-slate-300'}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${parentNotes ? 'left-5' : 'left-0.5'}`} />
        </button>
      </Card>
      <Card className="p-4">
        <div className="font-bold text-slate-800 mb-1">Break It Down coach ({profile.name})</div>
        <div className="flex gap-2 flex-wrap text-sm font-bold">
          {(['guided', 'onRequest', 'off'] as const).map((m) => (
            <button key={m} onClick={() => { setCoachMode(m); void setSetting(settingKeys.coachMode(profile.id), m); }} className={`px-3 py-1.5 rounded-full border ${coachMode === m ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white border-slate-200'}`}>
              {m === 'guided' ? 'Guided' : m === 'onRequest' ? 'On request only' : 'Off'}
            </button>
          ))}
        </div>
      </Card>
      <Card className="p-4">
        <div className="font-bold text-slate-800 mb-1">Word Skills (Set 2) unlocked by hand</div>
        <div className="text-xs text-slate-500 mb-2">Set 2 opens on its own once groups 1.1 to 1.3 reach Level {config.set2.unlockAtLevel}. Tick a skill to open it early. Only 2.1 has words in v1.</div>
        <div className="flex gap-1.5 flex-wrap">
          {SET2_SKILL_IDS.map((id) => (
            <button key={id} onClick={() => void toggleUnlock(id)} className={`px-2.5 py-1 rounded-full border text-xs font-bold ${(profile.manualUnlocks ?? []).includes(id) ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white border-slate-200 text-slate-600'}`}>
              {id} {SKILLS[id].name}
            </button>
          ))}
        </div>
      </Card>
      <p className="text-xs text-slate-500">Voice engine and microphone settings are in the Audio dialog (🎧 in the header).</p>
    </div>
  );
}

/* ---------- Data ---------- */

function DataTab({ profileId, profileName, onChanged }: { profileId: string; profileName: string; onChanged: () => Promise<void> }) {
  const [message, setMessage] = useState<string | null>(null);
  const [confirmImport, setConfirmImport] = useState<{ name: string; data: unknown } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const doExport = async () => {
    const backup = await exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(`Saved ${backupFileName()} (${backup.attempts.length} attempts, ${backup.profiles.length} readers).`);
  };

  const pick = (file: File | undefined) => {
    if (!file) return;
    void file.text().then((text) => {
      try {
        setConfirmImport({ name: file.name, data: JSON.parse(text) });
      } catch {
        setMessage('That file is not valid JSON.');
      }
    });
  };

  const doImport = async () => {
    if (!confirmImport) return;
    const v = validateBackup(confirmImport.data);
    if (!v.ok) { setMessage(v.error); setConfirmImport(null); return; }
    await importBackup(v.backup);
    setConfirmImport(null);
    await onChanged();
    setMessage(`Imported ${v.backup.profiles.length} readers and ${v.backup.attempts.length} attempts. Everything that was on this device before has been replaced.`);
  };

  return (
    <div className="flex flex-col gap-3">
      <Card className="p-4 flex flex-col gap-2">
        <div className="font-bold text-slate-800">Export</div>
        <p className="text-xs text-slate-500">Saves every reader, attempt, review word, level test and setting on this device as one JSON file. Use it to move to a new tablet or keep a backup.</p>
        <BigButton className="!text-base !px-4 !py-2 self-start" onClick={() => void doExport()}>⬇ export data</BigButton>
      </Card>
      <Card className="p-4 flex flex-col gap-2">
        <div className="font-bold text-slate-800">Import</div>
        <p className="text-xs text-slate-500">Replaces everything on this device with a backup file.</p>
        <input type="file" accept="application/json,.json" onChange={(e) => pick(e.target.files?.[0])} className="text-sm" />
        {confirmImport && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm">
            <div className="font-bold text-rose-800 mb-2">Replace all data on this device with "{confirmImport.name}"? This cannot be undone.</div>
            <div className="flex gap-2">
              <BigButton className="!text-base !px-4 !py-2 !bg-rose-500 !border-rose-700" onClick={() => void doImport()}>yes, replace</BigButton>
              <BigButton tone="ghost" className="!text-base !px-4 !py-2" onClick={() => setConfirmImport(null)}>cancel</BigButton>
            </div>
          </div>
        )}
      </Card>
      <Card className="p-4 flex flex-col gap-2">
        <div className="font-bold text-slate-800">Reset {profileName}'s progress</div>
        <p className="text-xs text-slate-500">Clears this reader's attempts, review words and level tests and sets every group back to Level 1. The reader stays.</p>
        {confirmReset ? (
          <div className="flex gap-2">
            <BigButton className="!text-base !px-4 !py-2 !bg-rose-500 !border-rose-700" onClick={async () => { await resetProfileHistory(profileId); setConfirmReset(false); await onChanged(); setMessage(`${profileName}'s progress was reset.`); }}>yes, reset</BigButton>
            <BigButton tone="ghost" className="!text-base !px-4 !py-2" onClick={() => setConfirmReset(false)}>cancel</BigButton>
          </div>
        ) : (
          <BigButton tone="ghost" className="!text-base !px-4 !py-2 self-start" onClick={() => setConfirmReset(true)}>reset progress…</BigButton>
        )}
      </Card>
      {message && <p className="text-sm font-semibold text-emerald-700">{message}</p>}
    </div>
  );
}
