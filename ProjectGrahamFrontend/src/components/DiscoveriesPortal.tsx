import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BookmarkPlus,
  ExternalLink,
  Flame,
  Play,
  Plus,
  Sparkles,
  ThumbsUp,
  Video,
  X,
} from 'lucide-react';
import {
  CreateDiscoveryRequestDto,
  DiscoveryCategory,
  DiscoveryItemDto,
  GroupFilter,
  UserDto,
  UserId,
} from '../types';
import {
  extractYouTubeVideoId,
  getYouTubeThumbnailUrl,
} from '../utils/domainUtils';

interface DiscoveriesPortalProps {
  discoveries: DiscoveryItemDto[];
  users: UserDto[];
  activeUserId: UserId;
  groupFilter: GroupFilter;
  onAddDiscovery: (payload: CreateDiscoveryRequestDto) => Promise<void>;
  onToggleUpvote: (discoveryId: string) => Promise<void>;
}

const CATEGORIES: ('Wszystkie' | DiscoveryCategory)[] = [
  'Wszystkie',
  'YouTube',
  'Artykuły',
  'Ciekawostki',
  'Rozwój',
];

export const DiscoveriesPortal: React.FC<DiscoveriesPortalProps> = ({
  discoveries,
  users,
  activeUserId,
  groupFilter,
  onAddDiscovery,
  onToggleUpvote,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'Wszystkie' | DiscoveryCategory>('Wszystkie');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeVideoModal, setActiveVideoModal] = useState<{
    videoId: string;
    title: string;
    authorName: string;
    summary: string;
  } | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Formularz "Dodaj znalezisko"
  const [formUrl, setFormUrl] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formCategory, setFormCategory] = useState<DiscoveryCategory>('Artykuły');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formSetHero, setFormSetHero] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const detectedYoutubeId = useMemo(() => extractYouTubeVideoId(formUrl), [formUrl]);

  const userMap = useMemo(() => {
    const map: Record<string, UserDto> = {};
    for (const u of users) {
      map[u.id] = u;
    }
    return map;
  }, [users]);

  const filteredDiscoveries = useMemo(() => {
    return discoveries.filter((item) => {
      const matchesUser = groupFilter === 'ALL' ? true : item.authorId === groupFilter;
      const matchesCat =
        selectedCategory === 'Wszystkie' ? true : item.category === selectedCategory;
      return matchesUser && matchesCat;
    });
  }, [discoveries, groupFilter, selectedCategory]);

  const heroItem = useMemo(() => {
    if (filteredDiscoveries.length === 0) return null;
    return (
      filteredDiscoveries.find((d) => d.isFeaturedHero) || filteredDiscoveries[0]
    );
  }, [filteredDiscoveries]);

  const bentoGridItems = useMemo(() => {
    if (!heroItem) return [];
    return filteredDiscoveries.filter((d) => d.id !== heroItem.id);
  }, [filteredDiscoveries, heroItem]);

  const handleUrlChange = (val: string) => {
    setFormUrl(val);
    const ytId = extractYouTubeVideoId(val);
    if (ytId) {
      setFormCategory('YouTube');
    }
  };

  const handleSubmitDiscovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Podaj tytuł znaleziska lub materiału.');
      return;
    }
    if (!formSummary.trim()) {
      setFormError('Dodaj krótką notatkę lub opis ciekawostki dla grupy.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await onAddDiscovery({
        authorId: activeUserId,
        title: formTitle.trim(),
        summary: formSummary.trim(),
        category: detectedYoutubeId ? 'YouTube' : formCategory,
        url: formUrl.trim() || undefined,
        imageUrl: formImageUrl.trim() || undefined,
        setAsFeaturedHero: formSetHero,
      });

      setFormUrl('');
      setFormTitle('');
      setFormSummary('');
      setFormImageUrl('');
      setFormSetHero(false);
      setIsAddModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateShort = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <section className="space-y-8" aria-label="Dashboard Ciekawostek i Znalezisk">
      {/* Pasek nagłówkowy sekcji + filtr kategorii + CTA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-50 font-display">
            Redakcja Ciekawostek &amp; Baza Wiedzy
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Wspólny feed linków, wykładów YouTube, artykułów i wniosków rozwojowych naszej grupy
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
          {/* Segmented Control kategorii */}
          <div
            className="grid grid-cols-5 sm:flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl w-full sm:w-auto"
            role="tablist"
            aria-label="Filtr kategorii znalezisk"
          >
            {CATEGORIES.map((category) => {
              const active = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedCategory(category)}
                  className={`min-h-[38px] sm:min-h-0 px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 text-center cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl sm:rounded-lg transition-colors shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Dodaj znalezisko
          </button>
        </div>
      </div>

      {/* Stan pusty */}
      {!heroItem ? (
        <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-xl">
          <BookmarkPlus className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-200">
            Brak znalezisk spełniających wybrane kryteria
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Wrzuć ciekawy film z YouTube, artykuł techniczny lub własną notatkę, aby zbudować wspólną tablicę inspiracji.
          </p>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Dodaj pierwsze znalezisko
          </button>
        </div>
      ) : (
        <>
          {/* GŁÓWNE ZNALEZISKO DNIA (Bento Hero Portal Style) */}
          <article className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 min-h-[380px] lg:min-h-[430px] flex flex-col justify-end group">
            {/* Zdjęcie tła lub fallback */}
            {heroItem.thumbnailUrl && !brokenImages[heroItem.id] ? (
              <img
                src={heroItem.thumbnailUrl}
                alt={heroItem.title}
                referrerPolicy="no-referrer"
                onError={() =>
                  setBrokenImages((prev) => ({ ...prev, [heroItem.id]: true }))
                }
                className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950" />
            )}

            {/* Ciemny kontrastowy gradient redakcyjny (Measured Scrim) */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/20" />

            <div className="relative z-10 p-5 sm:p-8 lg:p-10 max-w-4xl space-y-3.5 sm:space-y-4">
              {/* Unboxed quiet metadata line */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-medium text-indigo-300">
                <span className="text-emerald-400 font-semibold">
                  Główne znalezisko dnia
                </span>
                <span aria-hidden="true">·</span>
                <span>{heroItem.category}</span>
                <span aria-hidden="true">·</span>
                <span>
                  Autor: {userMap[heroItem.authorId]?.name || heroItem.authorId}
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {formatDateShort(heroItem.createdAt)}
                </span>
                {heroItem.readTimeMinutes && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {heroItem.readTimeMinutes} min materiału
                    </span>
                  </>
                )}
              </div>

              <h2
                className="text-xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight font-display"
                style={{ textWrap: 'balance' }}
              >
                {heroItem.title}
              </h2>

              <p className="text-xs sm:text-base text-slate-200 leading-relaxed max-w-3xl">
                {heroItem.summary}
              </p>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
                {heroItem.youtubeVideoId ? (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveVideoModal({
                        videoId: heroItem.youtubeVideoId!,
                        title: heroItem.title,
                        authorName:
                          userMap[heroItem.authorId]?.name || heroItem.authorId,
                        summary: heroItem.summary,
                      })
                    }
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Odtwórz wideo w aplikacji
                  </button>
                ) : heroItem.url ? (
                  <a
                    href={heroItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-slate-100 hover:bg-white rounded-lg transition-colors"
                  >
                    Czytaj pełny materiał
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                ) : null}

                <button
                  type="button"
                  onClick={() => onToggleUpvote(heroItem.id)}
                  aria-label={`Doceniono znalezisko: ${heroItem.title}`}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    heroItem.upvotedByUserIds.includes(activeUserId)
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Wartościowe</span>
                  <span className="font-mono tabular-nums font-semibold">
                    ({heroItem.upvotedByUserIds.length})
                  </span>
                </button>
              </div>
            </div>
          </article>

          {/* SIATKA BENTO GRID POZOSTAŁYCH KAFELKÓW */}
          {bentoGridItems.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bentoGridItems.map((item, idx) => {
                const author = userMap[item.authorId];
                const isWideTile = idx === 0 && bentoGridItems.length >= 3;
                const hasUpvoted = item.upvotedByUserIds.includes(activeUserId);

                return (
                  <article
                    key={item.id}
                    className={`group flex flex-col justify-between rounded-xl border border-slate-800/90 bg-slate-900/70 hover:border-slate-700 transition-colors overflow-hidden ${
                      isWideTile ? 'md:col-span-2 lg:col-span-2' : ''
                    }`}
                  >
                    <div>
                      {/* Miniatura wizualna */}
                      <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-950 border-b border-slate-800/70">
                        {item.thumbnailUrl && !brokenImages[item.id] ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setBrokenImages((prev) => ({
                                ...prev,
                                [item.id]: true,
                              }))
                            }
                            className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900">
                            <Sparkles className="w-8 h-8 text-indigo-400/60" />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent" />

                        {/* Jeśli to YouTube — przycisk szybkiego odtwarzania */}
                        {item.youtubeVideoId && (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveVideoModal({
                                videoId: item.youtubeVideoId!,
                                title: item.title,
                                authorName: author?.name || item.authorId,
                                summary: item.summary,
                              })
                            }
                            aria-label={`Odtwórz wideo: ${item.title}`}
                            className="absolute inset-0 flex items-center justify-center bg-slate-950/30 group-hover:bg-slate-950/50 transition-colors cursor-pointer"
                          >
                            <div className="w-12 h-12 rounded-full bg-indigo-600/95 text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
                              <Play className="w-5 h-5 fill-current ml-0.5" />
                            </div>
                          </button>
                        )}
                      </div>

                      {/* Treść kafelka */}
                      <div className="p-5 space-y-2.5">
                        {/* Unboxed metadata */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                          <span className="font-semibold text-indigo-400">
                            {item.category}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>Dodał: {author?.name || item.authorId}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">
                            {formatDateShort(item.createdAt)}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-100 leading-snug font-display group-hover:text-indigo-300 transition-colors">
                          {item.title}
                        </h3>

                        <p className="text-sm text-slate-300/90 leading-relaxed line-clamp-3">
                          {item.summary}
                        </p>
                      </div>
                    </div>

                    {/* Dolny pasek akcji kafelka */}
                    <div className="px-5 py-3.5 border-t border-slate-800/70 flex items-center justify-between gap-3 bg-slate-950/40">
                      <button
                        type="button"
                        onClick={() => onToggleUpvote(item.id)}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
                          hasUpvoted
                            ? 'text-emerald-400'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>Polecam</span>
                        <span className="font-mono tabular-nums">
                          ({item.upvotedByUserIds.length})
                        </span>
                      </button>

                      <div className="flex items-center gap-3">
                        {item.youtubeVideoId && (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveVideoModal({
                                videoId: item.youtubeVideoId!,
                                title: item.title,
                                authorName: author?.name || item.authorId,
                                summary: item.summary,
                              })
                            }
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                          >
                            <Video className="w-3.5 h-3.5" />
                            Odtwórz w modalu
                          </button>
                        )}

                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                          >
                            <span>Źródło</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* MODAL DODAWANIA ZNALEZISKA (YouTube auto-thumbnail lub Artykuł) */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-discovery-modal-title"
        >
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div>
                <h2
                  id="add-discovery-modal-title"
                  className="text-lg font-bold text-white font-display"
                >
                  Dodaj nowe znalezisko na tablicę grupy
                </h2>
                <p className="text-xs text-slate-400">
                  Publikujesz jako:{' '}
                  <span className="text-indigo-400 font-semibold">
                    {userMap[activeUserId]?.name}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Zamknij modal dodawania znaleziska"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDiscovery} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
                  {formError}
                </div>
              )}

              <div>
                <label
                  htmlFor="discovery-url-input"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Link do YouTube lub artykułu (opcjonalnie dla czystej notatki)
                </label>
                <input
                  id="discovery-url-input"
                  type="url"
                  value={formUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="np. https://www.youtube.com/watch?v=IAnhFUUCq6c lub link do artykułu"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                {detectedYoutubeId && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-indigo-500/40 flex items-center gap-3">
                    <img
                      src={getYouTubeThumbnailUrl(detectedYoutubeId)}
                      alt="Podgląd miniatury YouTube"
                      referrerPolicy="no-referrer"
                      className="w-28 h-16 object-cover rounded border border-slate-800 shrink-0"
                    />
                    <div className="text-xs space-y-1">
                      <p className="text-emerald-400 font-semibold">
                        Wykryto film YouTube (ID: <span className="font-mono">{detectedYoutubeId}</span>)
                      </p>
                      <p className="text-slate-400">
                        Automatycznie pobrano miniaturkę maxresdefault.jpg oraz włączono odtwarzacz w modalu.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="discovery-category-select"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Kategoria
                  </label>
                  <select
                    id="discovery-category-select"
                    value={detectedYoutubeId ? 'YouTube' : formCategory}
                    onChange={(e) =>
                      setFormCategory(e.target.value as DiscoveryCategory)
                    }
                    disabled={Boolean(detectedYoutubeId)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                  >
                    <option value="YouTube">YouTube</option>
                    <option value="Artykuły">Artykuły</option>
                    <option value="Ciekawostki">Ciekawostki</option>
                    <option value="Rozwój">Rozwój</option>
                  </select>
                </div>

                {!detectedYoutubeId && (
                  <div>
                    <label
                      htmlFor="discovery-image-input"
                      className="block text-xs font-semibold text-slate-300 mb-1.5"
                    >
                      Opcjonalny URL obrazka / okładki
                    </label>
                    <input
                      id="discovery-image-input"
                      type="url"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="discovery-title-input"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Tytuł znaleziska *
                </label>
                <input
                  id="discovery-title-input"
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="np. Protokół budowania VO2 Max i siły — notatki z wykładu"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="discovery-summary-input"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Własny opis / Ciekawostka / Kluczowe wnioski dla chłopaków *
                </label>
                <textarea
                  id="discovery-summary-input"
                  rows={4}
                  required
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder="Napisz w 2-3 zdaniach dlaczego warto to sprawdzić i co z tego wyciągnąłeś..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formSetHero}
                  onChange={(e) => setFormSetHero(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Ustaw jako „Główne znalezisko dnia” na górze portalu
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
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Publikowanie...' : 'Opublikuj na tablicy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ODTWARZACZA YOUTUBE (IFRAME) */}
      {activeVideoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="youtube-player-modal-title"
        >
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="pr-4">
                <h2
                  id="youtube-player-modal-title"
                  className="text-base font-bold text-white font-display line-clamp-1"
                >
                  {activeVideoModal.title}
                </h2>
                <p className="text-xs text-slate-400">
                  Udostępnione przez: {activeVideoModal.authorName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideoModal(null)}
                aria-label="Zamknij odtwarzacz wideo"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video w-full bg-black">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${activeVideoModal.videoId}?autoplay=1`}
                title={activeVideoModal.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="p-5 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeVideoModal.summary}
              </p>
              <button
                type="button"
                onClick={() => setActiveVideoModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg shrink-0 cursor-pointer"
              >
                Zamknij wideo
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
