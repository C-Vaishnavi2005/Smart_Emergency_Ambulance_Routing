# Smart Emergency Ambulance Routing System

## 🚀 How to Run

### Option 1: Double-click `START_APP.bat` (easiest)
This starts both servers and opens the browser automatically.

### Option 2: Manual start
Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd server
node server.js
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```

Then open: **http://localhost:5173**

---

## 📖 How to Use

### Step 1: Select Location
1. Choose your **State** from the first dropdown
2. Choose your **City** from the second dropdown
3. The map automatically zooms to that city and loads real hospitals from OpenStreetMap

### Step 2: Set Your Position
- Type an address/landmark and press **Search** (🔍)  
- Or click **Auto-Detect** (⊕) to use your device's GPS  
- Or click **🎙️** and say *"Find nearest hospital"* (voice input)

### Step 3: Choose a Hospital
- Scroll the hospital list in the sidebar
- Each card shows: distance, ETA, ICU bed count, availability status
- Green = Available | Yellow = Limited | Red = Critical

### Step 4: Get Emergency Route
- Click **"Get Emergency Route"** on any hospital card
- The system runs **Dijkstra + A\*** algorithms on the real road graph
- Two routes are drawn on the map:
  - 🟢 **Green line** = Optimal (fastest time)
  - 🟡 **Yellow dashed** = Alternate route

### Step 5: Explore Panels
Switch between tabs in the sidebar:
- **🏥 Hospitals** — Hospital list and route action
- **🧠 Algorithm** — Step-by-step visualization of Dijkstra exploration; press ▶ Play
- **📊 Stats** — Dashboard with charts, metrics, and route comparison

### Emergency Mode
Click **"ACTIVATE EMERGENCY MODE"** to:
- Reduce all traffic weights by 70% (simulates signal override)
- Route turns red (emergency override visual)
- ETA decreases significantly

---

## 🗺️ Map Legend
| Color | Meaning |
|---|---|
| 🟢 Green solid line | Optimal route (best time) |
| 🟡 Yellow dashed line | Alternate route |
| 🟢 Green hospital marker | Available (>20 ICU beds) |
| 🟡 Yellow hospital marker | Limited (10–20 ICU beds) |
| 🔴 Red hospital marker | Critical (<10 ICU beds) |
| 🔵 Blue dot | Your location |

---

## 🧠 Algorithms Used
| Algorithm | Purpose |
|---|---|
| **Dijkstra** | Finds the shortest path by cost (distance × traffic) |
| **A\*** | Uses Haversine heuristic for faster convergence |
| **BFS/DFS** | Used for exploration visualization |
| **Branch & Bound** | Prunes paths exceeding the best-known cost |

---

## 🛠️ Tech Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Map**: Leaflet.js + CARTO dark tiles (OpenStreetMap)
- **Routing**: OSRM (Open Source Routing Machine) — free, no key needed
- **Hospital data**: Overpass API (OpenStreetMap database)
- **Location search**: Nominatim geocoder
- **Backend**: Node.js + Express
- **Charts**: Recharts
- **State**: Zustand
