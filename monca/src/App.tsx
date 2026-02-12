import { useCallback, useEffect, useState } from 'react'
import type { DeckData, DeckEntry } from './types'
import './App.css'

const DATA_URL = '/deck-data.json'
const STORAGE_KEY_DATA = 'pokeca-deck-data-by-url'
const STORAGE_KEY_CURRENT = 'pokeca-deck-current-url'
const POKECABOOK_ARCHIVES_REGEX = /^https:\/\/pokecabook\.com\/archives\/\d+\/?$/
const SOURCE_URLS = [
  ['ドラパルトex', 'https://pokecabook.com/archives/122503'],
  ['宝石ドラパルトex', 'https://pokecabook.com/archives/290646'],
  ['マリィのオーロンゲex', 'https://pokecabook.com/archives/197309'],
  ['メガディアンシーex', 'https://pokecabook.com/archives/287934'],
  ['R団ドンカラス', 'https://pokecabook.com/archives/216334'],
  ['メガスターミーex', 'https://pokecabook.com/archives/285277'],
  ['R団ミュウツーex', 'https://pokecabook.com/archives/214576'],
  ['メガルカリオex', 'https://pokecabook.com/archives/234601'],
]

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/$/, '')
}

/** ISO日時 "2026-02-12T14:32:05.091Z" を "2026/2/12 14:32" 形式に */
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
  return entry.venue
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
  const [currentUrl, setCurrentUrl] = useState<string | null>(null)
  const [data, setData] = useState<DeckData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pair, setPair] = useState<{ left: DeckEntry; right: DeckEntry } | null>(null)
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null)
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const persist = useCallback((byUrl: Record<string, DeckData>, current: string | null) => {
    try {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(byUrl))
      localStorage.setItem(STORAGE_KEY_CURRENT, current ?? '')
    } catch {
      /* ignore */
    }
  }, [])

  const setCurrentSource = useCallback(
    (url: string, byUrl: Record<string, DeckData>) => {
      console.log(url)
      const key = url in byUrl ? url : Object.keys(byUrl).find((k) => normalizeUrl(k) === normalizeUrl(url)) ?? url
      const raw = byUrl[key]
      if (!raw) return
      const filtered = applyCutoff(raw)
      if (!filtered.decks.length) return
      setData(filtered)
      setPair(pickPair(filtered))
      setResult(null)
      setCurrentUrl(key)
    },
    []
  )

  const initLoad = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DATA)
      const storedCurrent = localStorage.getItem(STORAGE_KEY_CURRENT)
      if (stored) {
        const parsed: Record<string, DeckData> = JSON.parse(stored)
        const byUrl: Record<string, DeckData> = {}
        for (const k of Object.keys(parsed)) {
          byUrl[normalizeUrl(k)] = parsed[k]
        }
        const currentKey = storedCurrent ? normalizeUrl(storedCurrent) : null

        if (currentKey && !(currentKey in byUrl) && POKECABOOK_ARCHIVES_REGEX.test(currentKey)) {
          try {
            const res = await fetch('/api/update-deck-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: currentKey }),
            })
            const result = await res.json().catch(() => ({}))
            if (res.ok && result.data) {
              const newData = result.data as DeckData
              const url = normalizeUrl(newData.sourceUrl ?? currentKey)
              byUrl[url] = newData
              const filtered = applyCutoff(newData)
              if (filtered.decks.length) {
                setDeckDataByUrl(byUrl)
                setCurrentUrl(url)
                setData(filtered)
                setPair(pickPair(filtered))
                persist(byUrl, url)
                return
              }
            }
          } catch {
            /* fall through to default fetch */
          }
        }

        const url = (currentKey && byUrl[currentKey] ? currentKey : null) ?? Object.keys(byUrl)[0]
        if (url && byUrl[url]) {
          const filtered = applyCutoff(byUrl[url])
          if (filtered.decks.length) {
            setDeckDataByUrl(byUrl)
            setCurrentUrl(url)
            setData(filtered)
            setPair(pickPair(filtered))
            return
          }
        }
      }
      const res = await fetch(DATA_URL)
      if (!res.ok) throw new Error(`データの取得に失敗しました: ${res.status}`)
      const json: DeckData = await res.json()
      const url = normalizeUrl(json.sourceUrl ?? '')
      const nextByUrl = { [url]: json }
      setDeckDataByUrl(nextByUrl)
      setCurrentUrl(url)
      const filtered = applyCutoff(json)
      if (!filtered.decks.length) throw new Error('デッキデータが空です（2026/1/23以降のデータのみ使用）')
      setData(filtered)
      setPair(pickPair(filtered))
      persist(nextByUrl, url)
    } catch (e) {
      setError(e instanceof Error ? e.message : '不明なエラー')
    } finally {
      setLoading(false)
    }
  }, [persist])

  useEffect(() => {
    initLoad()
  }, [initLoad])

  useEffect(() => {
    if (Object.keys(deckDataByUrl).length > 0) persist(deckDataByUrl, currentUrl)
  }, [deckDataByUrl, currentUrl, persist])

  useEffect(() => {
    if (!sidebarOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sidebarOpen])

  const answer = (choice: 'left' | 'right') => {
    if (!pair || result !== null) return
    const chosen = choice === 'left' ? pair.left : pair.right
    const isCorrect = chosen.rank !== '優勝'
    setResult(isCorrect ? 'correct' : 'wrong')
  }

  const next = () => {
    if (!data) return
    setPair(pickPair(data))
    setResult(null)
  }

  const switchSource = async (url: string) => {
    const key = url in deckDataByUrl ? url : Object.keys(deckDataByUrl).find((k) => normalizeUrl(k) === normalizeUrl(url)) ?? url
    if (deckDataByUrl[key]) {
      setCurrentSource(url, deckDataByUrl)
      setSidebarOpen(false)
      return
    }
    if (!POKECABOOK_ARCHIVES_REGEX.test(normalizeUrl(url))) return
    setUpdateLoading(true)
    setUpdateError(null)
    try {
      const res = await fetch('/api/update-deck-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizeUrl(url) }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.error ?? `取得に失敗しました (${res.status})`)
      const newData = result.data as DeckData
      if (!newData?.sourceUrl) throw new Error('データを取得できませんでした')
      const normalized = normalizeUrl(newData.sourceUrl)
      const next = { ...deckDataByUrl, [normalized]: newData }
      setDeckDataByUrl(next)
      setCurrentSource(normalized, next)
      setSidebarOpen(false)
    } catch (e) {
      setUpdateError(e instanceof Error ? e.message : '取得に失敗しました')
    } finally {
      setUpdateLoading(false)
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
                    const [name, url] = d
                    const id = url.replace(/[^a-z0-9]/gi, '-')
                    const isCurrent = url === currentUrl
                    return (
                      <li key={url}>
                        <button
                          type="button"
                          className={`sidebar-url-btn ${isCurrent ? 'sidebar-url-btn-current' : ''}`}
                          onClick={() => switchSource(url)}
                          value={url}
                          disabled={updateLoading}
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
              {currentUrl && (
                <>
                  {updateError && <p className="sidebar-update-error">{updateError}</p>}
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
