import React, { useEffect, useMemo, useState } from 'react';
import './CommandList.css';
import HttpErrorPage from './HttpErrorPage';

function CommandList() {
    const [commands, setCommands] = useState([]);
    const [meta, setMeta] = useState({ categories: [], tags: [], count: 0 });
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('');
    const [origin, setOrigin] = useState('');
    const [sort, setSort] = useState('downloads');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [httpError, setHttpError] = useState(null);
    const [installHints, setInstallHints] = useState({});

    const fetchJson = async (url, fallbackMessage) => {
        const res = await fetch(url);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const err = new Error(data.message || fallbackMessage);
            err.httpStatus = res.status;
            err.httpDetails = data.details || '';
            throw err;
        }
        return data;
    };

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
        setHttpError(null);

        Promise.all([
            fetchJson(`/api/commands?${searchParams}`, 'Не удалось загрузить команды'),
            fetchJson('/api/meta', 'Не удалось загрузить метаданные'),
        ])
            .then(([catalog, metaInfo]) => {
                if (!mounted) return;
                setCommands(catalog.items || []);
                setMeta(metaInfo || { categories: [], tags: [], count: 0 });
            })
            .catch((err) => {
                if (!mounted) return;
                setError(err.message || 'Ошибка загрузки');
                setHttpError({
                    status: err.httpStatus || 500,
                    message: err.message || 'Ошибка загрузки',
                    details: err.httpDetails || '',
                });
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
            const data = await fetchJson(`/api/commands/${slug}/install`, 'Не удалось получить install-инструкцию');
            setInstallHints((prev) => ({ ...prev, [slug]: data }));
            await fetch(`/api/commands/${slug}/install-track`, { method: 'POST' });
        } catch (err) {
            setHttpError({
                status: err.httpStatus || 500,
                message: err.message || 'Ошибка установки',
                details: err.httpDetails || `Команда: ${slug}`,
            });
            setInstallHints((prev) => ({
                ...prev,
                [slug]: { error: err.message || 'Ошибка установки' },
            }));
        }
    };

    const retryCatalog = () => {
        window.location.reload();
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
            {!loading && error && !httpError && <div className="state-box error">{error}</div>}

            {!loading && httpError && (
                <HttpErrorPage
                    status={httpError.status}
                    title="Ошибка доступа к каталогу NE-DOS Store"
                    message={httpError.message}
                    details={httpError.details}
                    onRetry={retryCatalog}
                />
            )}

            {!loading && !error && !httpError && (
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
                                    <a href={`/api/commands/${command.slug}/source`} target="_blank" rel="noreferrer" title="Открыть исходный код команды">Исходник</a>
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
