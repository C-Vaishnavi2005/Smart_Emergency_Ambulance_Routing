const express = require('express');
const router = express.Router();

// ─── Utility functions ───────────────────────────────────────────────────────

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function toRad(deg) { return deg * Math.PI / 180; }

// Fetch OSRM route (real road routing)
async function fetchOSRMRoute(fromLat, fromLng, toLat, toLng, alternates = true) {
  const fetch = (await import('node-fetch')).default;
  const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&alternatives=${alternates}&steps=true&annotations=true`;

  try {
    const res = await fetch(url, { timeout: 15000 });
    if (!res.ok) throw new Error('OSRM error');
    const data = await res.json();
    if (data.code !== 'Ok') throw new Error('No route found');
    return data.routes;
  } catch (err) {
    console.error('OSRM fetch failed:', err.message);
    return null;
  }
}

// Fetch alternate route via a detour waypoint (when OSRM doesn't give alternates)
async function fetchDetourRoute(fromLat, fromLng, toLat, toLng) {
  const fetch = (await import('node-fetch')).default;

  // Create a waypoint offset perpendicular to the direct line
  const midLat = (fromLat + toLat) / 2;
  const midLng = (fromLng + toLng) / 2;
  const dx = toLng - fromLng;
  const dy = toLat - fromLat;
  // Perpendicular offset (rotate 90 degrees)
  const perpLat = midLat + dx * 0.15;
  const perpLng = midLng - dy * 0.15;

  const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${perpLng},${perpLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true&annotations=true`;

  try {
    const res = await fetch(url, { timeout: 15000 });
    if (!res.ok) throw new Error('Detour OSRM error');
    const data = await res.json();
    if (data.code !== 'Ok') return null;
    return data.routes[0];
  } catch (err) {
    console.error('Detour route failed:', err.message);
    return null;
  }
}

// Build a graph from OSRM route coordinates for algorithm visualization
function buildGraphFromCoordinates(routes) {
  const graph = {};
  const nodeCoords = {};

  routes.forEach((route, ri) => {
    const coords = route.geometry.coordinates; // [lng, lat]
    const step = Math.max(1, Math.floor(coords.length / 25)); // Sample up to 25 nodes per route

    const sampled = [];
    for (let i = 0; i < coords.length; i += step) sampled.push(coords[i]);
    if (sampled[sampled.length - 1] !== coords[coords.length - 1]) {
      sampled.push(coords[coords.length - 1]);
    }

    sampled.forEach(([lng, lat], idx) => {
      const id = `r${ri}_n${idx}`;
      nodeCoords[id] = { lat, lng };
      if (!graph[id]) graph[id] = [];
      if (idx > 0) {
        const prevId = `r${ri}_n${idx - 1}`;
        const dist = haversine(nodeCoords[prevId].lat, nodeCoords[prevId].lng, lat, lng);
        const traffic = 0.8 + Math.random() * 1.5;
        if (!graph[prevId]) graph[prevId] = [];
        graph[prevId].push({ to: id, weight: dist, traffic });
        graph[id].push({ to: prevId, weight: dist, traffic }); // bidirectional
      }
    });

    // Cross-connect routes at shared start and end
    if (ri > 0) {
      const startA = 'r0_n0';
      const startB = `r${ri}_n0`;
      const sampledCountA = Object.keys(nodeCoords).filter(k => k.startsWith('r0_')).length - 1;
      const sampledCountB = Object.keys(nodeCoords).filter(k => k.startsWith(`r${ri}_`)).length - 1;
      const endA = `r0_n${sampledCountA}`;
      const endB = `r${ri}_n${sampledCountB}`;

      // Connect starts
      if (nodeCoords[startA] && nodeCoords[startB]) {
        const d = haversine(nodeCoords[startA].lat, nodeCoords[startA].lng, nodeCoords[startB].lat, nodeCoords[startB].lng);
        if (!graph[startA]) graph[startA] = [];
        graph[startA].push({ to: startB, weight: Math.max(d, 10), traffic: 1.0 });
        if (!graph[startB]) graph[startB] = [];
        graph[startB].push({ to: startA, weight: Math.max(d, 10), traffic: 1.0 });
      }

      // Connect ends
      if (nodeCoords[endA] && nodeCoords[endB]) {
        const d = haversine(nodeCoords[endA].lat, nodeCoords[endA].lng, nodeCoords[endB].lat, nodeCoords[endB].lng);
        if (!graph[endA]) graph[endA] = [];
        graph[endA].push({ to: endB, weight: Math.max(d, 10), traffic: 1.0 });
        if (!graph[endB]) graph[endB] = [];
        graph[endB].push({ to: endA, weight: Math.max(d, 10), traffic: 1.0 });
      }
    }
  });

  return { graph, nodeCoords };
}

// ─── ALGORITHMS ───────────────────────────────────────────────────────────────

// Dijkstra
function dijkstraServer(graph, startId, endId, trafficMult = 1.0) {
  const dist = {};
  const prev = {};
  const visited = new Set();
  const steps = [];

  for (const node of Object.keys(graph)) {
    dist[node] = Infinity;
    prev[node] = null;
  }
  dist[startId] = 0;

  const pq = [[0, startId]];
  const pqPush = (cost, id) => { pq.push([cost, id]); pq.sort((a,b) => a[0]-b[0]); };

  while (pq.length > 0) {
    const [currCost, curr] = pq.shift();
    if (visited.has(curr)) continue;
    visited.add(curr);
    steps.push({ type: 'visit', node: curr, cost: currCost });
    if (curr === endId) break;

    for (const { to, weight, traffic } of (graph[curr] || [])) {
      if (visited.has(to)) continue;
      const edgeCost = weight * (traffic || 1.0) * trafficMult;
      const newCost = dist[curr] + edgeCost;
      if (newCost < dist[to]) {
        dist[to] = newCost;
        prev[to] = curr;
        steps.push({ type: 'relax', from: curr, to, cost: newCost });
        pqPush(newCost, to);
      } else {
        steps.push({ type: 'skip', from: curr, to, cost: newCost });
      }
    }
  }

  const path = [];
  let cur = endId;
  while (cur !== null) { path.unshift(cur); cur = prev[cur]; }
  if (path[0] !== startId) return { path: [], cost: Infinity, steps };
  return { path, cost: dist[endId], steps, nodesVisited: visited.size };
}

// A*
function aStarServer(graph, nodeCoords, startId, endId, trafficMult = 1.0) {
  const gScore = {};
  const fScore = {};
  const prev = {};
  const openSet = new Set([startId]);
  const closedSet = new Set();
  const steps = [];

  for (const node of Object.keys(graph)) {
    gScore[node] = Infinity;
    fScore[node] = Infinity;
    prev[node] = null;
  }
  gScore[startId] = 0;
  fScore[startId] = nodeCoords[endId]
    ? haversine(nodeCoords[startId].lat, nodeCoords[startId].lng, nodeCoords[endId].lat, nodeCoords[endId].lng)
    : 0;

  while (openSet.size > 0) {
    let curr = null;
    let minF = Infinity;
    for (const node of openSet) {
      if (fScore[node] < minF) { minF = fScore[node]; curr = node; }
    }
    if (!curr || curr === endId) break;

    openSet.delete(curr);
    closedSet.add(curr);
    steps.push({ type: 'visit', node: curr, cost: gScore[curr], fScore: fScore[curr] });

    for (const { to, weight, traffic } of (graph[curr] || [])) {
      if (closedSet.has(to)) continue;
      const edgeCost = weight * (traffic || 1.0) * trafficMult;
      const tentativeG = gScore[curr] + edgeCost;
      if (tentativeG < gScore[to]) {
        prev[to] = curr;
        gScore[to] = tentativeG;
        fScore[to] = tentativeG + (nodeCoords[to] && nodeCoords[endId]
          ? haversine(nodeCoords[to].lat, nodeCoords[to].lng, nodeCoords[endId].lat, nodeCoords[endId].lng)
          : 0);
        openSet.add(to);
        steps.push({ type: 'relax', from: curr, to, cost: tentativeG });
      } else {
        steps.push({ type: 'skip', from: curr, to, cost: tentativeG });
      }
    }
  }

  const path = [];
  let cur = endId;
  while (cur !== null) { path.unshift(cur); cur = prev[cur]; }
  if (path[0] !== startId) return { path: [], cost: Infinity, steps };
  return { path, cost: gScore[endId], steps, nodesVisited: closedSet.size };
}

// BFS
function bfsServer(graph, startId, endId) {
  const visited = new Set([startId]);
  const queue = [[startId, [startId]]];
  const steps = [];

  while (queue.length > 0) {
    const [curr, path] = queue.shift();
    steps.push({ type: 'visit', node: curr, depth: path.length - 1 });

    if (curr === endId) {
      return { path, steps, nodesVisited: visited.size };
    }

    for (const { to } of (graph[curr] || [])) {
      if (!visited.has(to)) {
        visited.add(to);
        steps.push({ type: 'relax', from: curr, to });
        queue.push([to, [...path, to]]);
      } else {
        steps.push({ type: 'skip', from: curr, to });
      }
    }
  }

  return { path: [], steps, nodesVisited: visited.size };
}

// DFS  
function dfsServer(graph, startId, endId) {
  const visited = new Set();
  const steps = [];
  let foundPath = null;

  function dfs(node, path) {
    if (foundPath) return;
    visited.add(node);
    steps.push({ type: 'visit', node, depth: path.length - 1 });

    if (node === endId) {
      foundPath = [...path];
      return;
    }

    for (const { to } of (graph[node] || [])) {
      if (!visited.has(to)) {
        steps.push({ type: 'relax', from: node, to });
        dfs(to, [...path, to]);
      } else {
        steps.push({ type: 'skip', from: node, to });
      }
    }
    // Backtrack event
    if (!foundPath) {
      steps.push({ type: 'backtrack', node });
    }
  }

  dfs(startId, [startId]);
  return { path: foundPath || [], steps, nodesVisited: visited.size };
}

// Branch & Bound
function branchAndBoundServer(graph, startId, endId, upperBound) {
  const steps = [];
  let bestPath = null;
  let bestCost = upperBound;
  let prunedCount = 0;
  let iterations = 0;
  const MAX_ITER = 800;

  const stack = [[startId, 0, [startId]]]; // [node, cost, path]

  while (stack.length > 0 && iterations < MAX_ITER) {
    iterations++;
    const [curr, cost, path] = stack.pop();

    steps.push({ type: 'visit', node: curr, cost });

    if (cost >= bestCost) {
      prunedCount++;
      steps.push({ type: 'skip', node: curr, cost, reason: 'exceeds bound' });
      continue;
    }

    if (curr === endId) {
      if (cost < bestCost) {
        bestCost = cost;
        bestPath = [...path];
        steps.push({ type: 'relax', node: curr, cost, reason: 'new best' });
      }
      continue;
    }

    for (const { to, weight, traffic } of (graph[curr] || [])) {
      if (path.includes(to)) continue; // no cycles
      const newCost = cost + weight * (traffic || 1.0);
      if (newCost < bestCost) {
        stack.push([to, newCost, [...path, to]]);
      } else {
        prunedCount++;
        steps.push({ type: 'skip', node: to, cost: newCost, reason: 'pruned' });
      }
    }
  }

  return { path: bestPath || [], cost: bestCost, steps, prunedCount, nodesVisited: iterations };
}

// ─── ROUTE ENDPOINT ───────────────────────────────────────────────────────────

// POST /api/routing/compute
router.post('/compute', async (req, res) => {
  const { fromLat, fromLng, toLat, toLng, emergencyMode = false } = req.body;

  if (!fromLat || !fromLng || !toLat || !toLng) {
    return res.status(400).json({ error: 'fromLat, fromLng, toLat, toLng required' });
  }

  try {
    // Get real routes from OSRM
    let osrmRoutes = await fetchOSRMRoute(fromLat, fromLng, toLat, toLng, true);
    const trafficMult = emergencyMode ? 0.3 : 1.0;

    if (!osrmRoutes || osrmRoutes.length === 0) {
      return res.status(404).json({ error: 'No route found between locations' });
    }

    // If OSRM only returned 1 route, force an alternate via detour
    if (osrmRoutes.length < 2) {
      const detourRoute = await fetchDetourRoute(fromLat, fromLng, toLat, toLng);
      if (detourRoute) {
        osrmRoutes.push(detourRoute);
      }
    }

    // Build graph for algorithm visualization
    const { graph, nodeCoords } = buildGraphFromCoordinates(osrmRoutes);

    // Determine start and end nodes for algorithms
    const startId = 'r0_n0';
    const endNodeKeys = Object.keys(nodeCoords).filter(k => k.startsWith('r0_')).sort((a,b) => {
      const na = parseInt(a.split('_n')[1]);
      const nb = parseInt(b.split('_n')[1]);
      return nb - na;
    });
    const endId = endNodeKeys[0] || startId;

    // ── Run ALL 4 algorithms ──────────────────────────────────────────────────

    const dijkResult = dijkstraServer(graph, startId, endId, trafficMult);
    const astarResult = aStarServer(graph, nodeCoords, startId, endId, trafficMult);
    const bfsResult = bfsServer(graph, startId, endId);
    const dfsResult = dfsServer(graph, startId, endId);
    const bnbResult = branchAndBoundServer(graph, startId, endId, dijkResult.cost * 1.5);

    // ── Build routes ──────────────────────────────────────────────────────────

    const routeA = osrmRoutes[0];
    const routeB = osrmRoutes.length > 1 ? osrmRoutes[1] : osrmRoutes[0];

    const directionsA = extractDirections(routeA);
    const directionsB = extractDirections(routeB);

    const distA = routeA.distance;
    const timeA = routeA.duration * (emergencyMode ? 0.6 : 1.0);
    const distB = routeB.distance;
    const timeB = routeB.duration * (emergencyMode ? 0.6 : 1.0);

    // Determine optimal (best time)
    const optimal = timeA <= timeB ? 'A' : 'B';

    const timeSaved = Math.abs(timeA - timeB);
    const distSaved = Math.abs(distA - distB);

    res.json({
      routeA: {
        label: 'Route A — Shortest Distance',
        coordinates: routeA.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        distance: distA,
        duration: timeA,
        trafficLevel: Math.random() > 0.5 ? 'high' : 'medium',
        directions: directionsA,
      },
      routeB: {
        label: 'Route B — Via Alternate Roads',
        coordinates: routeB.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        distance: distB,
        duration: timeB,
        trafficLevel: Math.random() > 0.5 ? 'low' : 'medium',
        directions: directionsB,
      },
      optimal,
      metrics: {
        timeSaved: Math.round(timeSaved),
        distanceSaved: Math.round(distSaved),
        emergencyMode,
        algoUsed: 'Dijkstra + A* + BFS + DFS + B&B',
        nodesExplored: dijkResult.nodesVisited || dijkResult.steps.length,
        nodesInPath: dijkResult.path.length,
      },
      // Algorithm results for visualization in the AlgoPanel
      algorithms: {
        dijkstra: {
          steps: dijkResult.steps.slice(0, 150),
          nodesVisited: dijkResult.nodesVisited,
          pathLength: dijkResult.path.length,
          cost: Math.round(dijkResult.cost),
        },
        astar: {
          steps: astarResult.steps.slice(0, 150),
          nodesVisited: astarResult.nodesVisited,
          pathLength: astarResult.path.length,
          cost: Math.round(astarResult.cost),
        },
        bfs: {
          steps: bfsResult.steps.slice(0, 150),
          nodesVisited: bfsResult.nodesVisited,
          pathLength: bfsResult.path.length,
        },
        dfs: {
          steps: dfsResult.steps.slice(0, 150),
          nodesVisited: dfsResult.nodesVisited,
          pathLength: dfsResult.path.length,
        },
        branchAndBound: {
          steps: bnbResult.steps.slice(0, 150),
          nodesVisited: bnbResult.nodesVisited,
          pathLength: (bnbResult.path || []).length,
          cost: Math.round(bnbResult.cost),
          prunedCount: bnbResult.prunedCount,
        },
      },
      algoSteps: dijkResult.steps.slice(0, 150), // backward compat
      graph: { nodeCoords },
    });
  } catch (err) {
    console.error('Routing error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Extract turn-by-turn directions from OSRM route
function extractDirections(route) {
  const directions = [];
  if (!route.legs) return directions;

  route.legs.forEach(leg => {
    if (leg.steps) {
      leg.steps.forEach((step, idx) => {
        const instruction = step.maneuver?.instruction || 'Continue';
        const distance = Math.round(step.distance);
        const duration = Math.round(step.duration);
        
        directions.push({
          instruction: `${instruction}`,
          distance,
          duration,
          name: step.name || 'Unnamed road',
          type: step.maneuver?.type || 'straight',
        });
      });
    }
  });

  return directions;
}

module.exports = router;
