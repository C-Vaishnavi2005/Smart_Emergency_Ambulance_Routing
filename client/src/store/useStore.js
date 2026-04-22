import { create } from 'zustand';

const useStore = create((set, get) => ({
  // Location state
  selectedState: '',
  selectedCity: '',
  userLocation: null, // { lat, lng, label }
  mapCenter: { lat: 20.5937, lng: 78.9629 }, // India center
  mapZoom: 5,

  // Hospital state
  hospitals: [],
  selectedHospital: null,
  hospitalsLoading: false,

  // Route state
  routes: null,        // { routeA, routeB, optimal }
  routeSteps: [],      // Algorithm exploration steps
  animatingRoute: false,
  ambulancePosition: null,

  // Algorithm state
  algorithm: 'dijkstra', // 'dijkstra' | 'astar'
  algoSteps: [],
  algoPlaying: false,
  currentStep: 0,

  // Traffic state
  trafficMultiplier: 1.0,
  emergencyMode: false,

  // Dashboard metrics
  metrics: null,

  // UI state
  activePanel: 'hospitals', // 'hospitals' | 'algo' | 'dashboard'
  isLoading: false,
  error: null,
  voiceActive: false,

  // Actions
  setSelectedState: (state) => set({ selectedState: state, selectedCity: '', hospitals: [], routes: null, selectedHospital: null }),
  setSelectedCity: (city) => set({ selectedCity: city, hospitals: [], routes: null, selectedHospital: null }),
  setUserLocation: (loc) => set({ userLocation: loc }),
  setMapCenter: (center) => set({ mapCenter: center }),
  setMapZoom: (zoom) => set({ mapZoom: zoom }),

  setHospitals: (hospitals) => set({ hospitals }),
  setSelectedHospital: (hospital) => set({ selectedHospital: hospital }),
  setHospitalsLoading: (loading) => set({ hospitalsLoading: loading }),

  setRoutes: (routes) => set({ routes }),
  setAlgoSteps: (steps) => set({ algoSteps: steps, currentStep: 0 }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setAlgoPlaying: (playing) => set({ algoPlaying: playing }),
  setAnimatingRoute: (v) => set({ animatingRoute: v }),
  setAmbulancePosition: (pos) => set({ ambulancePosition: pos }),

  setAlgorithm: (algo) => set({ algorithm: algo }),
  setTrafficMultiplier: (mult) => set({ trafficMultiplier: mult }),
  setEmergencyMode: (on) => set({
    emergencyMode: on,
    trafficMultiplier: on ? 0.3 : 1.0
  }),

  setMetrics: (metrics) => set({ metrics }),
  setActivePanel: (panel) => set({ activePanel: panel }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setVoiceActive: (v) => set({ voiceActive: v }),

  reset: () => set({
    routes: null, algoSteps: [], metrics: null,
    ambulancePosition: null, animatingRoute: false,
    selectedHospital: null, error: null
  }),
}));

export default useStore;
