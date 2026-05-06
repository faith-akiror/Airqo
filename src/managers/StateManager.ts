/**
 * Simple State Manager for application state
 */
export type AppState = {
  selectedMeasurement: any | null;
  isSidebarOpen: boolean;
  viewMode: 'heatmap' | 'markers';
  timeRange: string;
};

type Listener = (state: AppState) => void;

class StateManager {
  private state: AppState = {
    selectedMeasurement: null,
    isSidebarOpen: false,
    viewMode: 'heatmap',
    timeRange: 'day',
  };

  private listeners: Set<Listener> = new Set();

  getState() {
    return this.state;
  }

  setState(updates: Partial<AppState>) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l(this.state));
  }
}

export const stateManager = new StateManager();
