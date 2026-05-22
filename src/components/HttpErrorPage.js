import React from 'react';
import './HttpErrorPage.css';

function HttpErrorPage({ status, title, message, details, onRetry }) {
  return (
    <section className="http-error-page" role="alert">
      <div className="http-error-glow" />
      <div className="http-error-content">
        <div className="http-error-code">{status || 'HTTP'}</div>
        <h2>{title || 'Ошибка сети'}</h2>
        <p>{message || 'Сервис временно недоступен.'}</p>
        {details && <pre>{details}</pre>}
        {typeof onRetry === 'function' && (
          <button type="button" onClick={onRetry}>Повторить запрос</button>
        )}
      </div>
    </section>
  );
}

export default HttpErrorPage;