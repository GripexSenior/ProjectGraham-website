import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Plus,
  Target,
  X,
} from 'lucide-react';
import {
  CreateMonthlyGoalRequestDto,
  GoalAuditEntryDto,
  GoalAuditStatus,
  GoalDomain,
  GroupFilter,
  MonthlyGoalDto,
  MonthSettlementStatusDto,
  SubmitMonthAuditRequestDto,
  UpdateGoalProgressRequestDto,
  UserDto,
  UserId,
} from '../types';
import {
  formatMonthLabel,
  getPreviousMonthKey,
  hasUnsettledPreviousMonth,
} from '../utils/domainUtils';

interface MonthlyGoalsModuleProps {
  goals: MonthlyGoalDto[];
  settlements: MonthSettlementStatusDto[];
  users: UserDto[];
  activeUserId: UserId;
  groupFilter: GroupFilter;
  onCreateGoal: (payload: CreateMonthlyGoalRequestDto) => Promise<void>;
  onUpdateGoalProgress: (payload: UpdateGoalProgressRequestDto) => Promise<void>;
  onSubmitMonthAudit: (payload: SubmitMonthAuditRequestDto) => Promise<void>;
}

const AVAILABLE_MONTHS = ['2026-11', '2026-10'];
const DOMAINS: GoalDomain[] = [
  'Sylwetka i Zdrowie',
  'Kariera i Finanse',
  'Umysł i Nawyk',
  'Relacje i Projekt',
];

export const MonthlyGoalsModule: React.FC<MonthlyGoalsModuleProps> = ({
  goals,
  settlements,
  users,
  activeUserId,
  groupFilter,
  onCreateGoal,
  onUpdateGoalProgress,
  onSubmitMonthAudit,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-11');
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Nowy cel — stan formularza
  const [newTitle, setNewTitle] = useState('');
  const [newDomain, setNewDomain] = useState<GoalDomain>('Sylwetka i Zdrowie');
  const [newTargetDesc, setNewTargetDesc] = useState('');
  const [newInitialProgress, setNewInitialProgress] = useState(0);
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  // Stan formularza kontrolnego (Audit Modal)
  const currentMonthRef = '2026-11';
  const previousMonthKey = getPreviousMonthKey(currentMonthRef); // '2026-10'

  const userMap = useMemo(() => {
    const map: Record<string, UserDto> = {};
    for (const u of users) map[u.id] = u;
    return map;
  }, [users]);

  const activeUserNeedsAudit = useMemo(
    () =>
      hasUnsettledPreviousMonth(
        activeUserId,
        previousMonthKey,
        goals,
        settlements
      ),
    [activeUserId, previousMonthKey, goals, settlements]
  );

  const activeUserPreviousGoals = useMemo(
    () =>
      goals.filter(
        (g) => g.userId === activeUserId && g.monthKey === previousMonthKey
      ),
    [goals, activeUserId, previousMonthKey]
  );

  const [auditDrafts, setAuditDrafts] = useState<
    Record<
      string,
      {
        auditStatus: Exclude<GoalAuditStatus, 'Pending'>;
        finalPercentage: number;
        auditConclusion: string;
      }
    >
  >({});
  const [auditError, setAuditError] = useState<string | null>(null);
  const [isSubmittingAudit, setIsSubmittingAudit] = useState(false);

  const openAuditModal = () => {
    const initialDrafts: Record<
      string,
      {
        auditStatus: Exclude<GoalAuditStatus, 'Pending'>;
        finalPercentage: number;
        auditConclusion: string;
      }
    > = {};

    for (const g of activeUserPreviousGoals) {
      const roundedPct = Math.round(g.progressPercentage / 5) * 5;
      initialDrafts[g.id] = {
        auditStatus:
          g.auditStatus === 'Pending'
            ? g.progressPercentage >= 85
              ? 'Completed'
              : g.progressPercentage >= 40
              ? 'PartiallyCompleted'
              : 'Failed'
            : g.auditStatus,
        finalPercentage: roundedPct,
        auditConclusion: g.auditConclusion || '',
      };
    }

    setAuditDrafts(initialDrafts);
    setAuditError(null);
    setIsAuditModalOpen(true);
  };

  const handleAuditDraftChange = (
    goalId: string,
    field: 'auditStatus' | 'finalPercentage' | 'auditConclusion',
    value: string | number
  ) => {
    setAuditDrafts((prev) => {
      const current = prev[goalId] || {
        auditStatus: 'Completed',
        finalPercentage: 100,
        auditConclusion: '',
      };
      return {
        ...prev,
        [goalId]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const entries: GoalAuditEntryDto[] = [];

    for (const g of activeUserPreviousGoals) {
      const draft = auditDrafts[g.id];
      if (!draft || !draft.auditConclusion.trim()) {
        setAuditError(
          `Wpisz obowiązkowe podsumowanie i wnioski dla celu: "${g.title}".`
        );
        return;
      }
      entries.push({
        goalId: g.id,
        auditStatus: draft.auditStatus,
        finalPercentage: draft.finalPercentage,
        auditConclusion: draft.auditConclusion.trim(),
      });
    }

    setAuditError(null);
    setIsSubmittingAudit(true);
    try {
      await onSubmitMonthAudit({
        userId: activeUserId,
        monthKey: previousMonthKey,
        entries,
      });
      setIsAuditModalOpen(false);
      setSelectedMonth(previousMonthKey);
    } finally {
      setIsSubmittingAudit(false);
    }
  };

  const handleCreateGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setAddFormError('Podaj nazwę celu miesięcznego.');
      return;
    }
    if (!newTargetDesc.trim()) {
      setAddFormError('Podaj mierzalny wskaźnik wykonania (KPI).');
      return;
    }

    setAddFormError(null);
    setIsSavingGoal(true);
    try {
      await onCreateGoal({
        userId: activeUserId,
        monthKey: selectedMonth,
        title: newTitle.trim(),
        domain: newDomain,
        targetMetricDescription: newTargetDesc.trim(),
        initialProgressPercentage: newInitialProgress,
      });
      setNewTitle('');
      setNewTargetDesc('');
      setNewInitialProgress(0);
      setIsAddGoalModalOpen(false);
    } finally {
      setIsSavingGoal(false);
    }
  };

  const displayedUsers = useMemo(() => {
    if (groupFilter === 'ALL') return users;
    return users.filter((u) => u.id === groupFilter);
  }, [users, groupFilter]);

  const formatAuditStatusLabel = (status: GoalAuditStatus) => {
    switch (status) {
      case 'Completed':
        return { text: 'Zrealizowany', colorClass: 'text-emerald-400' };
      case 'PartiallyCompleted':
        return { text: 'Częściowo zrealizowany', colorClass: 'text-amber-400' };
      case 'Failed':
        return { text: 'Niezrealizowany', colorClass: 'text-rose-400' };
      default:
        return { text: 'W trakcie realizacji', colorClass: 'text-indigo-400' };
    }
  };

  const activeUserSettlementForPrevMonth = useMemo(
    () =>
      settlements.find(
        (s) => s.userId === activeUserId && s.monthKey === previousMonthKey
      ),
    [settlements, activeUserId, previousMonthKey]
  );

  return (
    <section className="space-y-8" aria-label="Moduł Celów Miesięcznych">
      {/* KLUCZOWA FUNKCJA: BANER OSTRZEGAWCZY NIEROZLICZONEGO POPRZEDNIEGO MIESIĄCA */}
      {activeUserNeedsAudit ? (
        <div
          role="region"
          aria-label="Powiadomienie o nierozliczonym miesiącu"
          className="p-5 sm:p-6 rounded-2xl bg-amber-950/35 border border-amber-500/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-300">
                <span>Wymagany Audyt Miesięczny</span>
                <span aria-hidden="true">·</span>
                <span>Użytkownik: {userMap[activeUserId]?.name}</span>
                <span aria-hidden="true">·</span>
                <span>Okres: {formatMonthLabel(previousMonthKey)}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white font-display">
                Masz nierozliczony poprzedni miesiąc! ({previousMonthKey})
              </h2>
              <p className="text-sm text-slate-300 max-w-2xl">
                Zgodnie z zasadami naszej grupy, przed pełnym wejściem w kolejny miesiąc musisz ocenić swoje{' '}
                <span className="font-mono font-semibold text-white">
                  {activeUserPreviousGoals.length}
                </span>{' '}
                cele z października, określić końcowy procent realizacji i zapisać wnioski.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAuditModal}
            className="w-full lg:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ClipboardCheck className="w-4 h-4" />
            Wypełnij Formularz Kontrolny
          </button>
        </div>
      ) : (
        <div className="p-4 sm:px-6 rounded-xl bg-emerald-950/25 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-xs sm:text-sm text-slate-200">
              <span className="font-semibold text-emerald-400">
                Poprzedni miesiąc ({formatMonthLabel(previousMonthKey)}) — Rozliczony!
              </span>{' '}
              Wszystkie cele użytkownika{' '}
              <span className="font-semibold text-white">
                {userMap[activeUserId]?.name}
              </span>{' '}
              posiadają zapisane podsumowanie kontrolne.
            </div>
          </div>
          {activeUserSettlementForPrevMonth?.settledAt && (
            <button
              type="button"
              onClick={() => setSelectedMonth(previousMonthKey)}
              className="text-xs font-semibold text-emerald-300 hover:text-emerald-200 underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Zobacz raport z października
            </button>
          )}
        </div>
      )}

      {/* Nagłówek i wybór miesiąca */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-50 font-display">
            Cele Miesięczne &amp; Egzekucja
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Transparentne postępy wszystkich członków grupy wraz z historią rozliczeń
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
          {/* Przełącznik miesiąca */}
          <div
            className="grid grid-cols-2 sm:flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl"
            role="tablist"
            aria-label="Wybór miesiąca celów"
          >
            {AVAILABLE_MONTHS.map((mKey) => {
              const active = selectedMonth === mKey;
              return (
                <button
                  key={mKey}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedMonth(mKey)}
                  className={`min-h-[38px] sm:min-h-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {formatMonthLabel(mKey)}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsAddGoalModalOpen(true)}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl sm:rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Dodaj cel na {selectedMonth}
          </button>
        </div>
      </div>

      {/* Lista celów pogrupowana po członkach grupy */}
      <div className="space-y-8">
        {displayedUsers.map((member) => {
          const memberGoals = goals.filter(
            (g) => g.userId === member.id && g.monthKey === selectedMonth
          );
          const memberSettlement = settlements.find(
            (s) => s.userId === member.id && s.monthKey === selectedMonth
          );
          const isSettledMonth = Boolean(memberSettlement?.isSettled);
          const avgProgress =
            memberGoals.length > 0
              ? Math.round(
                  memberGoals.reduce((acc, g) => acc + g.progressPercentage, 0) /
                    memberGoals.length
                )
              : 0;

          return (
            <div
              key={member.id}
              className="rounded-2xl border border-slate-800/90 bg-slate-900/60 overflow-hidden"
            >
              {/* Pasek użytkownika */}
              <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-300 font-mono">
                    {member.avatarInitials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white font-display">
                        {member.name}
                      </h2>
                      <span className="text-xs text-slate-400">
                        · {member.roleTitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>Miesiąc: {selectedMonth}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Status miesiąca:{' '}
                        <strong
                          className={
                            isSettledMonth
                              ? 'text-emerald-400'
                              : selectedMonth === '2026-10'
                              ? 'text-amber-400'
                              : 'text-indigo-400'
                          }
                        >
                          {isSettledMonth
                            ? 'Rozliczony'
                            : selectedMonth === '2026-10'
                            ? 'Nierozliczony (wymaga audytu)'
                            : 'W trakcie realizacji'}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">
                      Średni postęp ({memberGoals.length} celów)
                    </span>
                    <span className="text-lg font-bold text-white font-mono tabular-nums">
                      {avgProgress}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Karty poszczególnych celów użytkownika */}
              {memberGoals.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  Brak zdefiniowanych celów dla użytkownika {member.name} na miesiąc{' '}
                  {selectedMonth}.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/70">
                  {memberGoals.map((goal) => {
                    const statusMeta = formatAuditStatusLabel(goal.auditStatus);
                    const canQuickAdjust = member.id === activeUserId && !isSettledMonth;

                    return (
                      <div
                        key={goal.id}
                        className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-slate-900/40 transition-colors"
                      >
                        <div className="space-y-2 max-w-3xl">
                          {/* Quiet metadata line */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span className="text-slate-300 font-medium">
                              {goal.domain}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className={`font-semibold ${statusMeta.colorClass}`}>
                              {statusMeta.text}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>Cel KPI: {goal.targetMetricDescription}</span>
                          </div>

                          <h3 className="text-base sm:text-lg font-bold text-slate-100 font-display">
                            {goal.title}
                          </h3>

                          {goal.auditConclusion && (
                            <div className="mt-3 p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-slate-300 space-y-1">
                              <div className="font-semibold text-emerald-400">
                                Wnioski z Formularza Kontrolnego:
                              </div>
                              <p className="leading-relaxed">{goal.auditConclusion}</p>
                            </div>
                          )}
                        </div>

                        {/* Pasek postępu + suwak aktualizacji */}
                        <div className="w-full lg:w-72 shrink-0 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Stopień realizacji</span>
                            <span className="font-mono tabular-nums font-bold text-white text-sm">
                              {goal.progressPercentage}%
                            </span>
                          </div>

                          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className={`h-full transition-all duration-300 ${
                                goal.progressPercentage >= 90
                                  ? 'bg-emerald-500'
                                  : goal.progressPercentage >= 50
                                  ? 'bg-indigo-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${goal.progressPercentage}%` }}
                            />
                          </div>

                          {canQuickAdjust && (
                            <div className="pt-1 flex items-center gap-2">
                              <label
                                htmlFor={`slider-${goal.id}`}
                                className="text-[11px] text-slate-400 whitespace-nowrap"
                              >
                                Aktualizuj %:
                              </label>
                              <input
                                id={`slider-${goal.id}`}
                                type="range"
                                min={0}
                                max={100}
                                step={5}
                                value={goal.progressPercentage}
                                onChange={(e) =>
                                  onUpdateGoalProgress({
                                    goalId: goal.id,
                                    progressPercentage: Number(e.target.value),
                                  })
                                }
                                className="w-full accent-indigo-500 cursor-pointer"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL DODAWANIA NOWEGO CELU MIESIĘCZNEGO */}
      {isAddGoalModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-goal-modal-title"
        >
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div>
                <h2
                  id="add-goal-modal-title"
                  className="text-lg font-bold text-white font-display"
                >
                  Nowy cel miesięczny ({selectedMonth})
                </h2>
                <p className="text-xs text-slate-400">
                  Przypisany do:{' '}
                  <span className="text-indigo-400 font-semibold">
                    {userMap[activeUserId]?.name}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddGoalModalOpen(false)}
                aria-label="Zamknij modal dodawania celu"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoalSubmit} className="p-6 space-y-4">
              {addFormError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
                  {addFormError}
                </div>
              )}

              <div>
                <label
                  htmlFor="goal-title-input"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Treść celu miesięcznego *
                </label>
                <input
                  id="goal-title-input"
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="np. Przebiec 120 km w listopadzie poniżej tempa 5:00/km"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="goal-domain-select"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Obszar rozwoju
                </label>
                <select
                  id="goal-domain-select"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value as GoalDomain)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  {DOMAINS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="goal-kpi-input"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Mierzalny warunek ukończenia (KPI) *
                </label>
                <input
                  id="goal-kpi-input"
                  type="text"
                  required
                  value={newTargetDesc}
                  onChange={(e) => setNewTargetDesc(e.target.value)}
                  placeholder="np. 12 zarejestrowanych treningów w aplikacji Garmin / Projekt Graham"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label
                    htmlFor="goal-initial-progress"
                    className="font-semibold text-slate-300"
                  >
                    Początkowy postęp (%)
                  </label>
                  <span className="font-mono tabular-nums font-bold text-indigo-400">
                    {newInitialProgress}%
                  </span>
                </div>
                <input
                  id="goal-initial-progress"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={newInitialProgress}
                  onChange={(e) => setNewInitialProgress(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddGoalModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSavingGoal}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer"
                >
                  <Target className="w-4 h-4" />
                  {isSavingGoal ? 'Zapisywanie...' : 'Dodaj cel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FORMULARZA KONTROLNEGO (ROZLICZENIE POPRZEDNIEGO MIESIĄCA) */}
      {isAuditModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-modal-title"
        >
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
              <div>
                <div className="text-xs font-semibold text-amber-400">
                  Obowiązkowa procedura zamknięcia miesiąca · {formatMonthLabel(previousMonthKey)}
                </div>
                <h2
                  id="audit-modal-title"
                  className="text-lg sm:text-xl font-bold text-white font-display mt-0.5"
                >
                  Formularz Kontrolny Celów ({previousMonthKey}) — {userMap[activeUserId]?.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                aria-label="Zamknij formularz kontrolny"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleAuditSubmit}
              className="p-6 space-y-6 overflow-y-auto flex-1"
            >
              {auditError && (
                <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-xs font-medium text-rose-200">
                  {auditError}
                </div>
              )}

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Oceń uczciwie każdy ze swoich celów z poprzedniego miesiąca. Wybierz status końcowy, ustaw suwakiem ostateczny procent dowiezienia wyniku i zapisz wnioski dla grupy.
              </p>

              <div className="space-y-6">
                {activeUserPreviousGoals.map((goal, index) => {
                  const draft = auditDrafts[goal.id] || {
                    auditStatus: 'Completed',
                    finalPercentage: goal.progressPercentage,
                    auditConclusion: '',
                  };

                  return (
                    <div
                      key={goal.id}
                      className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4"
                    >
                      <div className="space-y-1">
                        <div className="text-xs text-slate-400 font-medium">
                          Cel {index + 1} z {activeUserPreviousGoals.length} · {goal.domain}
                        </div>
                        <h3 className="text-base font-bold text-white font-display">
                          {goal.title}
                        </h3>
                        <p className="text-xs text-slate-400">
                          Założone KPI: {goal.targetMetricDescription}
                        </p>
                      </div>

                      {/* Wybór statusu: Zrealizowany / Częściowo / Niezrealizowany */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-2">
                          Status realizacji celu *
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {(
                            [
                              {
                                value: 'Completed',
                                label: 'Zrealizowany',
                                activeStyle:
                                  'bg-emerald-950/90 border-emerald-500 text-emerald-300',
                              },
                              {
                                value: 'PartiallyCompleted',
                                label: 'Częściowo',
                                activeStyle:
                                  'bg-amber-950/90 border-amber-500 text-amber-300',
                              },
                              {
                                value: 'Failed',
                                label: 'Niezrealizowany',
                                activeStyle:
                                  'bg-rose-950/90 border-rose-500 text-rose-300',
                              },
                            ] as const
                          ).map((option) => {
                            const isSelected = draft.auditStatus === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() =>
                                  handleAuditDraftChange(
                                    goal.id,
                                    'auditStatus',
                                    option.value
                                  )
                                }
                                className={`py-2.5 px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                                  isSelected
                                    ? option.activeStyle
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Suwak procentu realizacji */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <label
                            htmlFor={`audit-slider-${goal.id}`}
                            className="font-semibold text-slate-300"
                          >
                            Końcowy wynik realizacji (%)
                          </label>
                          <span className="font-mono tabular-nums font-bold text-sm text-indigo-400">
                            {draft.finalPercentage}%
                          </span>
                        </div>
                        <input
                          id={`audit-slider-${goal.id}`}
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={draft.finalPercentage}
                          onChange={(e) =>
                            handleAuditDraftChange(
                              goal.id,
                              'finalPercentage',
                              Number(e.target.value)
                            )
                          }
                          className="w-full accent-indigo-500 cursor-pointer"
                        />
                      </div>

                      {/* Obowiązkowe podsumowanie / wnioski */}
                      <div>
                        <label
                          htmlFor={`audit-notes-${goal.id}`}
                          className="block text-xs font-semibold text-slate-300 mb-1.5"
                        >
                          Obowiązkowe podsumowanie i wnioski na kolejny miesiąc *
                        </label>
                        <textarea
                          id={`audit-notes-${goal.id}`}
                          rows={2}
                          required
                          value={draft.auditConclusion}
                          onChange={(e) =>
                            handleAuditDraftChange(
                              goal.id,
                              'auditConclusion',
                              e.target.value
                            )
                          }
                          placeholder="Co zadziałało dobrze? Co przeszkodziło w 100% dowiezieniu wyniku?"
                          className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="sticky -bottom-6 bg-slate-900/95 backdrop-blur-xs flex items-center justify-end gap-3 pt-4 pb-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAuditModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAudit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmittingAudit
                    ? 'Zapisywanie audytu...'
                    : 'Zatwierdź i rozlicz miesiąc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
