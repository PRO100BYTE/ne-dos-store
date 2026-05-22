import React, { useEffect, useMemo, useState } from 'react';
import './CommandList.css';

function CommandList() {
    const [commands, setCommands] = useState([]);
    const [meta, setMeta] = useState({ categories: [], tags: [], count: 0 });
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('');
    const [origin, setOrigin] = useState('');
    const [sort, setSort] = useState('downloads');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [installHints, setInstallHints] = useState({});

    const searchParams = useMemo(() => {
        const params = new URLSearchParams();
        if (query.trim()) params.set('query', query.trim());
        if (category) params.set('category', category);
        if (origin) params.set('origin', origin);
        params.set('sort', sort);
        return params.toString();
    }, [query, category, origin, sort]);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError('');

        Promise.all([
            fetch(`/api/commands?${searchParams}`).then((res) => {
                if (!res.ok) throw new Error('Не удалось загрузить команды');
                return res.json();
            }),
            fetch('/api/meta').then((res) => {
                if (!res.ok) throw new Error('Не удалось загрузить метаданные');
                return res.json();
            }),
        ])
            .then(([catalog, metaInfo]) => {
                if (!mounted) return;
                setCommands(catalog.items || []);
                setMeta(metaInfo || { categories: [], tags: [], count: 0 });
            })
            .catch((err) => {
                if (!mounted) return;
                setError(err.message || 'Ошибка загрузки');
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [searchParams]);

    const handleInstall = async (slug) => {
        try {
            const res = await fetch(`/api/commands/${slug}/install`);
            if (!res.ok) throw new Error('Не удалось получить install-инструкцию');
            const data = await res.json();
            setInstallHints((prev) => ({ ...prev, [slug]: data }));
            await fetch(`/api/commands/${slug}/install-track`, { method: 'POST' });
        } catch (err) {
            setInstallHints((prev) => ({
                ...prev,
                [slug]: { error: err.message || 'Ошибка установки' },
            }));
        }
    };

  return (
        <section className="store-section">
            <div className="toolbar">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Поиск команд: weather, files, fun..."
                />
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">Все категории</option>
                    {(meta.categories || []).map((item) => (
                        <option key={item} value={item}>{item}</option>
                    ))}
                </select>
                <select value={origin} onChange={(e) => setOrigin(e.target.value)}>
                    <option value="">Все источники</option>
                    {(meta.origins || []).map((item) => (
                        <option key={item} value={item}>{item}</option>
                    ))}
                </select>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                    <option value="downloads">Сначала популярные</option>
                    <option value="rating">Сначала рейтинг</option>
                    <option value="newest">Сначала новые версии</option>
                    <option value="name">По имени</option>
                    <option value="origin">По источнику</option>
                </select>
            </div>

            <div className="meta-row">
                <span>Команд в реестре: {meta.count || commands.length}</span>
                <span>Найдено: {commands.length}</span>
            </div>

            {loading && <div className="state-box">Загрузка каталога...</div>}
            {!loading && error && <div className="state-box error">{error}</div>}

            {!loading && !error && (
                <div className="CommandList">
                    {commands.map((command) => {
                        const hint = installHints[command.slug];
                        return (
                            <article className="command" key={command.slug}>
                                <div className="top-row">
                                    <h3>{command.name}</h3>
                                    {command.verified && <span className="badge verified">verified</span>}
                                </div>
                                <p>{command.description}</p>
                                <div className="stats">
                                    <span>v{command.version}</span>
                                    <span>⭐ {command.rating}</span>
                                    <span>⬇ {command.downloads.toLocaleString('ru-RU')}</span>
                                    <span>origin: {command.origin}</span>
                                </div>
                                <div className="tags">
                                    {(command.tags || []).map((tag) => (
                                        <span key={tag} className="badge">#{tag}</span>
                                    ))}
                                </div>

                                <div className="install-actions">
                                    <button onClick={() => handleInstall(command.slug)}>Установить</button>
                                    <a href={command.sourceUrl} target="_blank" rel="noreferrer">Исходник</a>
                                </div>

                                <code>store install {command.slug}</code>

                                {hint?.installSnippet && (
                                    <div className="hint-box">
                                        <div>Команда:</div>
                                        <code>{hint.installSnippet}</code>
                                        <div>SHA-256:</div>
                                        <code>{hint.sha256 || 'not available'}</code>
                                        <div>Verification:</div>
                                        <code>{hint.verification || 'unknown'}</code>
                                        <div>Manual fallback:</div>
                                        <code>{hint.manualSnippet}</code>
                                    </div>
                                )}

                                {hint?.error && <div className="hint-box error">{hint.error}</div>}
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
  );
}

export default CommandList;
