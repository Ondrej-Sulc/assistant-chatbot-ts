// Enum for exercise types
export enum ExerciseType {
  Pushup = 'pushup',
  Pullup = 'pullup',
}

// Type for a row in the exercise sheet
export interface ExerciseSheetRow {
  date: string; // dd/MM/yyyy
  note?: string;
  pushups: number;
  pullups: number;
}

// Type for chart data
export interface ExerciseChartData {
  date: string;
  pushups: number;
  pullups: number;
} 