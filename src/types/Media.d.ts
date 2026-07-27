interface Id {
  id: string;
  theme?: {
    title?: string;
  };
  // Announced but not yet out — media-list.json's own position for these
  // doesn't matter (utils/media-lists.ts's buildMediaList filters them out
  // of Chronological/Reverse Chronological entirely, since there's no real
  // in-universe slot to place them in yet), only Release Date's own
  // release-date sort does.
  unreleased?: boolean;
  // The MCU Phase this entry belongs to, if any (assets/mcu-phases.ts's own
  // PHASE_SAGA maps this to a saga — nothing else needs storing per entry,
  // since a phase number alone determines it).
  phase?: number;
}

export interface MovieType extends Id {
  type: 'movie' | 'short' | 'special';
}

export interface ShowType extends Id {
  type: 'tv';
  season: number;
  epiStart: number;
  epiEnd: number;
}

export type MediaType = MovieType | ShowType;
export type MediaUiType = 'movie' | 'show' | 'short' | 'special';
