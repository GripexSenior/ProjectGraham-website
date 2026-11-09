import React, { useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Dumbbell,
  Flame,
  Plus,
  Timer,
  Trash2,
  X,
} from 'lucide-react';
import {
  CreateWorkoutSessionRequestDto,
  GroupFilter,
  UserDto,
  UserId,
  WorkoutSessionDto,
  WorkoutType,
} from '../types';
import {
  calculateCardioPace,
  calculateGymTotalVolumeKg,
} from '../utils/domainUtils';

interface WorkoutPlannerModuleProps {
  workouts: WorkoutSessionDto[];
  users: UserDto[];
  activeUserId: UserId;
  groupFilter: GroupFilter;
  onCreateWorkout: (payload: CreateWorkoutSessionRequestDto) => Promise<void>;
  onMarkPlannedCompleted: (workoutId: string) => Promise<void>;
}

interface GymRowDraft {
  exerciseName: string;
  sets: number;
  reps: number;
  weightKg: number;
}

export const WorkoutPlannerModule: React.FC<WorkoutPlannerModuleProps> = ({
  workouts,
  users,
  activeUserId,
  groupFilter,
  onCreateWorkout,
  onMarkPlannedCompleted,
}) => {
  const [typeFilter, setTypeFilter] = useState<'ALL' | WorkoutType>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Stan formularza dodawania treningu (dynamiczny wg typu)
  const [workoutType, setWorkoutType] = useState<WorkoutType>('GYM');
  const [workoutDate, setWorkoutDate] = useState('2026-11-08');
  const [title, setTitle] = useState('');
  const [isPlannedOnly, setIsPlannedOnly] = useState(false);

  // Pola dla typu "Siłownia" (GYM)
  const [gymRows, setGymRows] = useState<GymRowDraft[]>([
    { exerciseName: 'Wyciskanie sztangi leżąc', sets: 4, reps: 6, weightKg: 95 },
    { exerciseName: 'Podciąganie na drążku z ciężarem', sets: 4, reps: 6, weightKg: 10 },
  ]);

  // Pola dla typu "Cardio / Bieganie" (CARDIO)
  const [distanceKm, setDistanceKm] = useState<number>(10);
  const [cardioDurationMin, setCardioDurationMin] = useState<number>(48);
  const [customPace, setCustomPace] = useState<string>('');
  const [avgHr, setAvgHr] = useState<number>(156);

  // Pola dla typu "Sporty walki / Basen / Inne" (OTHER)
  const [activityName, setActivityName] = useState('Brazylijskie Jiu-Jitsu (Sparingi)');
  const [otherDurationMin, setOtherDurationMin] = useState<number>(75);
  const [intensityRpe, setIntensityRpe] = useState<number>(8);
  const [detailedNotes, setDetailedNotes] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userMap = useMemo(() => {
    const map: Record<string, UserDto> = {};
    for (const u of users) map[u.id] = u;
    return map;
  }, [users]);

  const filteredWorkouts = useMemo(() => {
    return workouts.filter((w) => {
      const matchesUser = groupFilter === 'ALL' ? true : w.userId === groupFilter;
      const matchesType = typeFilter === 'ALL' ? true : w.workoutType === typeFilter;
      return matchesUser && matchesType;
    });
  }, [workouts, groupFilter, typeFilter]);

  // Statystyki dla aktualnie przefiltrowanych treningów
  const stats = useMemo(() => {
    let totalSessions = 0;
    let totalGymVolumeKg = 0;
    let totalCardioKm = 0;
    let totalOtherMinutes = 0;

    for (const w of filteredWorkouts) {
      if (!w.isPlannedOnly) {
        totalSessions += 1;
      }
      if (w.workoutType === 'GYM' && w.gymExercises) {
        totalGymVolumeKg += calculateGymTotalVolumeKg(w.gymExercises);
      }
      if (w.workoutType === 'CARDIO' && w.cardioMetrics) {
        totalCardioKm += w.cardioMetrics.distanceKm;
      }
      if (w.workoutType === 'OTHER' && w.otherMetrics) {
        totalOtherMinutes += w.otherMetrics.durationMinutes;
      }
    }

    return {
      totalSessions,
      totalGymVolumeKg,
      totalCardioKm: Math.round(totalCardioKm * 10) / 10,
      totalOtherMinutes,
    };
  }, [filteredWorkouts]);

  const autoComputedPace = useMemo(
    () => calculateCardioPace(distanceKm, cardioDurationMin),
    [distanceKm, cardioDurationMin]
  );

  const handleAddGymRow = () => {
    setGymRows((prev) => [
      ...prev,
      { exerciseName: '', sets: 3, reps: 8, weightKg: 60 },
    ]);
  };

  const handleRemoveGymRow = (index: number) => {
    setGymRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGymRowChange = (
    index: number,
    field: keyof GymRowDraft,
    value: string | number
  ) => {
    setGymRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const handleCreateWorkoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Podaj nazwę jednostki treningowej.');
      return;
    }

    if (workoutType === 'GYM') {
      const validRows = gymRows.filter((r) => r.exerciseName.trim().length > 0);
      if (validRows.length === 0) {
        setFormError('Dodaj przynajmniej jedno ćwiczenie siłowe z nazwą.');
        return;
      }
    } else if (workoutType === 'CARDIO') {
      if (distanceKm <= 0 || cardioDurationMin <= 0) {
        setFormError('Dystans i czas trwania cardio muszą być większe od zera.');
        return;
      }
    } else if (workoutType === 'OTHER') {
      if (!activityName.trim() || !detailedNotes.trim()) {
        setFormError('Podaj nazwę aktywności oraz szczegółową notatkę z treningu.');
        return;
      }
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await onCreateWorkout({
        userId: activeUserId,
        workoutDate,
        title: title.trim(),
        workoutType,
        isPlannedOnly,
        gymExercises:
          workoutType === 'GYM'
            ? gymRows.filter((r) => r.exerciseName.trim().length > 0)
            : undefined,
        cardioMetrics:
          workoutType === 'CARDIO'
            ? {
                distanceKm: Number(distanceKm),
                durationMinutes: Number(cardioDurationMin),
                averagePaceMinPerKm: customPace.trim() || autoComputedPace,
                averageHeartRateBpm: avgHr ? Number(avgHr) : undefined,
              }
            : undefined,
        otherMetrics:
          workoutType === 'OTHER'
            ? {
                activityName: activityName.trim(),
                durationMinutes: Number(otherDurationMin),
                intensityRpe: Number(intensityRpe),
                detailedNotes: detailedNotes.trim(),
              }
            : undefined,
      });

      setTitle('');
      setDetailedNotes('');
      setIsPlannedOnly(false);
      setIsAddModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatWorkoutTypeLabel = (t: WorkoutType) => {
    switch (t) {
      case 'GYM':
        return 'Siłownia & Ciężary';
      case 'CARDIO':
        return 'Cardio / Bieganie';
      case 'OTHER':
        return 'Sporty walki / Basen / Inne';
    }
  };

  return (
    <section
      className="space-y-8"
      aria-label="Uniwersalny Planer i Dziennik Treningowy"
    >
      {/* Nagłówek i przycisk otwarcia formularza */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-50 font-display">
            Uniwersalny Planer &amp; Dziennik Treningowy
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Wspólny rejestr sesji siłowych, biegowych, sztuk walki (BJJ) i basenu dla całej grupy
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
          {/* Filtr typu aktywności */}
          <div
            className="grid grid-cols-2 sm:flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl w-full sm:w-auto"
            role="tablist"
            aria-label="Filtr typu treningu"
          >
            {(
              [
                { key: 'ALL', label: 'Wszystkie' },
                { key: 'GYM', label: 'Siłownia' },
                { key: 'CARDIO', label: 'Cardio / Bieganie' },
                { key: 'OTHER', label: 'Walki / Basen / Inne' },
              ] as const
            ).map((tab) => {
              const active = typeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTypeFilter(tab.key)}
                  className={`min-h-[38px] sm:min-h-0 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 text-center cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl sm:rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Dodaj trening lub plan
          </button>
        </div>
      </div>

      {/* Pasek statystyk grupy (Tabular Numerals) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60">
          <span className="text-xs text-slate-400 block">
            Zrealizowane jednostki
          </span>
          <span className="text-2xl font-bold text-white font-mono tabular-nums mt-1 block">
            {stats.totalSessions}
          </span>
          <span className="text-[11px] text-emerald-400 mt-1 block">
            Aktywne sesje w widoku
          </span>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60">
          <span className="text-xs text-slate-400 block">
            Objętość siłowa (Tonaż)
          </span>
          <span className="text-2xl font-bold text-indigo-400 font-mono tabular-nums mt-1 block">
            {stats.totalGymVolumeKg.toLocaleString('pl-PL')} kg
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Suma: serie × powt. × ciężar
          </span>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60">
          <span className="text-xs text-slate-400 block">
            Dystans Cardio / Bieganie
          </span>
          <span className="text-2xl font-bold text-emerald-400 font-mono tabular-nums mt-1 block">
            {stats.totalCardioKm} km
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Wybiegania i biegi progowe
          </span>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60">
          <span className="text-xs text-slate-400 block">
            Mata BJJ / Basen / Inne
          </span>
          <span className="text-2xl font-bold text-amber-400 font-mono tabular-nums mt-1 block">
            {stats.totalOtherMinutes} min
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Łączny czas jednostek specjalnych
          </span>
        </div>
      </div>

      {/* Lista sesji treningowych */}
      {filteredWorkouts.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40">
          <Dumbbell className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-200">
            Brak zapisanych treningów dla wybranego filtra
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Dodaj nową sesję siłową, biegową lub trening na macie/basenie.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredWorkouts.map((workout) => {
            const member = userMap[workout.userId];
            const gymVolume = calculateGymTotalVolumeKg(workout.gymExercises);

            return (
              <article
                key={workout.id}
                className="rounded-2xl border border-slate-800/90 bg-slate-900/65 overflow-hidden"
              >
                {/* Nagłówek karty treningu */}
                <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-300 font-mono">
                      {member?.avatarInitials || 'TR'}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span className="font-semibold text-white">
                          {member?.name || workout.userId}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-indigo-400 font-medium">
                          {formatWorkoutTypeLabel(workout.workoutType)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {workout.workoutDate}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-semibold ${
                            workout.isPlannedOnly
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {workout.isPlannedOnly
                            ? 'Zaplanowany w kalendarzu'
                            : 'Wykonany'}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-100 font-display mt-0.5">
                        {workout.title}
                      </h2>
                    </div>
                  </div>

                  {workout.isPlannedOnly && (
                    <button
                      type="button"
                      onClick={() => onMarkPlannedCompleted(workout.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors self-start sm:self-center cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Oznacz jako wykonany
                    </button>
                  )}
                </div>

                {/* Zawartość zależna od typu treningu */}
                <div className="p-6">
                  {workout.workoutType === 'GYM' && workout.gymExercises && (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-400 pb-1">
                        <span>Zestawienie serii roboczych</span>
                        <span className="font-mono tabular-nums text-indigo-300 font-semibold">
                          Łączny tonaż sesji: {gymVolume.toLocaleString('pl-PL')} kg
                        </span>
                      </div>

                      {/* Widok mobilny: kompaktowe karty ćwiczeń (bez ściskania tabeli) */}
                      <div className="sm:hidden space-y-2">
                        {workout.gymExercises.map((ex) => {
                          const rowVol = ex.sets * ex.reps * ex.weightKg;
                          return (
                            <div
                              key={ex.id}
                              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
                            >
                              <div className="text-xs font-bold text-slate-100">
                                {ex.exerciseName}
                              </div>
                              <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-400">
                                <span>
                                  {ex.sets} serie × {ex.reps} powt.
                                </span>
                                <span className="font-semibold text-emerald-400">
                                  {ex.weightKg} kg
                                </span>
                                <span>{rowVol.toLocaleString('pl-PL')} kg</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Widok desktopowy: pełna tabela */}
                      <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-800">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold text-slate-400">
                              <th className="py-2.5 px-4">Ćwiczenie</th>
                              <th className="py-2.5 px-4 text-right">Serie</th>
                              <th className="py-2.5 px-4 text-right">Powtórzenia</th>
                              <th className="py-2.5 px-4 text-right">Ciężar (kg)</th>
                              <th className="py-2.5 px-4 text-right">Objętość</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm">
                            {workout.gymExercises.map((ex) => {
                              const rowVol = ex.sets * ex.reps * ex.weightKg;
                              return (
                                <tr
                                  key={ex.id}
                                  className="hover:bg-slate-900/50 transition-colors"
                                >
                                  <td className="py-2.5 px-4 font-medium text-slate-100">
                                    {ex.exerciseName}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-300">
                                    {ex.sets}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-300">
                                    {ex.reps}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-400">
                                    {ex.weightKg} kg
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-400">
                                    {rowVol.toLocaleString('pl-PL')} kg
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {workout.workoutType === 'CARDIO' && workout.cardioMetrics && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-xs text-slate-400 block">Dystans</span>
                        <span className="text-xl font-bold text-emerald-400 font-mono tabular-nums mt-0.5 block">
                          {workout.cardioMetrics.distanceKm} km
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-xs text-slate-400 block">
                          Czas trwania
                        </span>
                        <span className="text-xl font-bold text-white font-mono tabular-nums mt-0.5 block">
                          {workout.cardioMetrics.durationMinutes} min
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-xs text-slate-400 block">
                          Średnie tempo
                        </span>
                        <span className="text-xl font-bold text-indigo-400 font-mono tabular-nums mt-0.5 block">
                          {workout.cardioMetrics.averagePaceMinPerKm}
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-xs text-slate-400 block">
                          Średnie tętno
                        </span>
                        <span className="text-xl font-bold text-amber-400 font-mono tabular-nums mt-0.5 block">
                          {workout.cardioMetrics.averageHeartRateBpm
                            ? `${workout.cardioMetrics.averageHeartRateBpm} bpm`
                            : 'Brak danych'}
                        </span>
                      </div>
                    </div>
                  )}

                  {workout.workoutType === 'OTHER' && workout.otherMetrics && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-xs text-slate-400 block">
                            Rodzaj aktywności
                          </span>
                          <span className="text-base font-bold text-white mt-0.5 block">
                            {workout.otherMetrics.activityName}
                          </span>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-xs text-slate-400 block">
                            Czas trwania
                          </span>
                          <span className="text-lg font-bold text-indigo-400 font-mono tabular-nums mt-0.5 block">
                            {workout.otherMetrics.durationMinutes} min
                          </span>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-xs text-slate-400 block">
                            Intensywność (RPE)
                          </span>
                          <span className="text-lg font-bold text-amber-400 font-mono tabular-nums mt-0.5 block">
                            {workout.otherMetrics.intensityRpe}/10
                          </span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1">
                        <span className="text-xs font-semibold text-slate-400 block">
                          Szczegółowa notatka z treningu:
                        </span>
                        <p className="text-sm text-slate-200 leading-relaxed">
                          {workout.otherMetrics.detailedNotes}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* DYNAMICZNY MODAL DODAWANIA TRENINGU */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-workout-modal-title"
        >
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
              <div>
                <h2
                  id="add-workout-modal-title"
                  className="text-lg font-bold text-white font-display"
                >
                  Dodaj trening lub zaplanuj jednostkę
                </h2>
                <p className="text-xs text-slate-400">
                  Zawodnik:{' '}
                  <span className="text-indigo-400 font-semibold">
                    {userMap[activeUserId]?.name}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Zamknij formularz treningu"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateWorkoutSubmit}
              className="p-6 space-y-5 overflow-y-auto flex-1"
            >
              {formError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
                  {formError}
                </div>
              )}

              {/* Przełącznik typu aktywności (zmienia dynamicznie pola formularza) */}
              <div>
                <span className="block text-xs font-semibold text-slate-300 mb-2">
                  Wybierz typ treningu *
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(
                    [
                      {
                        type: 'GYM',
                        label: 'Siłownia',
                        sub: 'Ćwiczenia, serie, ciężar',
                        icon: Dumbbell,
                      },
                      {
                        type: 'CARDIO',
                        label: 'Cardio / Bieganie',
                        sub: 'Dystans, czas, tempo, HR',
                        icon: Timer,
                      },
                      {
                        type: 'OTHER',
                        label: 'Sporty walki / Basen / Inne',
                        sub: 'Czas, RPE 1-10, notatka',
                        icon: Flame,
                      },
                    ] as const
                  ).map((item) => {
                    const Icon = item.icon;
                    const active = workoutType === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setWorkoutType(item.type)}
                        className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-indigo-950/80 border-indigo-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <Icon className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span>{item.label}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {item.sub}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="workout-title-input"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Tytuł treningu *
                  </label>
                  <input
                    id="workout-title-input"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      workoutType === 'GYM'
                        ? 'np. Siła Góra B — Wyciskanie skos + Podciąganie'
                        : workoutType === 'CARDIO'
                        ? 'np. Wybieganie tlenowe 12 km w Strefie 2'
                        : 'np. BJJ Gi — Zadaniówki z gardy zamkniętej'
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="workout-date-input"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Data sesji
                  </label>
                  <input
                    id="workout-date-input"
                    type="date"
                    value={workoutDate}
                    onChange={(e) => setWorkoutDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* DYNAMICZNA SEKCJA 1: SIŁOWNIA (GYM) */}
              {workoutType === 'GYM' && (
                <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-400">
                      Lista ćwiczeń siłowych (Nazwa, Serie, Powtórzenia, Ciężar kg)
                    </span>
                    <button
                      type="button"
                      onClick={handleAddGymRow}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Dodaj ćwiczenie
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {gymRows.map((row, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-12 gap-2 items-center"
                      >
                        <div className="col-span-12 sm:col-span-5">
                          <label
                            htmlFor={`gym-name-${index}`}
                            className="sr-only"
                          >
                            Nazwa ćwiczenia {index + 1}
                          </label>
                          <input
                            id={`gym-name-${index}`}
                            type="text"
                            value={row.exerciseName}
                            onChange={(e) =>
                              handleGymRowChange(
                                index,
                                'exerciseName',
                                e.target.value
                              )
                            }
                            placeholder="Nazwa ćwiczenia (np. Przysiad)"
                            className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                          <label
                            htmlFor={`gym-sets-${index}`}
                            className="block text-[10px] text-slate-400 mb-0.5 sm:hidden"
                          >
                            Serie
                          </label>
                          <input
                            id={`gym-sets-${index}`}
                            type="number"
                            min={1}
                            max={20}
                            value={row.sets}
                            onChange={(e) =>
                              handleGymRowChange(
                                index,
                                'sets',
                                Number(e.target.value)
                              )
                            }
                            aria-label={`Liczba serii dla ćwiczenia ${index + 1}`}
                            className="w-full px-2.5 py-2 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-100 text-center"
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                          <label
                            htmlFor={`gym-reps-${index}`}
                            className="block text-[10px] text-slate-400 mb-0.5 sm:hidden"
                          >
                            Powt.
                          </label>
                          <input
                            id={`gym-reps-${index}`}
                            type="number"
                            min={1}
                            max={100}
                            value={row.reps}
                            onChange={(e) =>
                              handleGymRowChange(
                                index,
                                'reps',
                                Number(e.target.value)
                              )
                            }
                            aria-label={`Liczba powtórzeń dla ćwiczenia ${index + 1}`}
                            className="w-full px-2.5 py-2 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-100 text-center"
                          />
                        </div>
                        <div className="col-span-3 sm:col-span-2">
                          <label
                            htmlFor={`gym-weight-${index}`}
                            className="block text-[10px] text-slate-400 mb-0.5 sm:hidden"
                          >
                            Ciężar kg
                          </label>
                          <input
                            id={`gym-weight-${index}`}
                            type="number"
                            min={0}
                            step="0.5"
                            value={row.weightKg}
                            onChange={(e) =>
                              handleGymRowChange(
                                index,
                                'weightKg',
                                Number(e.target.value)
                              )
                            }
                            aria-label={`Ciężar w kg dla ćwiczenia ${index + 1}`}
                            className="w-full px-2.5 py-2 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-emerald-400 text-center font-semibold"
                          />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          {gymRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveGymRow(index)}
                              aria-label={`Usuń ćwiczenie ${index + 1}`}
                              className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DYNAMICZNA SEKCJA 2: CARDIO / BIEGANIE */}
              {workoutType === 'CARDIO' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <label
                      htmlFor="cardio-distance-input"
                      className="block text-xs font-semibold text-slate-300 mb-1.5"
                    >
                      Dystans (km) *
                    </label>
                    <input
                      id="cardio-distance-input"
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={distanceKm}
                      onChange={(e) => setDistanceKm(Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-sm font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="cardio-duration-input"
                      className="block text-xs font-semibold text-slate-300 mb-1.5"
                    >
                      Czas trwania (min) *
                    </label>
                    <input
                      id="cardio-duration-input"
                      type="number"
                      min="1"
                      required
                      value={cardioDurationMin}
                      onChange={(e) =>
                        setCardioDurationMin(Number(e.target.value))
                      }
                      className="w-full px-3.5 py-2 text-sm font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="cardio-pace-input"
                      className="block text-xs font-semibold text-slate-300 mb-1.5"
                    >
                      Średnie tempo (auto: {autoComputedPace})
                    </label>
                    <input
                      id="cardio-pace-input"
                      type="text"
                      value={customPace}
                      onChange={(e) => setCustomPace(e.target.value)}
                      placeholder={autoComputedPace}
                      className="w-full px-3.5 py-2 text-sm font-mono bg-slate-900 border border-slate-800 rounded-lg text-indigo-300"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="cardio-hr-input"
                      className="block text-xs font-semibold text-slate-300 mb-1.5"
                    >
                      Średnie tętno (bpm)
                    </label>
                    <input
                      id="cardio-hr-input"
                      type="number"
                      min="60"
                      max="220"
                      value={avgHr}
                      onChange={(e) => setAvgHr(Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-sm font-mono bg-slate-900 border border-slate-800 rounded-lg text-amber-400"
                    />
                  </div>
                </div>
              )}

              {/* DYNAMICZNA SEKCJA 3: SPORTY WALKI / BASEN / INNE */}
              {workoutType === 'OTHER' && (
                <div className="space-y-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="other-activity-input"
                        className="block text-xs font-semibold text-slate-300 mb-1.5"
                      >
                        Nazwa aktywności *
                      </label>
                      <input
                        id="other-activity-input"
                        type="text"
                        required
                        value={activityName}
                        onChange={(e) => setActivityName(e.target.value)}
                        placeholder="np. BJJ No-Gi, Basen kraul, Boks"
                        className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="other-duration-input"
                        className="block text-xs font-semibold text-slate-300 mb-1.5"
                      >
                        Czas trwania (min) *
                      </label>
                      <input
                        id="other-duration-input"
                        type="number"
                        min="5"
                        required
                        value={otherDurationMin}
                        onChange={(e) =>
                          setOtherDurationMin(Number(e.target.value))
                        }
                        className="w-full px-3.5 py-2 text-sm font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <label
                        htmlFor="other-intensity-slider"
                        className="font-semibold text-slate-300"
                      >
                        Intensywność wysiłku (RPE 1-10)
                      </label>
                      <span className="font-mono tabular-nums font-bold text-amber-400">
                        {intensityRpe}/10
                      </span>
                    </div>
                    <input
                      id="other-intensity-slider"
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={intensityRpe}
                      onChange={(e) => setIntensityRpe(Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="other-notes-input"
                      className="block text-xs font-semibold text-slate-300 mb-1.5"
                    >
                      Szczegółowa notatka z treningu *
                    </label>
                    <textarea
                      id="other-notes-input"
                      rows={3}
                      required
                      value={detailedNotes}
                      onChange={(e) => setDetailedNotes(e.target.value)}
                      placeholder="Opisz przebieg rund, technikę, odczucia tlenowe lub przepływane odcinki..."
                      className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500"
                    />
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPlannedOnly}
                  onChange={(e) => setIsPlannedOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600"
                />
                <span className="text-xs text-slate-300">
                  Zapisz jako plan treningowy na przyszłość (do odhaczenia po wykonaniu)
                </span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer"
                >
                  <Activity className="w-4 h-4" />
                  {isSubmitting ? 'Zapisywanie...' : 'Zapisz trening w bazie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
