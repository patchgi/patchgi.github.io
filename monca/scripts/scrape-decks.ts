/**
 * ポケカブックのアーカイブページからデッキIDと順位を取得し、
 * 画像URL付きのJSONを出力するスクリプト
 * 2026/1/23 以降のデータのみを対象とする。
 *
 * 実行: npm run scrape
 * 出力: public/deck-data-{アーカイブID}.json（SOURCE_URLS の各URLごとに1ファイル）
 */

import * as cheerio from "cheerio";

const SOURCE_URLS = [
  'https://pokecabook.com/archives/122503',
  'https://pokecabook.com/archives/290646',
  'https://pokecabook.com/archives/197309',
  'https://pokecabook.com/archives/287934',
  'https://pokecabook.com/archives/216334',
  'https://pokecabook.com/archives/285277',
  'https://pokecabook.com/archives/214576',
  'https://pokecabook.com/archives/234601',
];

/** URL からアーカイブIDを取得し、ファイル名用のサフィックスにする（例: .../archives/122503 → 122503） */
function slugFromUrl(url: string): string {
  const m = url.match(/\/archives\/([^/?#]+)/);
  return m ? m[1] : url.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 32);
}

const RANK_LABELS = ['優勝', '準優勝', 'TOP4', 'TOP8'] as const;
export type Rank = (typeof RANK_LABELS)[number];

export interface DeckEntry {
  deckId: string;
  rank: Rank;
  imageUrl: string;
  /** 大会日（YYYY-MM-DD）。必ず設定する */
  date: string;
  /** 会場名。取得できない場合は空文字。必ず保持する */
  venue: string;
}

function parseDateAndVenueBefore(
  label: string,
): { date?: string; rank?: Rank, venue?: string } {
  let t = label.replace(/\u3000/g, " ").replace(/\s+/g, " ").trim();
  const re =
    /^(\d{1,2}\/\d{1,2})【[月火水木金土日]】(.+?)\s*(優勝|準優勝|TOP4|TOP8)\s*$/;
  const m = t.match(re);
  return m ? { date: formatDate(m[1]), rank: m[3] as Rank, venue: m[2] } : {};
}

function formatDate(rowDate: string): string {
  const [m, d] = rowDate.split('/');
  const today = new Date();
  // Pad month and day to 2 digits
  const mm = m.padStart(2, '0');
  const dd = d.padStart(2, '0');
  return `${today.getFullYear()}-${mm}-${dd}`;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

/**
 * HTMLから deck/confirm.html/deckID/XXX のリンクとその直近のテキスト（順位）を抽出。
 * date は解析できれば使用、できなければ defaultDate を使用する。
 */
function extractDeckEntries(html: string, defaultDate: string): DeckEntry[] {
  const entries: DeckEntry[] = [];
  const seen = new Set<string>();

  const $ = cheerio.load(html);
  $('figcaption.wp-element-caption').each((_, el) => {
    const label = $(el).text()
    if (isResultLine(label)) {
      const href = $(el).find('a').first().attr('href');
      if (href) {
        const hrefSegments = href.split('/');
        const deck_id = hrefSegments[hrefSegments.length - 1];
        seen.add(deck_id);
        const deck_info = parseDateAndVenueBefore(label)
        entries.push({
          deckId: deck_id,
          rank: deck_info.rank ?? "TOP4",
          imageUrl: `https://www.pokemon-card.com/deck/deckView.php/deckID/${deck_id}.png`,
          date: deck_info.date ?? defaultDate,
          venue: deck_info.venue ?? '',
        });
      }
    }
  });
  return entries;
}

const isResultLine = (s: string) => {
  // 曜日入り日付 + 店名 + （都道府県） + 成績
  let line = s.replace(/\u3000/g, " ").replace(/\s+/g, " ").trim();
  if (line.includes("~")) {
    return false;
  }
  return /^\d{1,2}\/\d{1,2}【[月火水木金土日]】.+（[^）]+）.*(優勝|準優勝|TOP4|TOP8)\s*$/.test(line);;
};

export interface DeckDataOutput {
  sourceUrl: string;
  fetchedAt: string;
  decks: DeckEntry[];
}

async function main() {
  const outputStdout = process.env.OUTPUT_STDOUT === '1';
  const fs = await import('fs');
  const path = await import('path');
  const publicDir = path.join(process.cwd(), 'public');
  fs.mkdirSync(publicDir, { recursive: true });

  const defaultDate = new Date().toISOString().slice(0, 10);

  for (const sourceUrl of SOURCE_URLS) {
    if (!outputStdout) console.log('Fetching:', sourceUrl);
    const html = await fetchHtml(sourceUrl);
    const entries = extractDeckEntries(html, defaultDate);
    if (!outputStdout) console.log(`  Extracted ${entries.length} deck entries.`);

    const output: DeckDataOutput = {
      sourceUrl,
      fetchedAt: new Date().toISOString(),
      decks: entries,
    };

    if (outputStdout) {
      process.stdout.write(JSON.stringify(output) + '\n');
      continue;
    }

    const byRank = entries.reduce(
      (acc, e) => {
        if (!acc[e.rank]) acc[e.rank] = 0;
        acc[e.rank]++;
        return acc;
      },
      {} as Record<Rank, number>
    );
    console.log('  By rank:', byRank);

    const slug = slugFromUrl(sourceUrl);
    const outPath = path.join(publicDir, `deck-data-${slug}.json`);
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
    console.log('  Written:', outPath);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
