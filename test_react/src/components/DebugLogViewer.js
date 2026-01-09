import React, { useState, useEffect, useRef } from 'react';
import './DebugLogViewer.css';

function DebugLogViewer() {
  const [logs, setLogs] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const logContainerRef = useRef(null);

  useEffect(() => {
    // Intercept console.log
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const captureLog = (type, ...args) => {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');

      setLogs(prev => [...prev, { type, message, timestamp }]);
    };

    console.log = (...args) => {
      originalLog(...args);
      captureLog('log', ...args);
    };

    console.error = (...args) => {
      originalError(...args);
      captureLog('error', ...args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      captureLog('warn', ...args);
    };

    // Cleanup
    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logContainerRef.current && !isCollapsed) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isCollapsed]);

  const handleCopy = () => {
    const logText = logs.map(log => {
      return `[${log.timestamp}] ${log.message}`;
    }).join('\n');

    navigator.clipboard.writeText(logText).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }).catch(err => {
      console.error('Failed to copy logs:', err);
    });
  };

  const handleClear = () => {
    setLogs([]);
  };

  const handleDownload = () => {
    const logText = logs.map(log => {
      return `[${log.timestamp}] ${log.message}`;
    }).join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`debug-log-viewer ${isCollapsed ? 'collapsed' : 'expanded'}`}>
      <div className="log-header">
        <div className="log-title">
          <span className="log-icon">🔍</span>
          <span className="log-text">Debug Logs</span>
          <span className="log-count">{logs.length}</span>
        </div>
        <div className="log-actions">
          {!isCollapsed && (
            <>
              <button
                onClick={handleCopy}
                className="log-button copy-button"
                title="Copy logs to clipboard"
              >
                {copySuccess ? '✅ Copied!' : '📋 Copy'}
              </button>
              <button
                onClick={handleDownload}
                className="log-button download-button"
                title="Download logs as file"
              >
                💾 Download
              </button>
              <button
                onClick={handleClear}
                className="log-button clear-button"
                title="Clear all logs"
              >
                🗑️ Clear
              </button>
            </>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="log-button toggle-button"
            title={isCollapsed ? 'Expand logs' : 'Collapse logs'}
          >
            {isCollapsed ? '▲ Expand' : '▼ Collapse'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="log-content" ref={logContainerRef}>
          {logs.length === 0 ? (
            <div className="log-empty">
              No logs yet. Perform an extraction to see debug logs.
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className={`log-entry log-${log.type}`}>
                <span className="log-timestamp">[{log.timestamp}]</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))
          )}
        </div>
      )}

      {!isCollapsed && logs.length > 0 && (
        <div className="log-footer">
          <div className="log-info">
            Total: {logs.length} log entries
          </div>
          <div className="log-hint">
            💡 Click "Copy" to copy all logs, then paste them to share
          </div>
        </div>
      )}
    </div>
  );
}

export default DebugLogViewer;
