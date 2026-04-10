'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://researcher-api-bpkt.onrender.com'

type Status = 'idle' | 'waking' | 'planning' | 'researching' | 'writing' | 'evaluating' | 'done' | 'error'

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

function EvalList({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <>
      <div className="eval-list-title">{title}</div>
      <ul className="eval-list">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </>
  )
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
  const wakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

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

    const url = `${API_URL}/api/research/stream?question=${encodeURIComponent(question)}&num_agents=${numAgents}`
    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource

    wakeTimerRef.current = setTimeout(() => {
      setStatus(s => s === 'planning' ? 'waking' : s)
    }, 6000)

    eventSource.onmessage = (e) => {
      if (wakeTimerRef.current) {
        clearTimeout(wakeTimerRef.current)
        wakeTimerRef.current = null
      }
      const data = JSON.parse(e.data)

      if (data.type === 'status') {
        if (data.status) setStatus(data.status)
        if (data.status === 'writing') {
          setAgents(prev => prev.map(a => ({ ...a, status: 'done' })))
        }
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

  const handleCancel = () => {
    if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current)
    eventSourceRef.current?.close()
    eventSourceRef.current = null
    setStatus('idle')
    setAgents([])
    setReport('')
    setEvaluation(null)
  }

  const isLoading = status !== 'idle' && status !== 'done' && status !== 'error'

  return (
    <div className="page">
      <nav className="nav">
        <div className="nav-left">
          <span className="nav-logo">Scout</span>
          <a className="nav-github" href="https://github.com/alexh212" target="_blank" rel="noopener noreferrer">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            alexh212
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 8.5L8.5 1.5M8.5 1.5H3.5M8.5 1.5V6.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
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
          {isLoading && (
            <button onClick={handleCancel} className="cancel-btn">Cancel</button>
          )}
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
            {status === 'waking' && 'Server is waking up, hang tight...'}
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

                    <EvalList title="Strengths" items={evaluation.strengths ?? []} />
                    <EvalList title="Improvements" items={evaluation.improvements ?? []} />
                    <EvalList title="Flags" items={evaluation.flags ?? []} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
