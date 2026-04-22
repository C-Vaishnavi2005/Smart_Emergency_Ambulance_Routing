import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadialBarChart, RadialBar } from 'recharts';
import { Clock, Navigation, TrendingDown, Activity, Zap, CheckCircle } from 'lucide-react';
import useStore from '../../store/useStore';

function formatDist(m) { return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`; }
function formatTime(secs) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m ${Math.round(secs % 60)}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function Dashboard({ visible }) {
  const { metrics, routes, emergencyMode, trafficMultiplier, algoSteps, selectedHospital } = useStore();

  if (!visible) return null;

  if (!metrics || !routes) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
          No data yet
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
          Select a hospital and compute a route to see analytics.
        </div>
      </div>
    );
  }

  const routeA = routes.routeA;
  const routeB = routes.routeB;

  const barData = [
    { name: 'Route A', distance: Math.round(routeA.distance / 100) / 10, time: Math.round(routeA.duration / 60), type: 'A' },
    { name: 'Route B', distance: Math.round(routeB.distance / 100) / 10, time: Math.round(routeB.duration / 60), type: 'B' },
  ];

  const optimalRoute = routes.optimal === 'A' ? routeA : routeB;

  const metricCards = [
    {
      icon: <Clock size={16} />,
      label: 'ETA',
      value: formatTime(optimalRoute.duration),
      color: 'var(--accent-blue)',
      bg: 'rgba(59,130,246,0.1)',
    },
    {
      icon: <Navigation size={16} />,
      label: 'Distance',
      value: formatDist(optimalRoute.distance),
      color: 'var(--accent-green)',
      bg: 'rgba(16,185,129,0.1)',
    },
    {
      icon: <TrendingDown size={16} />,
      label: 'Time Saved',
      value: formatTime(metrics.timeSaved),
      color: 'var(--accent-yellow)',
      bg: 'rgba(245,158,11,0.1)',
    },
    {
      icon: <Activity size={16} />,
      label: 'Algo Steps',
      value: algoSteps.length,
      color: 'var(--accent-purple)',
      bg: 'rgba(139,92,246,0.1)',
    },
    {
      icon: <Zap size={16} />,
      label: 'Traffic ×',
      value: `${trafficMultiplier.toFixed(1)}×`,
      color: emergencyMode ? 'var(--accent-green)' : 'var(--accent-red)',
      bg: emergencyMode ? 'rgba(16,185,129,0.1)' : 'rgba(220,38,38,0.1)',
    },
    {
      icon: <CheckCircle size={16} />,
      label: 'Optimal',
      value: `Route ${routes.optimal}`,
      color: 'var(--accent-green)',
      bg: 'rgba(16,185,129,0.1)',
    },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-glass)',
        borderRadius: 10, padding: '10px 14px', fontSize: 12
      }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color, fontSize: 11 }}>
            {p.name}: <strong>{p.value} {p.name === 'Time' ? 'min' : 'km'}</strong>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: 20 }}>
      <div className="section-title">📊 Mission Analytics</div>

      {/* Metric grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {metricCards.map((card, i) => (
          <div key={i} className="metric-card" style={{ animationDelay: `${i * 60}ms` }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: card.bg, color: card.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 8,
            }}>{card.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: card.color, fontFamily: 'Rajdhani, sans-serif' }}>
              {card.value}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 0.5 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Emergency status */}
      {emergencyMode && (
        <div style={{
          background: 'rgba(220,38,38,0.08)',
          border: '1px solid rgba(220,38,38,0.3)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <span style={{ fontSize: 20 }}>⚡</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-red)' }}>Emergency Mode Active</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Traffic signals overridden — {Math.round((1 - trafficMultiplier) * 100)}% delay reduction</div>
          </div>
        </div>
      )}

      {/* Bar Chart */}
      <div style={{ marginBottom: 14 }}>
        <div className="section-title">Route Comparison — Distance (km)</div>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={barData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="distance" name="Distance" radius={[6, 6, 0, 0]}>
              {barData.map((d) => (
                <Cell key={d.type} fill={d.type === routes.optimal ? '#10b981' : '#f59e0b'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div className="section-title">Route Comparison — Time (min)</div>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={barData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="time" name="Time" radius={[6, 6, 0, 0]}>
              {barData.map((d) => (
                <Cell key={d.type} fill={d.type === routes.optimal ? '#3b82f6' : '#8b5cf6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Why this route */}
      <div style={{
        background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: 10, padding: 14
      }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent-green)', marginBottom: 8 }}>
          ✅ Why Route {routes.optimal} is optimal
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {routes.optimal === 'A'
            ? `Route A offers the shortest travel time (${formatTime(routeA.duration)}) with ${routeA.trafficLevel} traffic conditions. Even though the distance is ${formatDist(routeA.distance)}, the traffic-weighted cost is lower.`
            : `Route B is faster (${formatTime(routeB.duration)}) despite being ${formatDist(routeB.distance - routeA.distance)} longer, because it avoids high-traffic zones. With ${routeB.trafficLevel} traffic, it saves ${formatTime(metrics.timeSaved)}.`
          }
        </div>
      </div>

      {/* Algorithm info */}
      <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 10, border: '1px solid var(--border-glass)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          🧠 <strong style={{ color: 'var(--text-secondary)' }}>Algorithms Run:</strong> {metrics.algoUsed} &nbsp;|&nbsp;
          Explored <strong style={{ color: 'var(--accent-blue)' }}>{metrics.nodesExplored}</strong> nodes &nbsp;|&nbsp;
          Path <strong style={{ color: 'var(--accent-green)' }}>{metrics.nodesInPath}</strong> nodes
        </div>
      </div>

      {/* Turn-by-turn directions */}
      {optimalRoute.directions && optimalRoute.directions.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="section-title">🗺️ Turn-by-Turn Directions (Route {routes.optimal})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
            {optimalRoute.directions.map((dir, idx) => (
              <div key={idx} style={{
                background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                borderRadius: 8, padding: '8px 10px', fontSize: 11,
                borderLeft: `3px solid ${idx === 0 ? 'var(--accent-green)' : idx === optimalRoute.directions.length - 1 ? 'var(--accent-red)' : 'var(--accent-blue)'}`,
              }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {idx + 1}. {dir.instruction}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                  {formatDist(dir.distance)} • {formatTime(dir.duration)} • {dir.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
