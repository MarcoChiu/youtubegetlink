import React, { useState, useEffect } from 'react';
import { getCustomProxy, setCustomProxy, testProxyConnection } from '../utils/youtubeScraper';

export default function ProxyModal({ isOpen, onClose, onSaved }) {
  const [proxyUrl, setProxyUrl] = useState('');
  const [testResult, setTestResult] = useState(null); // { success: boolean, latency?: number, message: string }
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProxyUrl(getCustomProxy());
      setTestResult(null);
      setTesting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setCustomProxy(proxyUrl);
    if (onSaved) onSaved(proxyUrl.trim());
    onClose();
  };

  const handleClear = () => {
    setProxyUrl('');
    setCustomProxy('');
    setTestResult(null);
    if (onSaved) onSaved('');
  };

  const handleTest = async () => {
    if (!proxyUrl.trim()) {
      setTestResult({ success: false, message: '請先輸入 Worker 網址' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    const res = await testProxyConnection(proxyUrl);
    setTesting(false);
    setTestResult(res);
  };

  const workerCode = `// Cloudflare Worker CORS 代理通用轉發腳本
const ALLOWED_ORIGINS = [
  'https://marcochiu.github.io',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:3005',
  'http://localhost:3006'
];

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin');
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return new Response('Forbidden: Unauthorized origin', { status: 403 });
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response('Missing ?url= parameter', { status: 400, headers: corsHeaders });
    }

    try {
      const modifiedHeaders = new Headers(request.headers);
      modifiedHeaders.delete('origin');
      modifiedHeaders.delete('referer');
      modifiedHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      const response = await fetch(targetUrl, {
        method: request.method,
        headers: modifiedHeaders,
        redirect: 'follow'
      });

      const newHeaders = new Headers(response.headers);
      Object.keys(corsHeaders).forEach(key => newHeaders.set(key, corsHeaders[key]));
      newHeaders.delete('content-security-policy');
      newHeaders.delete('content-security-policy-report-only');
      newHeaders.delete('clear-site-data');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    } catch (err) {
      return new Response(\`Proxy Error: \${err.message}\`, { status: 500, headers: corsHeaders });
    }
  }
};`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(workerCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isConfigured = Boolean(getCustomProxy());

  return (
    <div className="proxy-modal-backdrop" onClick={onClose}>
      <div className="proxy-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="proxy-modal-header">
          <div className="proxy-modal-title-group">
            <span className="proxy-modal-icon">⚡</span>
            <div>
              <h3>專屬 Cloudflare Worker 代理設定</h3>
              <p className="proxy-modal-desc">克服 YouTube 跨域限制，享受毫秒級極速穩定的清單擷取</p>
            </div>
          </div>
          <button className="proxy-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Status Indicator */}
        <div className={`proxy-status-badge ${isConfigured ? 'active' : 'inactive'}`}>
          <span className="status-dot"></span>
          <span>
            {isConfigured 
              ? `目前狀態：專屬代理已啟用 (${getCustomProxy().replace(/^https?:\/\//, '')})`
              : '目前狀態：未設定專屬代理（將依賴公共代理 AllOrigins / CorsProxy）'}
          </span>
        </div>

        {/* Input Form */}
        <div className="proxy-form-group">
          <label className="proxy-label">Worker 代理網址 (URL)</label>
          <div className="proxy-input-row">
            <input
              type="text"
              className="proxy-input"
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              placeholder="https://my-proxy.xxxx.workers.dev"
            />
            <button
              type="button"
              className="proxy-test-btn"
              onClick={handleTest}
              disabled={testing || !proxyUrl.trim()}
            >
              {testing ? '測試中...' : '測試連線 (Ping)'}
            </button>
          </div>

          {testResult && (
            <div className={`proxy-test-result ${testResult.success ? 'success' : 'error'}`}>
              <span>{testResult.success ? '✓' : '✗'}</span>
              <span>{testResult.message}</span>
            </div>
          )}
          <small className="proxy-hint">
            💡 網址僅儲存於您本機瀏覽器的 localStorage，絕對不會上傳至任何伺服器或程式碼庫中。
          </small>
        </div>

        {/* Tutorial Accordion */}
        <div className="proxy-tutorial-section">
          <button
            type="button"
            className="proxy-tutorial-toggle"
            onClick={() => setShowTutorial(!showTutorial)}
          >
            <span>{showTutorial ? '▼ 收起 Cloudflare Worker 設定教學' : '▶ 查看 Cloudflare Worker 4 步驟部署教學'}</span>
            <span className="tag-free">完全免費</span>
          </button>

          {showTutorial && (
            <div className="proxy-tutorial-content">
              <ol className="proxy-steps-list">
                <li>
                  <strong>登入 Cloudflare Dashboard</strong>：前往{' '}
                  <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer">
                    dash.cloudflare.com
                  </a>
                  ，點擊左側 <b>Workers & Pages</b> &gt; <b>Overview</b>。
                </li>
                <li>
                  <strong>建立 Worker</strong>：點選 <b>Create application</b> &gt; <b>Create Worker</b>，取名後點擊 <b>Deploy</b>。
                </li>
                <li>
                  <strong>貼上轉發程式碼</strong>：進入該 Worker 的 <b>Edit code</b>，將右側預設內容全部清空，貼上下方提供的專屬程式碼，點擊 <b>Deploy</b> 儲存。
                </li>
                <li>
                  <strong>複製網址並填入</strong>：複製該 Worker 的網址（例如 <code>https://xxx.workers.dev</code>）填入上方輸入框並按儲存即可！
                </li>
              </ol>

              <div className="proxy-code-box">
                <div className="proxy-code-header">
                  <span>Worker 轉發程式碼 (已包含來源白名單防護)</span>
                  <button type="button" className="proxy-copy-code-btn" onClick={handleCopyCode}>
                    {copied ? '✓ 已複製' : '📋 一鍵複製程式碼'}
                  </button>
                </div>
                <pre className="proxy-code-pre">
                  <code>{workerCode}</code>
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="proxy-modal-footer">
          {isConfigured && (
            <button type="button" className="proxy-btn-clear" onClick={handleClear}>
              清除專屬代理 (還原預設)
            </button>
          )}
          <div className="proxy-footer-right">
            <button type="button" className="proxy-btn-cancel" onClick={onClose}>
              取消
            </button>
            <button type="button" className="proxy-btn-save" onClick={handleSave}>
              儲存代理設定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
