import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Compass,
  Dumbbell,
  Flame,
  Target,
} from 'lucide-react';
import {
  AppModule,
  HubDatabaseSnapshotDto,
  UserId,
} from '../types';
import { calculateGymTotalVolumeKg } from '../utils/domainUtils';

interface LandingPageModuleProps {
  snapshot: HubDatabaseSnapshotDto;
  activeUserId: UserId;
  hasUnsettledPreviousMonth: boolean;
  onNavigateModule: (module: AppModule) => void;
  onSelectUserAndNavigate: (userId: UserId, module: AppModule) => void;
}

const GOGGINS_IMAGE_URL = '/assets/aistudio/0_bgHOhi55LEaH9Vjy_6151fb4d.jpg';

export const LandingPageModule: React.FC<LandingPageModuleProps> = ({
  snapshot,
  activeUserId,
  onNavigateModule,
  onSelectUserAndNavigate,
}) => {
  const totalWorkoutsCompleted = snapshot.workouts.filter(
    (w) => !w.isPlannedOnly
  ).length;

  const totalGymVolumeKg = snapshot.workouts.reduce(
    (acc, w) =>
      w.workoutType === 'GYM'
        ? acc + calculateGymTotalVolumeKg(w.gymExercises)
        : acc,
    0
  );

  const totalCardioKm =
    Math.round(
      snapshot.workouts.reduce(
        (acc, w) =>
          w.workoutType === 'CARDIO' && w.cardioMetrics
            ? acc + w.cardioMetrics.distanceKm
            : acc,
        0
      ) * 10
    ) / 10;

  const novemberGoals = snapshot.monthlyGoals.filter(
    (g) => g.monthKey === '2026-11'
  );

  return (
    <section className="space-y-12 sm:space-y-16" aria-label="Strona główna Projekt Graham">
      <div className="rounded-3xl border border-slate-800/90 bg-slate-900/50 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
            <blockquote className="space-y-5">
              <h1
                className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08] font-display"
                style={{ textWrap: 'balance' }}
              >
                &ldquo;What if i can pull a fucking miracle?&rdquo;
              </h1>
              <footer className="text-sm sm:text-base font-medium text-slate-400 tracking-wide">
                — David Goggins
              </footer>
            </blockquote>
          </div>

          <div className="lg:col-span-5 relative min-h-[340px] sm:min-h-[420px] lg:min-h-[460px] bg-slate-950 border-t lg:border-t-0 lg:border-l border-slate-800/80 overflow-hidden">
            <img
              src={GOGGINS_IMAGE_URL}
              alt="David Goggins"
              className="w-full h-full object-cover object-center lg:h-full"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50">
          <span className="text-xs text-slate-400 block">
            Aktywne cele na Listopad 2026
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-white font-mono tabular-nums mt-1 block">
            {novemberGoals.length}
          </span>
          <span className="text-[11px] text-indigo-400 mt-1 block">
            Wspólna egzekucja: Dymitr i Franek
          </span>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50">
          <span className="text-xs text-slate-400 block">
            Przerzucony tonaż siłowy
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono tabular-nums mt-1 block">
            {totalGymVolumeKg.toLocaleString('pl-PL')} kg
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Zarejestrowane serie robocze
          </span>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50">
          <span className="text-xs text-slate-400 block">
            Wybiegania &amp; Baza Tlenowa
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-indigo-400 font-mono tabular-nums mt-1 block">
            {totalCardioKm} km
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {totalWorkoutsCompleted} ukończonych sesji w bazie
          </span>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50">
          <span className="text-xs text-slate-400 block">
            Wieczorne raporty dnia
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-amber-400 font-mono tabular-nums mt-1 block">
            {snapshot.journalEntries.length}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Zrealizowane karteczki i wnioski
          </span>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
              System Operacyjny Projektu Graham
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Cztery zintegrowane moduły zaprojektowane dla naszej zamkniętej grupy
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Wybierz moduł, aby przejść do działania
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <article className="p-6 rounded-2xl border border-slate-800/90 bg-slate-900/60 hover:border-slate-700 transition-colors flex flex-col justify-between space-y-5">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-indigo-400 font-semibold">
                <span>01. Moduł Celów i Formularz Kontrolny</span>
                <Target className="w-4 h-4" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white font-display">
                Miesięczne KPI oraz przymusowy audyt wykonania
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Każdy z nas definiuje mierzalne cele na dany miesiąc (np. 2026-11). Po zakończeniu miesiąca system wymaga wypełnienia Formularza Kontrolnego: status realizacji, suwak procentowy oraz twarde wnioski.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">
                {novemberGoals.length} celów aktywnych w 2026-11
              </span>
              <button
                type="button"
                onClick={() => onNavigateModule('GOALS')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
              >
                <span>Otwórz Cele Miesięczne</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </article>

          <article className="p-6 rounded-2xl border border-slate-800/90 bg-slate-900/60 hover:border-slate-700 transition-colors flex flex-col justify-between space-y-5">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <span>02. Wieczorny Dziennik (Daily Journal)</span>
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white font-display">
                Zrealizowane karteczki, wnioski i rachunek sumienia
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Codzienny wieczorny meldunek widoczny dla Was obu: ocena dnia (1–10), lista zrealizowanych dzisiaj karteczek, główne podsumowanie dnia oraz szczera analiza tego, co mogłeś zrobić lepiej.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">
                {snapshot.journalEntries.length} wpisów na osi czasu
              </span>
              <button
                type="button"
                onClick={() => onNavigateModule('JOURNAL')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
              >
                <span>Otwórz Wieczorny Dziennik</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </article>

          <article className="p-6 rounded-2xl border border-slate-800/90 bg-slate-900/60 hover:border-slate-700 transition-colors flex flex-col justify-between space-y-5">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
                <span>03. Uniwersalny Planer i Dziennik Treningowy</span>
                <Dumbbell className="w-4 h-4" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white font-display">
                Siłownia, Bieganie, BJJ i Basen w jednym rejestrze
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Dynamiczny formularz dopasowany do dyscypliny: pełny tonaż i serie robocze na siłowni, tempo i tętno w biegach ulicznych oraz intensywność RPE i notatki techniczne ze sztuk walki i pływania.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">
                {snapshot.workouts.length} jednostek w dzienniku
              </span>
              <button
                type="button"
                onClick={() => onNavigateModule('WORKOUTS')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
              >
                <span>Otwórz Planer Treningowy</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </article>

          <article className="p-6 rounded-2xl border border-slate-800/90 bg-slate-900/60 hover:border-slate-700 transition-colors flex flex-col justify-between space-y-5">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-indigo-400 font-semibold">
                <span>04. Redakcja Ciekawostek (Bento Portal)</span>
                <Compass className="w-4 h-4" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white font-display">
                Wspólna baza wiedzy, wykładów YouTube i artykułów
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Tablica inspiracji w stylu nowoczesnego portalu informacyjnego. Automatyczne pobieranie miniaturek z YouTube, wbudowany odtwarzacz wideo w modalu oraz selekcja najlepszych materiałów o zdrowiu, sile i architekturze IT.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">
                {snapshot.discoveries.length} opublikowanych znalezisk
              </span>
              <button
                type="button"
                onClick={() => onNavigateModule('DISCOVERIES')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
              >
                <span>Otwórz Portal Ciekawostek</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </article>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
              Członkowie Projektu Graham
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Kliknij kartę wybranego przyjaciela, aby przełączyć sesję i sprawdzić jego cele
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {snapshot.users.map((member) => {
            const memberNovGoals = snapshot.monthlyGoals.filter(
              (g) => g.userId === member.id && g.monthKey === '2026-11'
            );
            const avgProgress =
              memberNovGoals.length > 0
                ? Math.round(
                    memberNovGoals.reduce(
                      (acc, g) => acc + g.progressPercentage,
                      0
                    ) / memberNovGoals.length
                  )
                : 0;
            const isCurrentSession = member.id === activeUserId;

            return (
              <div
                key={member.id}
                className={`p-5 rounded-2xl border transition-colors flex flex-col justify-between space-y-4 ${
                  isCurrentSession
                    ? 'bg-slate-900 border-indigo-500/70'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-300 font-mono">
                      {member.avatarInitials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white font-display">
                          {member.name}
                        </h3>
                        {isCurrentSession && (
                          <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                            · Aktywna sesja
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{member.roleTitle}</p>
                    </div>
                  </div>
                  <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Postęp celów (Listopad 2026)
                    </span>
                    <span className="font-mono tabular-nums font-bold text-white">
                      {avgProgress}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${avgProgress}%` }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectUserAndNavigate(member.id, 'GOALS')}
                  className="w-full min-h-[40px] py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                >
                  Przełącz na: {member.name} i pokaż cele
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};