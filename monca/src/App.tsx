import { useCallback, useEffect, useState } from 'react'
import type { DeckData, DeckEntry } from './types'
import './App.css'

const STORAGE_KEY_CURRENT_ID = 'monca-current-id'

const SOURCE_URLS = [
  ['ドラパルトex', '122503'],
  ['宝石ドラパルトex', '290646'],
  ['マリィのオーロンゲex', '197309'],
  ['メガディアンシーex', '287934'],
  ['R団ドンカラス', '216334'],
  ['メガスターミーex', '285277'],
  ['R団ミュウツーex', '214576'],
  ['メガルカリオex', '234601'],
]

function formatFetchedAt(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()
    const h = d.getHours()
    const min = d.getMinutes()
    return `${y}/${m}/${day} ${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
  } catch {
    return ''
  }
}

function deckCaption(entry: DeckEntry): string {
  return `${entry.date} ${entry.venue} `
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickPair(data: DeckData): { left: DeckEntry; right: DeckEntry } {
  const winners = data.decks.filter((d) => d.rank === '優勝')
  const others = data.decks.filter((d) => d.rank !== '優勝')
  if (winners.length === 0 || others.length === 0) {
    throw new Error('優勝デッキまたはそれ以外のデッキが不足しています')
  }
  const [w] = shuffle(winners).slice(0, 1)
  const [o] = shuffle(others).slice(0, 1)
  const leftFirst = Math.random() < 0.5
  return leftFirst ? { left: w, right: o } : { left: o, right: w }
}

function applyCutoff(raw: DeckData): DeckData {
  const fetchedAtDate = raw.fetchedAt?.slice(0, 10) ?? ''
  const decks = (raw.decks ?? [])
    .map((d) => ({
      ...d,
      date: d.date ?? fetchedAtDate,
      venue: d.venue ?? '',
    }))
  return { ...raw, decks }
}

export default function App() {
  const [deckDataByUrl, setDeckDataByUrl] = useState<Record<string, DeckData>>({})
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [data, setData] = useState<DeckData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pair, setPair] = useState<{ left: DeckEntry; right: DeckEntry } | null>(null)
  const [nextPair, setNextPair] = useState<{ left: DeckEntry; right: DeckEntry } | null>(null)
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null)
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!nextPair) return
    const leftImg = new Image()
    const rightImg = new Image()
    leftImg.src = nextPair.left.imageUrl
    rightImg.src = nextPair.right.imageUrl
  }, [nextPair])

  const setCurrentSource = useCallback((id: string, byId: Record<string, DeckData>) => {
    const raw = byId[id]
    if (!raw) return
    const filtered = applyCutoff(raw)
    if (!filtered.decks.length) return
    setData(filtered)
    setPair(pickPair(filtered))
    setNextPair(null)
    setResult(null)
    setCurrentId(id)
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT_ID, id)
    } catch {
      /* ignore */
    }
  }, [])

  const initLoad = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const savedId = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY_CURRENT_ID)) ?? null
      const byId: Record<string, DeckData> = {}
      const ids = SOURCE_URLS.map(([, id]) => id)
      const results = await Promise.all(
        ids.map(async (id) => {
          const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '') || ''
          const res = await fetch(`${base}/deck-data-${id}.json`)
          if (!res.ok) return { id, data: null as DeckData | null }
          const data: DeckData = await res.json()
          return { id, data }
        })
      )
      for (const { id, data } of results) {
        if (data?.decks?.length) byId[id] = data
      }
      if (Object.keys(byId).length === 0) throw new Error('デッキデータを読み込めませんでした')
      setDeckDataByUrl(byId)
      const initialId = (savedId && byId[savedId] ? savedId : null) ?? ids[0]
      if (!byId[initialId]) throw new Error('デッキデータが空です（2026/1/23以降のデータのみ使用）')
      const filtered = applyCutoff(byId[initialId])
      if (!filtered.decks.length) throw new Error('デッキデータが空です（2026/1/23以降のデータのみ使用）')
      setData(filtered)
      setPair(pickPair(filtered))
      setNextPair(null)
      setCurrentId(initialId)
    } catch (e) {
      setError(e instanceof Error ? e.message : '不明なエラー')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    initLoad()
  }, [initLoad])

  useEffect(() => {
    if (!sidebarOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sidebarOpen])

  const answer = (choice: 'left' | 'right') => {
    if (!pair || result !== null || !data) return
    const chosen = choice === 'left' ? pair.left : pair.right
    const isCorrect = chosen.rank !== '優勝'
    setResult(isCorrect ? 'correct' : 'wrong')
    setNextPair(pickPair(data))
  }

  const next = () => {
    if (!data || !nextPair) return
    setPair(nextPair)
    setResult(null)
    setNextPair(pickPair(data))
  }

  const switchSource = (id: string) => {
    if (deckDataByUrl[id]) {
      setCurrentSource(id, deckDataByUrl)
      setSidebarOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="app">
        <p className="loading">データを読み込み中…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="app">
        <p className="error">{error ?? 'データがありません'}</p>
        <button type="button" onClick={() => initLoad()}>再読み込み</button>
      </div>
    )
  }

  if (!pair) {
    return (
      <div className="app">
        <p className="error">優勝またはそれ以外のデッキが足りません</p>
      </div>
    )
  }

  return (
    <div className="app">
      <button
        type="button"
        className="float-menu-btn"
        onClick={() => setSidebarOpen(true)}
        aria-label="メニューを開く"
      >
        <span className="float-menu-btn-icon" aria-hidden>≡</span>
      </button>
      <div className="deck-row">
        <div className="deck-card">
        <span className="deck-label">A</span>
          <button
            type="button"
            className="deck-image-wrap"
            onClick={() => setEnlargedImageUrl(pair.left.imageUrl)}
            aria-label="デッキ画像（A）を拡大"
          >
            <img
              src={pair.left.imageUrl}
              alt="デッキ画像（A）"
              className="deck-image"
              fetchPriority="high"
            />
          </button>
          {deckCaption(pair.left) && (
            <p className="deck-caption">{deckCaption(pair.left)}</p>
          )}
          <button
            type="button"
            className="choice-btn"
            onClick={() => answer('left')}
            disabled={result !== null}
          >
            モンカ
          </button>
        </div>
        <div className="deck-card">
          <span className="deck-label">B</span>
          <button
            type="button"
            className="deck-image-wrap"
            onClick={() => setEnlargedImageUrl(pair.right.imageUrl)}
            aria-label="デッキ画像（B）を拡大"
          >
            <img
              src={pair.right.imageUrl}
              alt="デッキ画像（B）"
              className="deck-image"
              fetchPriority="high"
            />
          </button>
          {deckCaption(pair.right) && (
            <p className="deck-caption">{deckCaption(pair.right)}</p>
          )}
          <button
            type="button"
            className="choice-btn"
            onClick={() => answer('right')}
            disabled={result !== null}
          >
            モンカ
          </button>
        </div>
      </div>

      {enlargedImageUrl !== null && (
        <div
          className="image-lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="画像を拡大表示"
          onClick={() => setEnlargedImageUrl(null)}
        >
          <button
            type="button"
            className="image-lightbox-close"
            onClick={() => setEnlargedImageUrl(null)}
            aria-label="閉じる"
          >
            ×
          </button>
          <img
            src={enlargedImageUrl}
            alt="デッキ画像（拡大）"
            className="image-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {result !== null && (
        <div
          className="dialog-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="result-title"
        >
          <div className={`result-dialog result-dialog-${result}`}>
            <p id="result-title" className="result-title">
              {result === 'correct' ? '正解！' : '不正解…'}
            </p>
            <p className="result-detail">
              A: {pair.left.rank} / B: {pair.right.rank}
            </p>
            <button type="button" className="next-btn" onClick={next}>
              次の問題
            </button>
          </div>
        </div>
      )}

      {sidebarOpen && (
        <>
          <div
            className="sidebar-backdrop"
            role="presentation"
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className="sidebar"
            role="dialog"
            aria-modal="true"
            aria-label="メニュー"
          >
            <button
              type="button"
              className="sidebar-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="閉じる"
            >
              ×
            </button>
            <div className="sidebar-body">
              <p className="sidebar-label">データソース</p>
                <ul className="sidebar-url-list">
                  {SOURCE_URLS.map((d) => {
                    const [name, id] = d
                    const isCurrent = id === currentId
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          className={`sidebar-url-btn ${isCurrent ? 'sidebar-url-btn-current' : ''}`}
                          onClick={() => switchSource(id)}
                          value={id}
                        >
                          <span className="sidebar-url-id" id={id}>
                            {name}
                          </span>
                          {isCurrent && <span className="sidebar-url-check">✓</span>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              {currentId && (
                <>
                  {data.fetchedAt && (
                    <p className="sidebar-fetched-at">最終更新: {formatFetchedAt(data.fetchedAt)}</p>
                  )}
                  <a
                    href={data.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sidebar-link"
                  >
                    データ元: ポケカブック
                  </a>
                </>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
