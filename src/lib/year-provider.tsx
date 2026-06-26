'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface YearContextType {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
}

const YearContext = createContext<YearContextType>({
  selectedYear: new Date().getFullYear(),
  setSelectedYear: () => {},
});

export function YearProvider({ children, defaultYear }: { children: ReactNode; defaultYear?: number }) {
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear || new Date().getFullYear());
  return (
    <YearContext.Provider value={{ selectedYear, setSelectedYear }}>
      {children}
    </YearContext.Provider>
  );
}

export function useYear() {
  return useContext(YearContext);
}
