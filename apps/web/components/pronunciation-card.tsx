'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';

interface Phone {
  phone: string;
  quality_score: number;
  sound_most_like?: string;
}

interface Word {
  word: string;
  quality_score: number;
  phone_list?: Phone[];
}

interface FocusPhone {
  phone: string;
  score: number;
  sounds_like?: string[];
  tip?: string;
}

export interface PronunciationResult {
  scores_data?: { francoflex_score?: number; cefr_score?: string };
  words_data?: Word[];
  practice_priorities?: {
    level?: string;
    summary?: string;
    next_step?: string;
    focus_phones?: FocusPhone[];
  };
  error?: string;
}

function scoreTone(score: number): { bg: string; text: string; ring: string } {
  if (score >= 90) return { bg: 'bg-emerald-100', text: 'text-emerald-900', ring: 'ring-emerald-300' };
  if (score >= 75) return { bg: 'bg-amber-100', text: 'text-amber-900', ring: 'ring-amber-300' };
  if (score >= 60) return { bg: 'bg-orange-100', text: 'text-orange-900', ring: 'ring-orange-300' };
  return { bg: 'bg-rose-100', text: 'text-rose-900', ring: 'ring-rose-300' };
}

function levelLabel(level?: string): { label: string; tone: string } {
  switch (level) {
    case 'excellent':
      return { label: 'Excellent', tone: 'bg-emerald-200 text-emerald-900' };
    case 'good':
      return { label: 'Good', tone: 'bg-amber-200 text-amber-900' };
    case 'needs_work':
      return { label: 'Needs work', tone: 'bg-orange-200 text-orange-900' };
    case 'struggling':
      return { label: 'Struggling', tone: 'bg-rose-200 text-rose-900' };
    default:
      return { label: level ?? '—', tone: 'bg-neutral-200 text-neutral-800' };
  }
}

export function PronunciationCard({
  data,
  loading,
  defaultOpen = false,
}: {
  data?: PronunciationResult;
  loading?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-base border border-border bg-neutral-50 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wide text-foreground/60">
        <span className="size-1.5 animate-pulse rounded-full bg-foreground/50" />
        Analyzing pronunciation…
      </div>
    );
  }

  if (!data) return null;

  if (data.error) {
    return (
      <div className="rounded-base border-2 border-rose-300 bg-rose-50 p-2 text-xs text-rose-900">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide">
          Pronunciation error
        </div>
        <div className="font-mono text-[11px] leading-snug">{data.error}</div>
      </div>
    );
  }

  const overall = data.scores_data?.francoflex_score;
  const cefr = data.scores_data?.cefr_score;
  const summary = data.practice_priorities?.summary;
  const nextStep = data.practice_priorities?.next_step;
  const level = levelLabel(data.practice_priorities?.level);
  const focusPhones = data.practice_priorities?.focus_phones ?? [];
  const words = data.words_data ?? [];
  const overallTone = overall != null ? scoreTone(overall) : null;

  return (
    <div className="w-full overflow-hidden rounded-base border border-border bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors hover:bg-neutral-50',
          open && 'border-b border-border',
        )}
        aria-expanded={open}
      >
        {overall != null && overallTone && (
          <div
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-full font-heading text-[11px] leading-none',
              overallTone.bg,
              overallTone.text,
            )}
          >
            {Math.round(overall)}
          </div>
        )}
        <span
          className={cn(
            'rounded-full px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide',
            level.tone,
          )}
        >
          {level.label}
        </span>
        {cefr && (
          <span className="rounded-full border border-border bg-white px-1.5 py-px font-mono text-[9px] font-semibold">
            {cefr}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-[11px] text-foreground/70">
          {summary || 'Pronunciation analysis'}
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 text-foreground/50 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="space-y-3 p-3">
      {words.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-foreground/50">
            Words
          </div>
          <div className="flex flex-wrap gap-1.5">
            {words.map((w, idx) => {
              const tone = scoreTone(w.quality_score);
              return (
                <div
                  key={`${w.word}-${idx}`}
                  className={cn(
                    'group relative rounded-base border border-border px-2 py-1 text-xs font-medium',
                    tone.bg,
                    tone.text,
                  )}
                  title={`${w.word} — ${Math.round(w.quality_score)}`}
                >
                  <span>{w.word}</span>
                  <span className="ml-1.5 font-mono text-[10px] opacity-70">
                    {Math.round(w.quality_score)}
                  </span>
                  {w.phone_list && w.phone_list.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {w.phone_list.map((p, i) => {
                        const pt = scoreTone(p.quality_score);
                        const off = p.sound_most_like && p.sound_most_like !== p.phone;
                        return (
                          <span
                            key={`${p.phone}-${i}`}
                            className={cn(
                              'rounded-sm px-1 py-px font-mono text-[9px] leading-none ring-1',
                              pt.bg,
                              pt.text,
                              pt.ring,
                            )}
                            title={
                              off
                                ? `${p.phone} → sounds like ${p.sound_most_like} (${Math.round(p.quality_score)})`
                                : `${p.phone} (${Math.round(p.quality_score)})`
                            }
                          >
                            {p.phone}
                            {off && <span className="opacity-70">→{p.sound_most_like}</span>}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(focusPhones.length > 0 || nextStep) && (
        <div className="space-y-1.5 rounded-base border border-border bg-neutral-50 p-2">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-foreground/50">
            Focus
          </div>
          {nextStep && <p className="text-xs leading-snug text-foreground/85">{nextStep}</p>}
          {focusPhones.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {focusPhones.map((fp, i) => {
                const tone = scoreTone(fp.score);
                const sl = fp.sounds_like?.find((s) => s !== fp.phone);
                return (
                  <span
                    key={`${fp.phone}-${i}`}
                    className={cn(
                      'rounded-base border border-border px-1.5 py-0.5 font-mono text-[10px]',
                      tone.bg,
                      tone.text,
                    )}
                    title={fp.tip || undefined}
                  >
                    {fp.phone}
                    {sl && <span className="opacity-70"> →{sl}</span>}
                    <span className="ml-1 opacity-70">{Math.round(fp.score)}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
        </div>
      )}
    </div>
  );
}
