'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

type Status = 'idle' | 'planning' | 'researching' | 'writing' | 'evaluating' | 'done' | 'error'

interface AgentStatus {
  id: number
  question: string
  status: 'waiting' | 'running' | 'done'
}

interface EvaluationData {
  scores?: {
    relevance?: number
    accuracy?: number
    source_coverage?: number
    coherence?: number
    completeness?: number
  }
  overall_score?: number
  strengths?: string[]
  improvements?: string[]
  flags?: string[]
}

export default function Home() {
  const [question, setQuestion] = useState('')
  const [numAgents, setNumAgents] = useState(4)
  const [status, setStatus] = useState<Status>('idle')
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [report, setReport] = useState('')
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null)
  const [evalOpen, setEvalOpen] = useState(false)
  const [error, setError] = useState('')
  const reportRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const getScoreClass = (value?: number) => {
    if (typeof value !== 'number') return 'neutral'
    if (value <= 2) return 'low'
    if (value === 3) return 'medium'
    return 'high'
  }

  const handleResearch = async () => {
    if (!question.trim()) return
    if (status !== 'idle' && status !== 'done' && status !== 'error') return

    setStatus('planning')
    setAgents([])
    setReport('')
    setEvaluation(null)
    setError('')

    const url = `https://researcher-api-bpkt.onrender.com/api/research/stream?question=${encodeURIComponent(question)}&num_agents=${numAgents}`
    const eventSource = new EventSource(url)

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data)

      if (data.type === 'status') {
        if (data.message.includes('Planning')) setStatus('planning')
        if (data.message.includes('Researching') || data.message.includes('cached')) setStatus('researching')
        if (data.message.includes('Writing')) setStatus('writing')
        if (data.message.includes('Evaluating')) setStatus('evaluating')
      }

      if (data.type === 'sub_questions') {
        setAgents(data.data.map((q: string, i: number) => ({
          id: i,
          question: q,
          status: 'waiting'
        })))
        setTimeout(() => {
          setAgents(prev => prev.map(a => ({ ...a, status: 'running' })))
        }, 300)
      }

      if (data.type === 'research_complete') {
        setAgents(prev => prev.map(a => ({ ...a, status: 'done' })))
      }

      if (data.type === 'report_chunk') {
        setReport(prev => prev + data.chunk)
      }

      if (data.type === 'evaluation') {
        setEvaluation(data.data)
      }

      if (data.type === 'done') {
        setStatus('done')
        eventSource.close()
        setTimeout(() => {
          reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
      }

      if (data.type === 'error') {
        setError(data.message)
        setStatus('error')
        eventSource.close()
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
    }
  }

  const isLoading = status !== 'idle' && status !== 'done' && status !== 'error'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0a0a0a;
          color: #ededed;
          font-family: 'Inter', -apple-system, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .page { min-height: 100vh; display: flex; flex-direction: column; }

        .nav {
          border-bottom: 1px solid #1a1a1a;
          padding: 0 32px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .nav-logo { font-size: 15px; font-weight: 600; color: #ededed; letter-spacing: -0.3px; }

        .nav-left { display: flex; align-items: center; gap: 12px; }

        .nav-github {
          font-size: 13px; color: #888; text-decoration: none;
          display: flex; align-items: center; gap: 5px;
          transition: color 0.15s ease;
        }
        .nav-github:hover { color: #ededed; }
        .nav-github svg { width: 14px; height: 14px; flex-shrink: 0; }

        .nav-badge {
          font-size: 11px; color: #666; background: #161616;
          border: 1px solid #222; border-radius: 20px; padding: 3px 10px;
        }

        .hero { padding: 80px 32px 48px; max-width: 720px; margin: 0 auto; width: 100%; }

        .hero-title {
          font-size: 40px; font-weight: 600; letter-spacing: -1.2px;
          line-height: 1.1; color: #ededed; margin-bottom: 12px;
        }

        .hero-sub { font-size: 15px; color: #666; line-height: 1.6; margin-bottom: 40px; }

        .search-wrap { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }

        .search-input {
          flex: 1; height: 44px; background: #111; border: 1px solid #222;
          border-radius: 10px; padding: 0 16px; font-size: 14px;
          font-family: 'Inter', sans-serif; color: #ededed; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .search-input::placeholder { color: #444; }
        .search-input:focus { border-color: #333; box-shadow: 0 0 0 3px rgba(255,255,255,0.04); }
        .search-input:disabled { opacity: 0.5; }

        .search-btn {
          height: 44px; padding: 0 20px; background: #ededed; color: #0a0a0a;
          border: none; border-radius: 10px; font-size: 13px; font-weight: 600;
          font-family: 'Inter', sans-serif; cursor: pointer;
          transition: background 0.15s, opacity 0.15s; white-space: nowrap;
        }

        .search-btn:hover:not(:disabled) { background: #d4d4d4; }
        .search-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        .agent-selector { display: flex; align-items: center; gap: 8px; }
        .agent-selector-label { font-size: 12px; color: #555; }

        .agent-btn {
          height: 28px; width: 36px; border-radius: 6px; font-size: 12px;
          font-family: 'Inter', sans-serif; cursor: pointer; transition: all 0.15s;
          border: 1px solid #222; background: #111; color: #555;
        }

        .agent-btn:disabled { cursor: not-allowed; opacity: 0.5; }
        .agent-btn.active { background: #ededed; color: #0a0a0a; border-color: #ededed; font-weight: 600; }

        .content { max-width: 720px; margin: 0 auto; width: 100%; padding: 0 32px 80px; }

        .status-row {
          display: flex; align-items: center; gap: 8px; font-size: 13px; color: #888;
          margin-bottom: 20px; padding: 12px 0; border-bottom: 1px solid #161616;
        }

        .spinner {
          width: 14px; height: 14px; border: 1.5px solid #333; border-top-color: #888;
          border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .check {
          width: 14px; height: 14px; background: #1a3a2a; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 8px; color: #4ade80; flex-shrink: 0;
        }

        .agents {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 32px;
        }

        .agent {
          background: #111;
          border: 1px solid #1a1a1a;
          border-radius: 10px;
          padding: 14px 16px;
          transition: border-color 0.2s, background 0.2s;
        }

        .agent.running { border-color: #1e3a5f; background: #0d1e2e; }
        .agent.done { border-color: #1a3a2a; background: #0d1f16; }

        .agent-header { display: flex; align-items: center; gap: 7px; margin-bottom: 8px; }

        .agent-indicator { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

        .agent.waiting .agent-indicator { background: #333; }
        .agent.running .agent-indicator { background: #3b82f6; animation: pulse 1.2s ease-in-out infinite; }
        .agent.done .agent-indicator { background: #4ade80; }

        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

        .agent-tag { font-size: 11px; font-weight: 500; }
        .agent.waiting .agent-tag { color: #444; }
        .agent.running .agent-tag { color: #3b82f6; }
        .agent.done .agent-tag { color: #4ade80; }

        .agent-text { font-size: 12px; color: #555; line-height: 1.5; }
        .agent.running .agent-text { color: #888; }

        .report-wrap { animation: fadeIn 0.3s ease; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .report-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 28px; padding-bottom: 16px; border-bottom: 1px solid #1a1a1a;
        }

        .report-tag { font-size: 11px; font-weight: 500; color: #555; letter-spacing: 0.05em; text-transform: uppercase; }
        .report-status { font-size: 11px; color: #4ade80; }

        .prose { font-size: 15px; line-height: 1.8; color: #b0b0b0; }

        .prose h1 {
          font-size: 26px; font-weight: 600; color: #ededed; letter-spacing: -0.6px;
          line-height: 1.25; margin-bottom: 20px; margin-top: 0;
        }

        .prose h2 {
          font-size: 13px; font-weight: 600; color: #ededed;
          margin-top: 36px; margin-bottom: 12px; padding-top: 24px; border-top: 1px solid #1a1a1a;
        }

        .prose h3 { font-size: 14px; font-weight: 500; color: #ccc; margin-top: 24px; margin-bottom: 10px; }
        .prose p { margin-bottom: 16px; }

        .prose a {
          color: #888; text-decoration: underline; text-decoration-color: #333;
          text-underline-offset: 3px; transition: color 0.15s;
        }

        .prose a:hover { color: #ededed; }
        .prose strong { color: #ededed; font-weight: 500; }
        .prose ul, .prose ol { padding-left: 20px; margin-bottom: 16px; }
        .prose li { margin-bottom: 6px; }

        .cursor {
          display: inline-block; width: 2px; height: 15px; background: #ededed;
          margin-left: 1px; vertical-align: text-bottom; animation: blink 1s step-end infinite;
        }

        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

        .error {
          background: #1a0a0a; border: 1px solid #3a1a1a; border-radius: 10px;
          padding: 16px; font-size: 13px; color: #f87171;
        }

        .evaluation-wrap {
          margin-top: 24px;
          background: #101010;
          border: 1px solid #1d1d1d;
          border-radius: 12px;
          padding: 18px;
        }

        .eval-toggle {
          display: flex; align-items: center; justify-content: space-between;
          background: none; border: none; width: 100%; padding: 0; cursor: pointer;
          margin-bottom: 0;
        }

        .evaluation-title {
          font-size: 13px;
          font-weight: 600;
          color: #ededed;
        }

        .eval-chevron { font-size: 12px; color: #555; transition: transform 0.2s; }
        .eval-chevron.open { transform: rotate(180deg); }

        .eval-body { margin-top: 14px; }

        .evaluation-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 14px;
        }

        .score-chip {
          background: #151515;
          border: 1px solid #232323;
          border-radius: 8px;
          padding: 10px;
        }

        .score-chip.low {
          border-color: #4a1d1d;
          background: #1c1111;
        }

        .score-chip.medium {
          border-color: #4a3a1d;
          background: #1d1710;
        }

        .score-chip.high {
          border-color: #1f4a2b;
          background: #102015;
        }

        .score-chip-label {
          font-size: 11px;
          color: #777;
          text-transform: capitalize;
          margin-bottom: 4px;
        }

        .score-chip-value {
          font-size: 14px;
          color: #ededed;
          font-weight: 600;
        }

        .score-chip-value.low { color: #fca5a5; }
        .score-chip-value.medium { color: #fcd34d; }
        .score-chip-value.high { color: #86efac; }

        .overall-score {
          font-size: 12px;
          color: #9ca3af;
          margin-bottom: 14px;
        }

        .overall-score.low { color: #fca5a5; }
        .overall-score.medium { color: #fcd34d; }
        .overall-score.high { color: #86efac; }

        .eval-list-title {
          font-size: 12px;
          color: #cfcfcf;
          margin: 10px 0 6px;
          font-weight: 500;
        }

        .eval-list {
          margin: 0;
          padding-left: 18px;
          color: #9a9a9a;
          font-size: 12px;
          line-height: 1.6;
        }
      `}</style>

      <div className="page">
        <nav className="nav">
          <div className="nav-left">
            <span className="nav-logo">Scout</span>
            <a className="nav-github" href="https://github.com/alexh212" target="_blank" rel="noopener noreferrer">
              github.com/alexh212
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 11.5L11.5 4.5M11.5 4.5H6M11.5 4.5V10" />
              </svg>
            </a>
          </div>
          <span className="nav-badge">Multi-agent</span>
        </nav>

        <div className="hero">
          <h1 className="hero-title">Research anything,<br />instantly.</h1>
          <p className="hero-sub">Ask a question. Multiple AI agents search the web in parallel and synthesize a comprehensive report.</p>

          <div className="search-wrap">
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleResearch()}
              placeholder="What do you want to research?"
              className="search-input"
              disabled={isLoading}
            />
            <button onClick={handleResearch} disabled={isLoading} className="search-btn">
              {isLoading ? 'Researching...' : 'Research'}
            </button>
          </div>

          <div className="agent-selector">
            <span className="agent-selector-label">Agents:</span>
            {[2, 3, 4, 6, 12].map(n => (
              <button
                key={n}
                onClick={() => setNumAgents(n)}
                disabled={isLoading}
                className={`agent-btn ${numAgents === n ? 'active' : ''}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="content">
          {status !== 'idle' && (
            <div className="status-row">
              {isLoading ? <div className="spinner" /> : <div className="check">✓</div>}
              {status === 'planning' && 'Breaking down your question...'}
              {status === 'researching' && 'Running agents in parallel...'}
              {status === 'writing' && 'Synthesizing report...'}
              {status === 'evaluating' && 'Evaluating report quality...'}
              {status === 'done' && 'Research complete'}
              {status === 'error' && 'Something went wrong'}
            </div>
          )}

          {agents.length > 0 && (
            <div className="agents">
              {agents.map(agent => (
                <div key={agent.id} className={`agent ${agent.status}`}>
                  <div className="agent-header">
                    <div className="agent-indicator" />
                    <span className="agent-tag">
                      {agent.status === 'waiting' && 'Queued'}
                      {agent.status === 'running' && `Agent ${agent.id + 1}`}
                      {agent.status === 'done' && `Agent ${agent.id + 1} — Done`}
                    </span>
                  </div>
                  <div className="agent-text">{agent.question}</div>
                </div>
              ))}
            </div>
          )}

          {error && <div className="error">{error}</div>}

          {report && (
            <div className="report-wrap" ref={reportRef}>
              <div className="report-header">
                <span className="report-tag">Report</span>
                {status === 'done' && <span className="report-status">✓ Complete</span>}
              </div>
              <div className="prose">
                <ReactMarkdown>{report}</ReactMarkdown>
                {status === 'writing' && <span className="cursor" />}
              </div>

              {evaluation && (
                <div className="evaluation-wrap">
                  <button className="eval-toggle" onClick={() => setEvalOpen(o => !o)}>
                    <span className="evaluation-title">Quality Evaluation</span>
                    <span className={`eval-chevron ${evalOpen ? 'open' : ''}`}>▾</span>
                  </button>

                  {evalOpen && (
                    <div className="eval-body">
                      <div className={`overall-score ${getScoreClass(evaluation.overall_score)}`}>
                        Overall score: {evaluation.overall_score ?? '-'} / 5
                      </div>

                      {evaluation.scores && (
                        <div className="evaluation-grid">
                          {Object.entries(evaluation.scores).map(([key, value]) => (
                            <div className={`score-chip ${getScoreClass(value)}`} key={key}>
                              <div className="score-chip-label">{key.replace('_', ' ')}</div>
                              <div className={`score-chip-value ${getScoreClass(value)}`}>{value ?? '-'} / 5</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {evaluation.strengths && evaluation.strengths.length > 0 && (
                        <>
                          <div className="eval-list-title">Strengths</div>
                          <ul className="eval-list">
                            {evaluation.strengths.map((item, i) => (
                              <li key={`s-${i}`}>{item}</li>
                            ))}
                          </ul>
                        </>
                      )}

                      {evaluation.improvements && evaluation.improvements.length > 0 && (
                        <>
                          <div className="eval-list-title">Improvements</div>
                          <ul className="eval-list">
                            {evaluation.improvements.map((item, i) => (
                              <li key={`i-${i}`}>{item}</li>
                            ))}
                          </ul>
                        </>
                      )}

                      {evaluation.flags && evaluation.flags.length > 0 && (
                        <>
                          <div className="eval-list-title">Flags</div>
                          <ul className="eval-list">
                            {evaluation.flags.map((item, i) => (
                              <li key={`f-${i}`}>{item}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}