import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, ChevronRight, Activity, GitBranch, Search, Compass } from 'lucide-react';
import useStore from '../../store/useStore';

export default function AlgoPanel({ visible }) {
  const { routes, metrics } = useStore();

  const [selectedAlgo, setSelectedAlgo] = useState('dijkstra');
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const intervalRef = useRef(null);

  // Get algorithm results from routes data
  const algoData = routes?.algorithms || null;
  const currentAlgoSteps = algoData?.[selectedAlgo]?.steps || [];

  // Reset step when switching algorithm
  useEffect(() => {
    setStep(0);
    setPlaying(false);
    clearInterval(intervalRef.current);
  }, [selectedAlgo]);

  // Playback engine — uses local React state, NOT Zustand
  useEffect(() => {
    if (playing && currentAlgoSteps.length > 0) {
      intervalRef.current = setInterval(() => {
        setStep(prev => {
          if (prev >= currentAlgoSteps.length - 1) {
            setPlaying(false);
            clearInterval(intervalRef.current);
            return prev;
          }
          return prev + 1;
        });
      }, 80);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, currentAlgoSteps.length]);

  if (!visible) return null;

  // No route computed yet
  if (!routes || !algoData) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🧠</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
          No algorithm data yet
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
          Select a hospital and click "Get Emergency Route" to run all 5 algorithms.
        </div>
      </div>
    );
  }

  // Count step types UP TO current step
  const stepsUpToCurrent = currentAlgoSteps.slice(0, step + 1);
  const visitedCount = stepsUpToCurrent.filter(s => s.type === 'visit').length;
  const relaxedCount = stepsUpToCurrent.filter(s => s.type === 'relax').length;
  const prunedCount = stepsUpToCurrent.filter(s => s.type === 'skip' || s.type === 'backtrack').length;

  const stepColor = (type) => {
    switch (type) {
      case 'visit': return '#3b82f6';
      case 'relax': return '#10b981';
      case 'skip': return '#dc2626';
      case 'backtrack': return '#f59e0b';
      default: return '#9ca3af';
    }
  };

  const stepIcon = (type) => {
    switch (type) {
      case 'visit': return '🔍';
      case 'relax': return '✅';
      case 'skip': return '✂️';
      case 'backtrack': return '↩️';
      default: return '•';
    }
  };

  const stepText = (s) => {
    if (s.type === 'visit') return `Visiting node ${s.node?.slice(-6) || '?'} (cost: ${s.cost != null ? Math.round(s.cost) + 'm' : '?'})`;
    if (s.type === 'relax') return `Relaxed edge → ${s.to?.slice(-6) || s.node?.slice(-6) || '?'} ${s.cost != null ? '(new cost: ' + Math.round(s.cost) + 'm)' : ''}`;
    if (s.type === 'skip') return `Pruned ${s.to?.slice(-6) || s.node?.slice(-6) || '?'} ${s.reason ? `(${s.reason})` : '(not optimal)'}`;
    if (s.type === 'backtrack') return `Backtracked from ${s.node?.slice(-6) || '?'}`;
    return `Step: ${s.type}`;
  };

  // Algorithm config
  const algos = [
    { key: 'dijkstra', label: 'Dijkstra', desc: 'Finds shortest path using greedy selection of minimum-cost unvisited node. Guarantees optimal path.' },
    { key: 'astar', label: 'A*', desc: 'Uses heuristic (Haversine distance to goal) to guide search. Explores fewer nodes than Dijkstra.' },
    { key: 'bfs', label: 'BFS', desc: 'Explores all nodes at current depth before moving deeper. Finds shortest path by number of edges.' },
    { key: 'dfs', label: 'DFS', desc: 'Explores as deep as possible before backtracking. May not find shortest path but explores fast.' },
    { key: 'branchAndBound', label: 'B&B', desc: 'Uses Dijkstra cost as upper bound. Prunes any path exceeding the known best.' },
  ];

  const currentAlgoInfo = algos.find(a => a.key === selectedAlgo);
  const currentData = algoData[selectedAlgo];
  const progress = currentAlgoSteps.length > 0 ? ((step + 1) / currentAlgoSteps.length) * 100 : 0;

  // Visible log entries (window around current step)
  const logStart = Math.max(0, step - 5);
  const logEnd = step + 1;
  const visibleLog = currentAlgoSteps.slice(logStart, logEnd);

  return (
    <div style={{ paddingBottom: 16 }}>
      {/* Algorithm selector buttons */}
      <div className="section-title">🧠 Select Algorithm</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
        {algos.map(a => {
          const isActive = selectedAlgo === a.key;
          const data = algoData[a.key];
          return (
            <button
              key={a.key}
              onClick={() => setSelectedAlgo(a.key)}
              style={{
                padding: '7px 12px', borderRadius: 8,
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                background: isActive ? 'rgba(59,130,246,0.15)' : 'var(--bg-glass)',
                color: isActive ? '#3b82f6' : 'var(--text-muted)',
                border: `1.5px solid ${isActive ? 'rgba(59,130,246,0.5)' : 'var(--border-glass)'}`,
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {a.label}
              <span style={{
                fontSize: 9, color: isActive ? '#3b82f6' : 'var(--text-muted)',
                opacity: 0.7,
              }}>
                ({data?.steps?.length || 0})
              </span>
            </button>
          );
        })}
      </div>

      {/* Algorithm description */}
      <div style={{
        background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)',
        borderRadius: 8, padding: '8px 10px', marginBottom: 12,
        fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5,
      }}>
        <strong style={{ color: '#3b82f6' }}>{currentAlgoInfo?.label}:</strong>{' '}
        {currentAlgoInfo?.desc}
      </div>

      {/* Live counters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10, padding: '10px 6px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6', fontFamily: 'Rajdhani, sans-serif' }}>{visitedCount}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1 }}>VISITED</div>
        </div>
        <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, padding: '10px 6px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#10b981', fontFamily: 'Rajdhani, sans-serif' }}>{relaxedCount}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1 }}>RELAXED</div>
        </div>
        <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 10, padding: '10px 6px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#dc2626', fontFamily: 'Rajdhani, sans-serif' }}>{prunedCount}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1 }}>PRUNED</div>
        </div>
      </div>

      {/* Playback controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <button
          onClick={() => { setStep(0); setPlaying(false); }}
          title="Reset"
          style={{
            background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
            borderRadius: 8, padding: '8px 10px', cursor: 'pointer',
            color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
          }}
        >
          <RotateCcw size={14} />
        </button>
        <button
          onClick={() => setPlaying(!playing)}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '10px', borderRadius: 10, border: 'none',
            background: playing ? 'rgba(220,38,38,0.1)' : 'rgba(59,130,246,0.1)',
            color: playing ? '#dc2626' : '#3b82f6',
            border: `1.5px solid ${playing ? 'rgba(220,38,38,0.3)' : 'rgba(59,130,246,0.3)'}`,
            fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}
        >
          {playing ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Play Visualization</>}
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 12 }}>
        <div className="progress-bar">
          <div className="progress-fill" style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            transition: 'width 0.08s linear',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--text-muted)' }}>
          <span>Step {step + 1} of {currentAlgoSteps.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Live exploration log */}
      <div style={{ marginBottom: 14 }}>
        <div className="section-title">📋 Exploration Log</div>
        <div style={{ maxHeight: 170, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {visibleLog.map((s, i) => {
            const globalIdx = logStart + i;
            const isCurrent = globalIdx === step;
            return (
              <div key={globalIdx} style={{
                background: isCurrent ? 'rgba(59,130,246,0.08)' : 'var(--bg-glass)',
                border: `1px solid ${isCurrent ? 'rgba(59,130,246,0.3)' : 'var(--border-glass)'}`,
                borderRadius: 6, padding: '5px 8px', fontSize: 10,
                borderLeft: `3px solid ${stepColor(s.type)}`,
                opacity: isCurrent ? 1 : 0.7,
                transition: 'all 0.15s',
              }}>
                <span style={{ marginRight: 4 }}>{stepIcon(s.type)}</span>
                <span style={{ color: 'var(--text-primary)' }}>{stepText(s)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Algorithm comparison table */}
      <div>
        <div className="section-title">📊 All Algorithms Compared</div>
        <div style={{
          background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
          borderRadius: 10, overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: 9 }}>ALGO</th>
                <th style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', fontSize: 9 }}>NODES</th>
                <th style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', fontSize: 9 }}>STEPS</th>
                <th style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', fontSize: 9 }}>PATH</th>
                <th style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', fontSize: 9 }}>COST</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(algoData).map(([key, data]) => {
                const isActive = key === selectedAlgo;
                const names = { dijkstra: 'Dijkstra', astar: 'A*', bfs: 'BFS', dfs: 'DFS', branchAndBound: 'B&B' };
                return (
                  <tr
                    key={key}
                    onClick={() => setSelectedAlgo(key)}
                    style={{
                      cursor: 'pointer',
                      background: isActive ? 'rgba(59,130,246,0.08)' : 'transparent',
                      borderBottom: '1px solid var(--border-glass)',
                      transition: 'background 0.15s',
                    }}
                  >
                    <td style={{ padding: '6px 8px', fontWeight: isActive ? 700 : 500, color: isActive ? '#3b82f6' : 'var(--text-primary)' }}>
                      {names[key] || key}
                    </td>
                    <td style={{ padding: '6px 6px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {data.nodesVisited}
                    </td>
                    <td style={{ padding: '6px 6px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {data.steps?.length || 0}
                    </td>
                    <td style={{ padding: '6px 6px', textAlign: 'center', color: data.pathLength > 0 ? '#10b981' : '#dc2626', fontWeight: 600 }}>
                      {data.pathLength > 0 ? data.pathLength : '✗'}
                    </td>
                    <td style={{ padding: '6px 6px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {data.cost != null && data.cost < Infinity ? `${(data.cost / 1000).toFixed(1)}k` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* B&B special info */}
        {selectedAlgo === 'branchAndBound' && currentData?.prunedCount > 0 && (
          <div style={{
            marginTop: 8, background: 'rgba(220,38,38,0.06)',
            border: '1px solid rgba(220,38,38,0.15)',
            borderRadius: 8, padding: '8px 10px', fontSize: 11, color: 'var(--text-secondary)',
          }}>
            ✂️ Branch & Bound pruned <strong style={{ color: '#dc2626' }}>{currentData.prunedCount}</strong> suboptimal paths using Dijkstra's cost as the upper bound.
          </div>
        )}
      </div>
    </div>
  );
}
