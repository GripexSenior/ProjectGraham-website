import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckSquare,
  MessageSquarePlus,
  Sparkles,
} from 'lucide-react';
import {
  AddJournalCommentRequestDto,
  CreateJournalEntryRequestDto,
  GroupFilter,
  JournalEntryDto,
  UserDto,
  UserId,
} from '../types';

interface EveningJournalModuleProps {
  entries: JournalEntryDto[];
  users: UserDto[];
  activeUserId: UserId;
  groupFilter: GroupFilter;
  onCreateEntry: (payload: CreateJournalEntryRequestDto) => Promise<void>;
  onAddComment: (payload: AddJournalCommentRequestDto) => Promise<void>;
}

export const EveningJournalModule: React.FC<EveningJournalModuleProps> = ({
  entries,
  users,
  activeUserId,
  groupFilter,
  onCreateEntry,
  onAddComment,
}) => {
  // Stan formularza nowego wieczornego wpisu
  const [entryDate, setEntryDate] = useState('2026-11-08');
  const [dayRating, setDayRating] = useState<number>(8);
  const [completedTasksText, setCompletedTasksText] = useState('');
  const [summaryAndLessons, setSummaryAndLessons] = useState('');
  const [improvementsText, setImprovementsText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stan komentarzy motywacyjnych pod wpisami kolegów
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingCommentFor, setSubmittingCommentFor] = useState<string | null>(
    null
  );

  const userMap = useMemo(() => {
    const map: Record<string, UserDto> = {};
    for (const u of users) map[u.id] = u;
    return map;
  }, [users]);

  const filteredEntries = useMemo(() => {
    if (groupFilter === 'ALL') return entries;
    return entries.filter((e) => e.userId === groupFilter);
  }, [entries, groupFilter]);

  const handleSubmitJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completedTasksText.trim()) {
      setFormError('Wpisz zrealizowane dzisiaj karteczki / zadania.');
      return;
    }
    if (!summaryAndLessons.trim()) {
      setFormError('Wpisz główne podsumowanie dnia i wnioski.');
      return;
    }
    if (!improvementsText.trim()) {
      setFormError('Wpisz co dzisiaj zrobiłeś źle lub co mogłeś zrobić lepiej.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await onCreateEntry({
        userId: activeUserId,
        entryDate,
        dayRating,
        completedTasksText: completedTasksText.trim(),
        summaryAndLessons: summaryAndLessons.trim(),
        improvementsText: improvementsText.trim(),
      });
      setCompletedTasksText('');
      setSummaryAndLessons('');
      setImprovementsText('');
      setDayRating(8);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent, entryId: string) => {
    e.preventDefault();
    const text = commentInputs[entryId]?.trim();
    if (!text) return;

    setSubmittingCommentFor(entryId);
    try {
      await onAddComment({
        journalEntryId: entryId,
        authorId: activeUserId,
        content: text,
      });
      setCommentInputs((prev) => ({ ...prev, [entryId]: '' }));
    } finally {
      setSubmittingCommentFor(null);
    }
  };

  return (
    <section className="space-y-8" aria-label="Moduł Wieczornego Dziennika">
      {/* Nagłówek sekcji */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50 font-display">
            Wieczorny Dziennik &amp; Refleksja
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Codzienny rytuał zamknięcia dnia: ocena 1-10, zrealizowane karteczki, wnioski oraz obszary do poprawy
          </p>
        </div>

        <div className="text-xs text-slate-400">
          Zalogowany autor wpisu:{' '}
          <strong className="text-indigo-400 font-semibold">
            {userMap[activeUserId]?.name}
          </strong>
        </div>
      </div>

      {/* Układ 2-kolumnowy: Lewa kolumna formularz wieczornego wpisu, Prawa kolumna Oś Czasu (Timeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* FORMULARZ WIECZORNEGO WPISU (5 kolumn) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/75 p-6 space-y-5">
          <div className="border-b border-slate-800 pb-4">
            <div className="text-xs font-semibold text-indigo-400">
              Nowy wpis wieczorny · {userMap[activeUserId]?.name}
            </div>
            <h2 className="text-lg font-bold text-white font-display mt-0.5">
              Zamknij dzisiejszy dzień
            </h2>
          </div>

          <form onSubmit={handleSubmitJournal} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
                {formError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <label
                  htmlFor="journal-date-input"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Data wpisu
                </label>
                <input
                  id="journal-date-input"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">
                  Wybrana ocena dnia
                </span>
                <span className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
                  {dayRating}/10
                </span>
              </div>
            </div>

            {/* Ocena dnia 1 - 10 (5x2 na telefonie dla wygodnego dotyku >=44px, 10x1 na sm+) */}
            <div>
              <span className="block text-xs font-semibold text-slate-300 mb-2">
                Ocena dzisiejszego dnia (1-10) *
              </span>
              <div
                className="grid grid-cols-5 sm:grid-cols-10 gap-1.5"
                role="radiogroup"
                aria-label="Ocena dnia od 1 do 10"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const selected = dayRating === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setDayRating(num)}
                      className={`min-h-[42px] sm:min-h-0 py-2 text-xs font-mono tabular-nums font-bold rounded-lg border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-indigo-600 border-indigo-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Zrealizowane dzisiaj karteczki */}
            <div>
              <label
                htmlFor="journal-completed-tasks-input"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Zrealizowane dzisiaj karteczki *
              </label>
              <textarea
                id="journal-completed-tasks-input"
                rows={2}
                required
                value={completedTasksText}
                onChange={(e) => setCompletedTasksText(e.target.value)}
                placeholder="np. 1. Moduł autoryzacji API [2 karteczki] 2. Trening siłowy 3. Odczytanie zaległych umów..."
                className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Główne podsumowanie dnia / wnioski */}
            <div>
              <label
                htmlFor="journal-summary-input"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Główne podsumowanie dnia / wnioski *
              </label>
              <textarea
                id="journal-summary-input"
                rows={3}
                required
                value={summaryAndLessons}
                onChange={(e) => setSummaryAndLessons(e.target.value)}
                placeholder="Jak przebiegł dzień i jakie wyciągasz z niego główne wnioski?"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Co dzisiaj zrobiłem źle / mogłem zrobić lepiej */}
            <div>
              <label
                htmlFor="journal-improvements-input"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Co dzisiaj zrobiłem źle / mogłem zrobić lepiej *
              </label>
              <textarea
                id="journal-improvements-input"
                rows={2}
                required
                value={improvementsText}
                onChange={(e) => setImprovementsText(e.target.value)}
                placeholder="np. Za późno odłożyłem telefon wieczorem, rozproszenie po obiedzie, zbyt krótka rozgrzewka..."
                className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              {isSubmitting
                ? 'Zapisywanie wpisu...'
                : 'Zapisz wpis na osi czasu grupy'}
            </button>
          </form>
        </div>

        {/* OŚ CZASU WPISÓW GRUPY (TIMELINE - 7 kolumn) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100 font-display">
              Oś czasu wpisów grupy ({filteredEntries.length})
            </h2>
            <span className="text-xs text-slate-400">
              Dodaj komentarz motywacyjny pod wpisem kolegi
            </span>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="p-10 text-center rounded-2xl border border-slate-800 bg-slate-900/40 text-sm text-slate-400">
              Brak wpisów w dzienniku dla wybranego filtra.
            </div>
          ) : (
            <div className="space-y-6">
              {filteredEntries.map((entry) => {
                const author = userMap[entry.userId];
                const commentDraft = commentInputs[entry.id] || '';

                return (
                  <article
                    key={entry.id}
                    className="relative rounded-2xl border border-slate-800/90 bg-slate-900/65 overflow-hidden"
                  >
                    {/* Nagłówek wpisu */}
                    <div className="px-6 py-4 bg-slate-900 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-300 font-mono">
                          {author?.avatarInitials || 'US'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-sm font-bold text-white font-display">
                            <span>{author?.name || entry.userId}</span>
                            <span className="text-xs font-normal text-slate-400">
                              · {author?.roleTitle}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono tabular-nums">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>Dzień: {entry.entryDate}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block">
                          Ocena dnia
                        </span>
                        <span className="text-base font-bold font-mono tabular-nums text-emerald-400">
                          {entry.dayRating}/10
                        </span>
                      </div>
                    </div>

                    {/* Treść 3 sekcji wpisu */}
                    <div className="p-6 space-y-4">
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                          <CheckSquare className="w-3.5 h-3.5" />
                          Zrealizowane dzisiaj karteczki
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed">
                          {entry.completedTasksText}
                        </p>
                      </div>

                      <div className="space-y-1 pt-2 border-t border-slate-800/60">
                        <div className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Główne podsumowanie dnia / wnioski
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed">
                          {entry.summaryAndLessons}
                        </p>
                      </div>

                      <div className="space-y-1 pt-2 border-t border-slate-800/60">
                        <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Co dzisiaj zrobiłem źle / mogłem zrobić lepiej
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">
                          {entry.improvementsText}
                        </p>
                      </div>
                    </div>

                    {/* Sekcja komentarzy motywacyjnych */}
                    <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800/80 space-y-3">
                      {entry.comments.length > 0 && (
                        <div className="space-y-2">
                          {entry.comments.map((cmt) => {
                            const cmtAuthor = userMap[cmt.authorId];
                            return (
                              <div
                                key={cmt.id}
                                className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between text-slate-400">
                                  <span className="font-semibold text-indigo-300">
                                    {cmtAuthor?.name || cmt.authorId}
                                  </span>
                                  <span className="font-mono tabular-nums text-[11px]">
                                    Komentarz motywacyjny
                                  </span>
                                </div>
                                <p className="text-slate-200 leading-relaxed">
                                  {cmt.content}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <form
                        onSubmit={(e) => handleCommentSubmit(e, entry.id)}
                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1"
                      >
                        <label
                          htmlFor={`comment-input-${entry.id}`}
                          className="sr-only"
                        >
                          Dodaj komentarz motywacyjny dla {author?.name}
                        </label>
                        <input
                          id={`comment-input-${entry.id}`}
                          type="text"
                          value={commentDraft}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [entry.id]: e.target.value,
                            }))
                          }
                          placeholder={`Napisz słowo wsparcia jako ${userMap[activeUserId]?.name}...`}
                          className="flex-1 min-h-[42px] sm:min-h-0 px-3.5 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="submit"
                          disabled={
                            !commentDraft.trim() ||
                            submittingCommentFor === entry.id
                          }
                          aria-label={`Wyślij komentarz pod wpisem ${author?.name}`}
                          className="min-h-[42px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg transition-colors shrink-0 cursor-pointer"
                        >
                          <MessageSquarePlus className="w-3.5 h-3.5" />
                          <span>Skomentuj</span>
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
