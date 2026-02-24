import { createContext, useContext, useMemo, useState, useEffect } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [cases, setCases] = useState([])

  const fetchCases = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/cases");
      const data = await res.json();
      setCases(data);
    } catch (err) {
      console.warn("Failed to fetch cases from backend", err);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const logCase = async (assessment_id, impression, notes) => {
    try {
      await fetch("http://localhost:8000/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessment_id,
          impression,
          notes
        })
      });
      fetchCases();
    } catch (err) {
      console.error("Log Case Error:", err);
    }
  }

  const value = useMemo(() => ({ cases, logCase }), [cases])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppContext must be used within AppProvider')
  return context
}
