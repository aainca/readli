import { useEffect, useState } from 'react';
import { SKILLS, type Level } from '../../content/schema';
import { createGame, currentPlayer, passTurn, progress, recordWord, standings, totalStars, type TurnState } from '../../engine/turns';
import { tts } from '../../speech/tts';
import { getProfile } from '../../store/profiles';
import { BigButton } from '../components/BigButton';
import { Card } from '../components/Card';
import { StarConfetti } from '../components/StarConfetti';
import type { GameSetup } from './MultiplayerSetupScreen';
import { PracticeScreen } from './PracticeScreen';

type Phase = 'banner' | 'turn' | 'over';

/**
 * Same-device multiplayer. Between turns a large banner names the next
 * player and waits for a tap; the practice screen is unmounted during the
 * hand-off, so no speech result can land on the wrong player.
 */
export function MultiplayerScreen({ setup, onExit }: { setup: GameSetup; onExit: () => void }) {
  const [game, setGame] = useState<TurnState>(() => createGame(setup.players, setup.mode, setup.goal, setup.wordsPerTurn));
  const [phase, setPhase] = useState<Phase>('banner');
  const [level, setLevel] = useState<Level | null>(null);
  const [turnKey, setTurnKey] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const player = currentPlayer(game);

  // Each player reads at his or her own level in the chosen group.
  useEffect(() => {
    if (phase !== 'banner') return;
    setLevel(null);
    void getProfile(player.profileId).then((p) => setLevel(p?.levels[setup.skillId] ?? SKILLS[setup.skillId].levels[0]!));
    void tts.speak(`${player.name}, your turn!`);
  }, [phase, player.profileId, player.name, setup.skillId]);

  const onWordDone = (stars: number) => {
    const r = recordWord(game, stars);
    setGame(r.state);
    if (r.state.finished) {
      setPhase('over');
      void tts.speak(r.state.mode === 'coop' ? 'You did it together!' : `${r.state.players[r.state.winner ?? 0]!.name} wins!`);
    } else if (r.turnEnded) {
      setPhase('banner');
      setTurnKey((k) => k + 1);
    }
  };

  const pass = () => {
    setGame(passTurn(game));
    setPhase('banner');
    setTurnKey((k) => k + 1);
  };

  const pct = Math.round(progress(game) * 100);

  return (
    <div className="flex-1 flex flex-col">
      {/* Scoreboard */}
      <div className="px-4 pt-3 max-w-3xl w-full mx-auto">
        <Card className="p-3 flex items-center gap-3 flex-wrap">
          {game.players.map((p, i) => (
            <div key={p.profileId} className={`flex items-center gap-2 rounded-full px-2.5 py-1 ${i === game.current && phase !== 'over' ? 'bg-amber-100 ring-2 ring-amber-300' : 'bg-slate-50'}`}>
              <span className="w-7 h-7 rounded-full text-white font-bold flex items-center justify-center" style={{ background: p.color }}>{p.name[0]?.toUpperCase()}</span>
              <span className="font-display">{p.name}</span>
              <span className="font-display font-bold text-amber-700">⭐ {game.scores[i]}</span>
            </div>
          ))}
          <div className="flex-1 min-w-[8rem]">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {game.mode === 'coop' ? `team: ${totalStars(game)} of ${game.goal}` : `first to ${game.goal}`}
            </div>
            <div className="h-3 rounded-full bg-slate-200 overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${pct}%` }} /></div>
          </div>
          <button onClick={() => { tts.cancel(); onExit(); }} className="text-xs font-bold text-slate-400 underline">quit game</button>
        </Card>
        {note && <div className="mt-2 text-center text-sm font-bold text-emerald-700">{note}</div>}
      </div>

      {phase === 'banner' && (
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <Card className="p-10 text-center flex flex-col items-center gap-4 w-full max-w-xl" style={{ borderColor: player.color }}>
            <span className="w-28 h-28 rounded-full text-white font-display text-6xl font-bold flex items-center justify-center shadow-lg bounce-gentle" style={{ background: player.color }}>{player.name[0]?.toUpperCase()}</span>
            <h1 className="font-display text-5xl font-bold text-slate-800">{player.name}, your turn!</h1>
            <p className="text-slate-500 font-semibold">{setup.wordsPerTurn} words · {SKILLS[setup.skillId].name}{level !== null ? ` · Level ${level}` : ''} · round {game.round}</p>
            <BigButton disabled={level === null} onClick={() => setPhase('turn')}>👉 I'm ready</BigButton>
          </Card>
        </main>
      )}

      {phase === 'turn' && level !== null && (
        <PracticeScreen
          key={`${player.profileId}-${turnKey}`}
          profileId={player.profileId}
          skillId={setup.skillId}
          level={level}
          wordsPerSession={setup.wordsPerTurn}
          turnLabel={`${player.name}'s turn`}
          onStats={() => {}}
          onExit={pass}
          onWordDone={onWordDone}
          onComplete={() => { /* the turn manager already passed the turn on the last word */ }}
          onLevelUp={(_from, to) => { setNote(`${player.name} unlocked Level ${to}! It starts next turn.`); pass(); }}
          onFastAdjustDown={(to) => { setNote(`${player.name} will try Level ${to} next turn.`); pass(); }}
        />
      )}

      {phase === 'over' && (
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <StarConfetti count={60} />
          <Card className="p-10 text-center flex flex-col items-center gap-4 w-full max-w-xl">
            <div className="text-7xl">{game.mode === 'coop' ? '🤝' : '🏆'}</div>
            <h1 className="font-display text-5xl font-bold text-orange-600">
              {game.mode === 'coop' ? 'You did it together!' : `${game.players[game.winner ?? 0]!.name} wins!`}
            </h1>
            <div className="flex flex-col gap-1 w-full max-w-xs">
              {standings(game).map(({ player: p, stars, words }) => (
                <div key={p.profileId} className="flex items-center justify-between font-display text-xl">
                  <span className="flex items-center gap-2"><span className="w-7 h-7 rounded-full text-white font-bold flex items-center justify-center text-base" style={{ background: p.color }}>{p.name[0]?.toUpperCase()}</span>{p.name}</span>
                  <span>⭐ {stars} · {words} words</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
              <BigButton onClick={() => { setGame(createGame(setup.players, setup.mode, setup.goal, setup.wordsPerTurn)); setPhase('banner'); setTurnKey((k) => k + 1); }}>play again</BigButton>
              <BigButton tone="ghost" onClick={onExit}>home</BigButton>
            </div>
          </Card>
        </main>
      )}
    </div>
  );
}
