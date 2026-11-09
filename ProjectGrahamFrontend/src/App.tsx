/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Filter,
  Menu,
  RotateCcw,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  AddJournalCommentRequestDto,
  AppModule,
  CreateDiscoveryRequestDto,
  CreateJournalEntryRequestDto,
  CreateMonthlyGoalRequestDto,
  CreateWorkoutSessionRequestDto,
  GroupFilter,
  HubDatabaseSnapshotDto,
  SubmitMonthAuditRequestDto,
  UpdateGoalProgressRequestDto,
  UserId,
} from './types';
import { hubApi } from './services/api';
import { LandingPageModule } from './components/LandingPageModule';
import { DiscoveriesPortal } from './components/DiscoveriesPortal';
import { MonthlyGoalsModule } from './components/MonthlyGoalsModule';
import { EveningJournalModule } from './components/EveningJournalModule';
import { WorkoutPlannerModule } from './components/WorkoutPlannerModule';
import { hasUnsettledPreviousMonth } from './utils/domainUtils';

const NAV_ITEMS: { key: AppModule; label: string }[] = [
  { key: 'LANDING', label: 'Start' },
  { key: 'DISCOVERIES', label: 'Ciekawostki' },
  { key: 'GOALS', label: 'Cele Miesięczne' },
  { key: 'JOURNAL', label: 'Wieczorny Dziennik' },
  { key: 'WORKOUTS', label: 'Planer Treningowy' },
];

export default function App() {
  const [snapshot, setSnapshot] = useState<HubDatabaseSnapshotDto | null>(null);
  const [activeModule, setActiveModule] = useState<AppModule>('LANDING');
  const [activeUserId, setActiveUserId] = useState<UserId>('user-dymitr');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('ALL');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const loadSnapshot = useCallback(async () => {
    const data = await hubApi.getHubSnapshot();
    setSnapshot(data);
  }, []);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const showTransientNotification = (msg: string) => {
    setStatusBanner(msg);
    window.setTimeout(() => {
      setStatusBanner((prev) => (prev === msg ? null : prev));
    }, 3600);
  };

  const handleAddDiscovery = async (payload: CreateDiscoveryRequestDto) => {
    await hubApi.createDiscovery(payload);
    await loadSnapshot();
    showTransientNotification('Dodano nowe znalezisko na tablicę grupy.');
  };

  const handleToggleDiscoveryUpvote = async (discoveryId: string) => {
    await hubApi.toggleDiscoveryUpvote(discoveryId, activeUserId);
    await loadSnapshot();
  };

  const handleCreateMonthlyGoal = async (
    payload: CreateMonthlyGoalRequestDto
  ) => {
    await hubApi.createMonthlyGoal(payload);
    await loadSnapshot();
    showTransientNotification(`Dodano nowy cel na miesiąc ${payload.monthKey}.`);
  };

  const handleUpdateGoalProgress = async (
    payload: UpdateGoalProgressRequestDto
  ) => {
    await hubApi.updateGoalProgress(payload);
    await loadSnapshot();
  };

  const handleSubmitMonthAudit = async (
    payload: SubmitMonthAuditRequestDto
  ) => {
    await hubApi.submitMonthAudit(payload);
    await loadSnapshot();
    showTransientNotification(
      `Miesiąc ${payload.monthKey} został oficjalnie rozliczony!`
    );
  };

  const handleCreateJournalEntry = async (
    payload: CreateJournalEntryRequestDto
  ) => {
    await hubApi.createJournalEntry(payload);
    await loadSnapshot();
    showTransientNotification('Twój wieczorny wpis został opublikowany na osi czasu.');
  };

  const handleAddJournalComment = async (
    payload: AddJournalCommentRequestDto
  ) => {
    await hubApi.addJournalComment(payload);
    await loadSnapshot();
    showTransientNotification('Dodano komentarz motywacyjny.');
  };

  const handleCreateWorkout = async (
    payload: CreateWorkoutSessionRequestDto
  ) => {
    await hubApi.createWorkoutSession(payload);
    await loadSnapshot();
    showTransientNotification('Zapisano jednostkę treningową w dzienniku grupy.');
  };

  const handleMarkPlannedWorkoutCompleted = async (workoutId: string) => {
    await hubApi.markPlannedWorkoutCompleted(workoutId);
    await loadSnapshot();
    showTransientNotification('Oznaczono zaplanowany trening jako wykonany!');
  };

  const handleResetSeed = async () => {
    await hubApi.resetDemoDatabase();
    await loadSnapshot();
    setIsMobileMenuOpen(false);
    showTransientNotification('Wyczyszczono bazę do stanu początkowego grupy (Dymitr i Franek).');
  };

  const handleSelectUserAndNavigate = (userId: UserId, module: AppModule) => {
    setActiveUserId(userId);
    setActiveModule(module);
    setIsMobileMenuOpen(false);
  };

  const activeUserHasUnsettledOct = useMemo(() => {
    if (!snapshot) return false;
    return hasUnsettledPreviousMonth(
      activeUserId,
      '2026-10',
      snapshot.monthlyGoals,
      snapshot.monthSettlements
    );
  }, [snapshot, activeUserId]);

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6">
        <div className="text-sm font-mono text-slate-400">
          Ładowanie danych Projektu Graham...
        </div>
      </div>
    );
  }

  const activeUser =
    snapshot.users.find((u) => u.id === activeUserId) || snapshot.users[0];

  const activeModuleLabel =
    NAV_ITEMS.find((i) => i.key === activeModule)?.label || 'Start';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 md:gap-8 px-4 sm:px-6 lg:px-8 h-14 md:h-16">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveModule('LANDING');
              setIsMobileMenuOpen(false);
            }}
            className="text-lg font-bold tracking-tight text-white font-display whitespace-nowrap shrink-0"
          >
            Projekt Graham
          </a>

          <nav
            className="hidden md:flex items-center gap-6 lg:gap-7 text-sm font-medium text-slate-400"
            aria-label="Główna nawigacja modułów"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeModule === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveModule(item.key)}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
                    isActive
                      ? 'text-white border-indigo-500 font-semibold'
                      : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {item.label}
                  {item.key === 'GOALS' && activeUserHasUnsettledOct && (
                    <span className="ml-1.5 text-[11px] font-mono text-amber-400">
                      (Audyt!)
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveModule('GOALS');
                setIsMobileMenuOpen(false);
              }}
              className="hidden sm:inline-flex items-center justify-center px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {activeUserHasUnsettledOct
                ? 'Rozlicz Październik'
                : 'Cele Listopad 2026'}
            </button>

            <div className="flex md:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                aria-expanded={isMobileMenuOpen}
                aria-label={
                  isMobileMenuOpen
                    ? 'Zamknij menu nawigacji'
                    : 'Otwórz menu nawigacji'
                }
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
              >
                <span className="text-xs font-semibold text-indigo-300">
                  {activeUser.name} · {activeModuleLabel}
                </span>
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5 text-slate-300" />
                ) : (
                  <Menu className="w-5 h-5 text-slate-300" />
                )}
              </button>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div
            className="md:hidden border-t border-slate-800 bg-slate-950/98 backdrop-blur-xl px-4 pt-4 pb-6 space-y-5 shadow-2xl"
            role="dialog"
            aria-label="Menu mobilne i ustawienia widoku grupy"
          >
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-400 px-1">
                Moduły Projektu Graham
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {NAV_ITEMS.map((item) => {
                  const isActive = activeModule === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setActiveModule(item.key);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-left text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.key === 'GOALS' && activeUserHasUnsettledOct && (
                        <span
                          className={`text-xs font-mono ${
                            isActive ? 'text-amber-200' : 'text-amber-400'
                          }`}
                        >
                          Wymagany audyt (2026-10)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                  Zalogowany jako (Symulacja sesji):
                </span>
                <span className="text-[11px] text-slate-400">
                  {activeUser.roleTitle}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {snapshot.users.map((user) => {
                  const isCurrent = user.id === activeUserId;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setActiveUserId(user.id)}
                      aria-pressed={isCurrent}
                      className={`min-h-[44px] px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-indigo-600 border-indigo-400 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      {user.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-800/80">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 px-1">
                <Filter className="w-3.5 h-3.5 text-emerald-400" />
                Filtr widoku danych grupy:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGroupFilter('ALL');
                    setIsMobileMenuOpen(false);
                  }}
                  aria-pressed={groupFilter === 'ALL'}
                  className={`min-h-[44px] px-3 py-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    groupFilter === 'ALL'
                      ? 'bg-emerald-600 border-emerald-400 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Cała grupa ({snapshot.users.length})
                </button>

                {snapshot.users.map((user) => {
                  const isFiltered = groupFilter === user.id;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setGroupFilter(user.id);
                        setIsMobileMenuOpen(false);
                      }}
                      aria-pressed={isFiltered}
                      className={`min-h-[44px] px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                        isFiltered
                          ? 'bg-emerald-600 border-emerald-400 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      Tylko: {user.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="hidden md:block bg-slate-900/75 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 shrink-0">
              <UserCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Zalogowany jako (Symulacja sesji):</span>
            </div>

            <div
              className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg"
              role="group"
              aria-label="Przełącznik aktualnie zalogowanego użytkownika"
            >
              {snapshot.users.map((user) => {
                const isCurrent = user.id === activeUserId;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setActiveUserId(user.id)}
                    aria-pressed={isCurrent}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isCurrent
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {user.name}
                  </button>
                );
              })}
            </div>

            <span className="text-xs text-slate-400 hidden xl:inline">
              · {activeUser.roleTitle}
            </span>
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 shrink-0">
              <Filter className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Filtr widoku danych:</span>
            </div>

            <div
              className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg overflow-x-auto max-w-full"
              role="group"
              aria-label="Globalny filtr widoku grupy"
            >
              <button
                type="button"
                onClick={() => setGroupFilter('ALL')}
                aria-pressed={groupFilter === 'ALL'}
                className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  groupFilter === 'ALL'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Cała grupa ({snapshot.users.length})</span>
              </button>

              {snapshot.users.map((user) => {
                const isFiltered = groupFilter === user.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setGroupFilter(user.id)}
                    aria-pressed={isFiltered}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isFiltered
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Tylko: {user.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {statusBanner && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
          <div
            role="status"
            className="px-4 py-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs font-semibold text-emerald-200 flex items-center justify-between gap-2"
          >
            <span>{statusBanner}</span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-emerald-400 hover:text-white shrink-0 cursor-pointer"
            >
              Zamknij
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeModule === 'LANDING' && (
          <LandingPageModule
            snapshot={snapshot}
            activeUserId={activeUserId}
            hasUnsettledPreviousMonth={activeUserHasUnsettledOct}
            onNavigateModule={(mod) => setActiveModule(mod)}
            onSelectUserAndNavigate={handleSelectUserAndNavigate}
          />
        )}

        {activeModule === 'DISCOVERIES' && (
          <DiscoveriesPortal
            discoveries={snapshot.discoveries}
            users={snapshot.users}
            activeUserId={activeUserId}
            groupFilter={groupFilter}
            onAddDiscovery={handleAddDiscovery}
            onToggleUpvote={handleToggleDiscoveryUpvote}
          />
        )}

        {activeModule === 'GOALS' && (
          <MonthlyGoalsModule
            goals={snapshot.monthlyGoals}
            settlements={snapshot.monthSettlements}
            users={snapshot.users}
            activeUserId={activeUserId}
            groupFilter={groupFilter}
            onCreateGoal={handleCreateMonthlyGoal}
            onUpdateGoalProgress={handleUpdateGoalProgress}
            onSubmitMonthAudit={handleSubmitMonthAudit}
          />
        )}

        {activeModule === 'JOURNAL' && (
          <EveningJournalModule
            entries={snapshot.journalEntries}
            users={snapshot.users}
            activeUserId={activeUserId}
            groupFilter={groupFilter}
            onCreateEntry={handleCreateJournalEntry}
            onAddComment={handleAddJournalComment}
          />
        )}

        {activeModule === 'WORKOUTS' && (
          <WorkoutPlannerModule
            workouts={snapshot.workouts}
            users={snapshot.users}
            activeUserId={activeUserId}
            groupFilter={groupFilter}
            onCreateWorkout={handleCreateWorkout}
            onMarkPlannedCompleted={handleMarkPlannedWorkoutCompleted}
          />
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center sm:text-left">
          <div>
            Projekt Graham — Social Self-Development &amp; Habit Hub · Wspólna przestrzeń: Dymitr i Franek
          </div>
          <button
            type="button"
            onClick={handleResetSeed}
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Wyczyść dane lokalne grupy
          </button>
        </div>
      </footer>
    </div>
  );
}