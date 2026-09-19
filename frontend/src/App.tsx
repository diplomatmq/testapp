import { useEffect, useMemo, useState } from 'react';

type TabKey = 'minigames' | 'inventory' | 'cases' | 'rating' | 'profile';

type Profile = {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  balance: number;
  rating: number;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: { initData: string; ready: () => void; expand: () => void } };
  }
}

type GiftDrop = {
  slug: string;
  name: string;
  preview_url: string;
  animation_url: string;
};

type InventoryEntry = {
  id: number;
  player_id: number;
  item_name: string;
  quantity: number;
};

type CaseInfo = {
  slug: string;
  name: string;
  preview_url: string;
  price: number;
  drops: GiftDrop[];
};

const localFreeCase: CaseInfo = {
  slug: 'freecase',
  name: 'Free Case',
  preview_url: '/assets/freecase.webp',
  price: 0,
  drops: [],
};

const tabConfig: Array<{ key: TabKey; label: string }> = [
  { key: 'minigames', label: 'Миниигры' },
  { key: 'inventory', label: 'Инвентарь' },
  { key: 'cases', label: 'Кейсы' },
  { key: 'rating', label: 'Рейтинг' },
  { key: 'profile', label: 'Профиль' },
];

function TabIcon({ tab }: { tab: TabKey }) {
  const commonProps = {
    className: `tab-icon tab-icon-${tab}`,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (tab === 'minigames') {
    return <svg {...commonProps}><path d="m8 9 2-2m6 2-2-2m-6 6h.01M16 13h.01" /><path d="M7.5 5h9A3.5 3.5 0 0 1 20 8.5v3A3.5 3.5 0 0 1 16.5 15H15l-3 4-3-4H7.5A3.5 3.5 0 0 1 4 11.5v-3A3.5 3.5 0 0 1 7.5 5Z" /></svg>;
  }

  if (tab === 'inventory') {
    return <svg {...commonProps}><path d="m4 8 8-4 8 4-8 4-8-4Z" /><path d="M4 8v8l8 4 8-4V8M8 10v8m8-8v8" /></svg>;
  }

  if (tab === 'cases') {
    return <svg {...commonProps}><path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" /><path d="m4.3 8.7 7.7 4.4 7.7-4.4M12 13.1V20" /></svg>;
  }

  if (tab === 'rating') {
    return <svg {...commonProps}><path d="m12 3 2.2 4.6 5.1.7-3.7 3.6.9 5.1-4.5-2.4-4.5 2.4.9-5.1-3.7-3.6 5.1-.7L12 3Z" /></svg>;
  }

  return <svg {...commonProps}><circle cx="12" cy="8" r="3.2" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>;
}

const mockRating = [
  { name: 'm0nkey', points: 2450 },
  { name: 'Slava', points: 2200 },
  { name: 'Rin', points: 2010 },
  { name: 'You', points: 1280 },
];

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('cases');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [cases, setCases] = useState<CaseInfo[]>([localFreeCase]);
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseInfo | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinOffset, setSpinOffset] = useState(0);
  const [lastDrop, setLastDrop] = useState<GiftDrop | null>(null);
  const [lastDropLabel, setLastDropLabel] = useState('');

  const apiBaseUrl = import.meta.env.VITE_API_URL || '';
  const telegramInitData = window.Telegram?.WebApp?.initData || '';

  const fetchState = async () => {
    const response = await fetch(`${apiBaseUrl}/api/state`, {
      headers: { 'X-Telegram-Init-Data': telegramInitData },
    });
    if (!response.ok) throw new Error('Не удалось определить пользователя');
    return response.json();
  };

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();

    const loadState = async () => {
      try {
        const data = await fetchState();
        setProfile(data.user ?? null);
        setCases(data.cases?.length ? data.cases : [localFreeCase]);
        setInventory(data.inventory ?? []);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Не удалось загрузить профиль');
      }
    };

    loadState();
  }, [apiBaseUrl, telegramInitData]);

  const handleDeposit = async () => {
    const amount = Number(depositAmount);
    if (!Number.isInteger(amount) || amount <= 0) {
      setErrorMessage('Введите целое число больше нуля');
      return;
    }

    setIsDepositing(true);
    setErrorMessage('');
    try {
      const response = await fetch(`${apiBaseUrl}/api/test-deposit?amount=${amount}`, {
        method: 'POST',
        headers: { 'X-Telegram-Init-Data': telegramInitData },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail ?? 'Не удалось пополнить баланс');
      }
      setProfile(await response.json());
      setDepositAmount('');
      setIsDepositOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось пополнить баланс');
    } finally {
      setIsDepositing(false);
    }
  };

  const openCase = async () => {
    if (!selectedCase || isSpinning) return;
    setIsSpinning(true);
    setLastDrop(null);
    setLastDropLabel('');
    setSpinOffset(0);
    await new Promise((resolve) => window.setTimeout(resolve, 80));
    setSpinOffset(-((selectedCase.drops.length * 2 + 4) * 116));

    try {
      const response = await fetch(`${apiBaseUrl}/api/cases/${selectedCase.slug}/open`, {
        method: 'POST',
        headers: { 'X-Telegram-Init-Data': telegramInitData },
      });
      if (!response.ok) throw new Error('Не удалось открыть кейс');
      const result = await response.json();
      await new Promise((resolve) => window.setTimeout(resolve, 2100));
      setLastDrop(result.gift ?? null);
      setLastDropLabel(result.label);
      setProfile(result.user);
      const refreshedState = await fetchState();
      setInventory(refreshedState.inventory ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось открыть кейс');
    } finally {
      setIsSpinning(false);
    }
  };

  const currentLabel = useMemo(
    () => tabConfig.find((tab) => tab.key === activeTab)?.label ?? 'Кейсы',
    [activeTab],
  );

  return (
    <div className={`app-shell ${isDarkTheme ? 'theme-dark' : 'theme-light'}`}>
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark">M</div>
          <div>
            <div className="brand-name">Monkey Dynasty</div>
            <div className="brand-sub">Mini App</div>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="balance-pill" onClick={() => setIsDepositOpen(true)} type="button">
            <span aria-hidden="true">★</span>
            <strong>{profile?.balance ?? 0}</strong>
          </button>
          <button
            className="theme-toggle"
            onClick={() => setIsDarkTheme((current) => !current)}
            type="button"
            aria-label={isDarkTheme ? 'Включить светлую тему' : 'Включить тёмную тему'}
            title={isDarkTheme ? 'Светлая тема' : 'Тёмная тема'}
          >
            <span aria-hidden="true">{isDarkTheme ? '☀' : '☾'}</span>
          </button>
        </div>
      </header>

      <main className="content">
        {activeTab === 'cases' && !selectedCase && (
          <section className="panel cases-panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Главная</p>
                <h2>Кейсы</h2>
              </div>
              <button className="ghost-button">+ 4</button>
            </div>

            <div className="feature-card">
              <div>
                <p className="eyebrow">Сегодняшняя акция</p>
                <h3>Легендарный стартовый набор</h3>
              </div>
              <span className="badge">-25%</span>
            </div>

            <div className="cases-grid">
              {cases.map((item) => (
                <button key={item.slug} className="case-card" onClick={() => setSelectedCase(item)} type="button">
                  <img className="case-image" src={item.preview_url} alt={item.name} />
                  <span className="case-name">{item.name}</span>
                  <span className="case-open-hint">Открыть кейс</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'cases' && selectedCase && (
          <section className="panel case-opening-panel">
            <div className="case-opening-topbar">
              <button className="back-button" onClick={() => setSelectedCase(null)} type="button">← Назад</button>
              <button className="opening-balance" onClick={() => setIsDepositOpen(true)} type="button">★ {profile?.balance ?? 0}</button>
            </div>
            <div className="opening-heading">
              <img className="opening-case-image" src={selectedCase.preview_url} alt={selectedCase.name} />
              <p className="eyebrow">Открытие кейса</p>
              <h2>{selectedCase.name}</h2>
            </div>
            <div className="roulette-wrap">
              <div className="roulette-pointer" aria-hidden="true">▼</div>
              <div className="roulette-window">
                <div className="roulette-reel" style={{ transform: `translateX(${spinOffset}px)` }}>
                  {[...selectedCase.drops, ...selectedCase.drops, ...selectedCase.drops].map((gift, index) => (
                    <div className="roulette-slot" key={`${gift.slug}-${index}`}>
                      <img src={gift.preview_url} alt="" />
                      <span>{gift.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button className="primary-button spin-button" onClick={openCase} type="button" disabled={isSpinning}>
              {isSpinning ? 'Крутится...' : 'Крутить'}
            </button>
            {lastDropLabel && (
              <div className="drop-result">
                {lastDrop ? <img src={lastDrop.preview_url} alt={lastDrop.name} /> : <span className="empty-drop">✦</span>}
                <div><span>Результат</span><strong>{lastDropLabel}</strong></div>
              </div>
            )}
            <div className="possible-drops">
              <p className="eyebrow">Возможный дроп</p>
              <div className="drop-grid">
                <div className="possible-drop empty-drop"><span>✦</span><small>Ничего</small></div>
                <div className="possible-drop stars-drop"><span>★</span><small>Stars</small></div>
                {selectedCase.drops.map((gift) => <div className="possible-drop" key={gift.slug}><img src={gift.preview_url} alt={gift.name} /><small>{gift.name}</small></div>)}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'minigames' && (
          <section className="panel">
            <h2>Миниигры</h2>
            <div className="list-box">
              <div className="list-row"><span>🎯 Тир</span><strong>4/5</strong></div>
              <div className="list-row"><span>⚡ Быстрый клик</span><strong>На старте</strong></div>
              <div className="list-row"><span>🧠 Логика</span><strong>Новый</strong></div>
            </div>
          </section>
        )}

        {activeTab === 'inventory' && (
          <section className="panel">
            <h2>Инвентарь</h2>
            <div className="inventory-list">
              {inventory.map((item) => (
                <div key={item.id} className="list-row item-row">
                  <span>{item.item_name}</span>
                  <strong>x{item.quantity}</strong>
                </div>
              ))}
              {!inventory.length && <p className="empty-inventory">Инвентарь пока пуст</p>}
            </div>
          </section>
        )}

        {activeTab === 'rating' && (
          <section className="panel">
            <h2>Рейтинг</h2>
            <div className="rating-list">
              {mockRating.map((entry, index) => (
                <div key={entry.name} className="list-row rating-row">
                  <span>
                    <b>#{index + 1}</b> {entry.name}
                  </span>
                  <strong>{entry.points}</strong>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'profile' && (
          <section className="panel profile-panel">
            {profile?.avatar_url ? (
              <img className="avatar" src={profile.avatar_url} alt="Аватар пользователя" />
            ) : (
              <div className="avatar">{profile?.first_name?.[0] ?? '?'}</div>
            )}
            <h2>{[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Пользователь'}</h2>
            <p>{profile?.username ? `@${profile.username}` : 'Username не указан'}</p>
            <p className="profile-id">ID: {profile?.telegram_id ?? '—'}</p>
            <div className="profile-stats">
              <div>
                <span>Рейтинг</span>
                <strong>{profile?.rating ?? 0}</strong>
              </div>
              <div>
                <span>Баланс</span>
                <strong>{profile?.balance ?? 0}</strong>
              </div>
            </div>
          </section>
        )}
      </main>

      <nav className="bottom-tabbar" aria-label="Основное меню">
        {tabConfig.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              className={`tab-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              type="button"
            >
              <TabIcon tab={tab.key} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="floating-title">{currentLabel}</div>

      {isDepositOpen && (
        <div className="modal-backdrop" onClick={() => setIsDepositOpen(false)}>
          <div className="deposit-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="deposit-title">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">Тестовый режим</p>
                <h3 id="deposit-title">Пополнить баланс</h3>
              </div>
              <button className="modal-close" onClick={() => setIsDepositOpen(false)} type="button" aria-label="Закрыть">×</button>
            </div>
            <label className="deposit-label" htmlFor="deposit-amount">Количество звёзд</label>
            <input
              id="deposit-amount"
              className="deposit-input"
              type="number"
              min="1"
              max="1000000"
              value={depositAmount}
              onChange={(event) => setDepositAmount(event.target.value)}
              placeholder="Например, 100"
              autoFocus
            />
            <button className="primary-button deposit-submit" onClick={handleDeposit} type="button" disabled={isDepositing}>
              {isDepositing ? 'Зачисление...' : 'Подтвердить'}
            </button>
          </div>
        </div>
      )}

      {errorMessage && <div className="error-toast" role="alert">{errorMessage}</div>}
    </div>
  );
}

export default App;
