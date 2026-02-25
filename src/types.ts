import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CLASSES = [
  "1 Amanah",
  "1 Bestari",
  "2 Amanah",
  "2 Bestari",
  "3 Amanah",
  "3 Bestari",
];

export const SUBJECTS = [
  { id: "BM", name: "Literasi Bahasa Melayu" },
  { id: "EN", name: "English Literacy" },
  { id: "NUM", name: "Numerasi" },
];

export const PHASES = [1, 2, 3, 4];

export type Student = {
  id: number;
  name: string;
  class: string;
  gender: string;
};

export type Screening = {
  id: number;
  student_id: number;
  subject: string;
  items: string;
  status: string;
  created_at: string;
};

export type PhaseTest = {
  id: number;
  student_id: number;
  subject: string;
  phase: number;
  items: string;
  status: string;
  created_at: string;
};

export type ReadingRecord = {
  id: number;
  student_id: number;
  category: string;
  status: string;
  is_mahir: number;
  created_at: string;
};
