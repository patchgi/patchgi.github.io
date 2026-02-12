export const RANK_LABELS = ['優勝', '準優勝', 'TOP4', 'TOP8'] as const;
export type Rank = (typeof RANK_LABELS)[number];

export interface DeckEntry {
  deckId: string;
  rank: Rank;
  imageUrl: string;
  /** 大会日（YYYY-MM-DD）。スクレイプ時または読み込み時に必ず設定する */
  date: string;
  /** 会場名。取得できない場合は空文字。必ず保持する */
  venue: string;
}

export interface DeckData {
  sourceUrl: string;
  fetchedAt: string;
  decks: DeckEntry[];
}
