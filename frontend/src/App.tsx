import { useEffect, useMemo, useState } from 'react';

type TabKey = 'minigames' | 'inventory' | 'cases' | 'rating' | 'profile';

type Profile = {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  balance: number;
  rating: number;
};

type CaseCard = {
  name: string;
  price: number;
  chance: string;
};

const tabConfig: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'minigames', label: 'Миниигры', icon: '🎮' },
  { key: 'inventory', label: 'Инвентарь', icon: '🎒' },
  { key: 'cases', label: 'Кейсы', icon: '📦' },
  { key: 'rating', label: 'Рейтинг', icon: '🏆' },
  { key: 'profile', label: 'Профиль', icon: '👤' },
];

const defaultCases: CaseCard[] = [
  { name: 'Сапфирный кейс', price: 120, chance: '42%' },
  { name: 'Лунный кейс', price: 180, chance: '28%' },
  { name: 'Хромовый кейс', price: 220, chance: '18%' },
  { name: 'Королевский кейс', price: 340, chance: '12%' },
];

const mockInventory = [
  { id: 1, item_name: 'Сапфирный кейс', quantity: 3 },
  { id: 2, item_name: 'Бронзовый меч', quantity: 1 },
  { id: 3, item_name: 'Кристаллическая руна', quantity: 5 },
  { id: 4, item_name: 'Тайный билет', quantity: 2 },
];

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

  useEffect(() => {
    const fetchState = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${apiBaseUrl}/api/state`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setProfile(data.user ?? null);
      } catch {
        setProfile({
          id: 1,
          telegram_id: 123456789,
          username: 'monkey',
          first_name: 'Monkey',
          balance: 2500,
          rating: 1280,
        });
      }
    };

    fetchState();
  }, []);

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
          <div className="balance-pill">
            <span aria-hidden="true">★</span>
            <strong>{profile?.balance ?? 0}</strong>
          </div>
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
        {activeTab === 'cases' && (
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
              {defaultCases.map((item) => (
                <div key={item.name} className="case-card">
                  <div className="case-icon">📦</div>
                  <div className="case-body">
                    <h4>{item.name}</h4>
                    <div className="case-meta">
                      <span>{item.price} ₽</span>
                      <span>{item.chance}</span>
                    </div>
                  </div>
                  <button className="primary-button">Открыть</button>
                </div>
              ))}
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
              {mockInventory.map((item) => (
                <div key={item.id} className="list-row item-row">
                  <span>{item.item_name}</span>
                  <strong>x{item.quantity}</strong>
                </div>
              ))}
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
            <div className="avatar">{profile?.first_name?.[0] ?? 'M'}</div>
            <h2>{profile?.first_name ?? 'Monkey'}</h2>
            <p>@{profile?.username ?? 'monkey'}</p>
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
              <span className="tab-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="floating-title">{currentLabel}</div>
    </div>
  );
}

export default App;
