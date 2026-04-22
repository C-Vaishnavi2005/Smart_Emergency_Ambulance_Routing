/**
 * Dijkstra's Algorithm
 * Finds shortest path in a weighted graph using a priority queue (min-heap)
 * Returns: { path, cost, steps } where steps = exploration events for visualization
 */
export function dijkstra(graph, startId, endId) {
  const dist = {};
  const prev = {};
  const visited = new Set();
  const steps = [];

  // Priority queue as sorted array (simple implementation)
  const pq = []; // [cost, nodeId]

  // Initialize
  for (const node of Object.keys(graph)) {
    dist[node] = Infinity;
    prev[node] = null;
  }
  dist[startId] = 0;
  pq.push([0, startId]);

  const pqPush = (cost, id) => {
    pq.push([cost, id]);
    pq.sort((a, b) => a[0] - b[0]);
  };

  pqPush(0, startId);

  while (pq.length > 0) {
    const [currCost, curr] = pq.shift();

    if (visited.has(curr)) continue;
    visited.add(curr);

    steps.push({ type: 'visit', node: curr, cost: currCost });

    if (curr === endId) break;

    const neighbors = graph[curr] || [];
    for (const { to, weight, traffic } of neighbors) {
      if (visited.has(to)) continue;
      const edgeCost = weight * (traffic || 1.0);
      const newCost = dist[curr] + edgeCost;

      if (newCost < dist[to]) {
        dist[to] = newCost;
        prev[to] = curr;
        steps.push({ type: 'relax', from: curr, to, cost: newCost });
        pqPush(newCost, to);
      } else {
        steps.push({ type: 'skip', from: curr, to });
      }
    }
  }

  // Reconstruct path
  const path = [];
  let cur = endId;
  while (cur !== null) {
    path.unshift(cur);
    cur = prev[cur];
  }

  if (path[0] !== startId) return { path: [], cost: Infinity, steps };

  return { path, cost: dist[endId], steps };
}

/**
 * A* Algorithm
 * Uses heuristic (haversine distance to goal) to guide search
 */
export function aStar(graph, nodeCoords, startId, endId) {
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
  fScore[startId] = heuristic(nodeCoords[startId], nodeCoords[endId]);

  while (openSet.size > 0) {
    // Get node with lowest fScore
    let curr = null;
    let minF = Infinity;
    for (const node of openSet) {
      if (fScore[node] < minF) {
        minF = fScore[node];
        curr = node;
      }
    }

    if (!curr) break;
    if (curr === endId) break;

    openSet.delete(curr);
    closedSet.add(curr);
    steps.push({ type: 'visit', node: curr, cost: gScore[curr], fScore: fScore[curr] });

    const neighbors = graph[curr] || [];
    for (const { to, weight, traffic } of neighbors) {
      if (closedSet.has(to)) continue;
      const edgeCost = weight * (traffic || 1.0);
      const tentativeG = gScore[curr] + edgeCost;

      if (tentativeG < gScore[to]) {
        prev[to] = curr;
        gScore[to] = tentativeG;
        fScore[to] = tentativeG + heuristic(nodeCoords[to], nodeCoords[endId]);
        openSet.add(to);
        steps.push({ type: 'relax', from: curr, to, cost: tentativeG });
      } else {
        steps.push({ type: 'skip', from: curr, to });
      }
    }
  }

  const path = [];
  let cur = endId;
  while (cur !== null) {
    path.unshift(cur);
    cur = prev[cur];
  }

  if (path[0] !== startId) return { path: [], cost: Infinity, steps };
  return { path, cost: gScore[endId], steps };
}

function heuristic(a, b) {
  if (!a || !b) return 0;
  return haversine(a.lat, a.lng, b.lat, b.lng);
}

export function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) { return (deg * Math.PI) / 180; }

/**
 * BFS exploration (for visualization only — shows all reachable from source)
 */
export function bfsExplore(graph, startId, maxDepth = 4) {
  const visited = new Set([startId]);
  const queue = [[startId, 0]];
  const exploredEdges = [];

  while (queue.length > 0) {
    const [curr, depth] = queue.shift();
    if (depth >= maxDepth) continue;

    const neighbors = graph[curr] || [];
    for (const { to } of neighbors) {
      exploredEdges.push({ from: curr, to });
      if (!visited.has(to)) {
        visited.add(to);
        queue.push([to, depth + 1]);
      }
    }
  }
  return { visited: [...visited], exploredEdges };
}

/**
 * Branch and Bound
 * Prunes paths exceeding the best known cost (uses Dijkstra result as upper bound)
 */
export function branchAndBound(graph, startId, endId, upperBound) {
  const stack = [[startId, 0, [startId]]]; // [node, cost, path]
  const prunedPaths = [];
  let bestPath = null;
  let bestCost = upperBound;

  let iterations = 0;
  const MAX_ITER = 500;

  while (stack.length > 0 && iterations < MAX_ITER) {
    iterations++;
    const [curr, cost, path] = stack.pop();

    if (cost >= bestCost) {
      prunedPaths.push({ path: [...path], cost, reason: 'exceeds best cost' });
      continue;
    }

    if (curr === endId) {
      if (cost < bestCost) {
        bestCost = cost;
        bestPath = [...path];
      }
      continue;
    }

    const neighbors = graph[curr] || [];
    for (const { to, weight, traffic } of neighbors) {
      if (path.includes(to)) continue; // no cycles
      const newCost = cost + weight * (traffic || 1.0);
      if (newCost < bestCost) {
        stack.push([to, newCost, [...path, to]]);
      } else {
        prunedPaths.push({ path: [...path, to], cost: newCost, reason: 'pruned' });
      }
    }
  }

  return { bestPath, bestCost, prunedPaths };
}
