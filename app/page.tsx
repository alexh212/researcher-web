'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

const API_URL = process.env.NEXT_PUBLIC_API_URL

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
