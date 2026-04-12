import React, { useState, useEffect } from 'react';
import { Check, X, Save, GraduationCap, AlertCircle } from 'lucide-react';
import { SUBJECTS, PHASES, Student, cn, CLASSES } from '../types';
import { supabase } from '../supabase';

const TEST_ITEMS = {
  BM: {
    Asas: ["Mengenal huruf dan suku kata", "Membaca perkataan mudah dengan sebutan betul", "Memahami arahan mudah"],
    Sederhana: ["Membaca ayat mudah dengan lancar dan betul", "Menyatakan isi tersurat dalam teks pendek", "Menjawab soalan kefahaman aras rendah"],
    Tinggi: ["Memberi pendapat atau sebab", "Menghubungkait maklumat dengan pengalaman sendiri", "Menyelesaikan soalan KBAT (Aplikasi, Analisis, Sintesis)"]
  },
  EN: {
    Asas: ["Recognises letters and sounds", "Reads simple words", "Understands simple instructions"],
    Sederhana: ["Reads simple sentences fluently", "Identifies explicit information", "Answers basic comprehension questions", "Writes a simple meaningful sentence"],
    Tinggi: ["Makes simple inferences", "Gives simple reasons or opinions", "Applies understanding in new situations", "Responds creatively using simple language"]
  },
  NUM: {
    Asas: ["Mengenal dan menulis nombor 0-50", "Membilang dan membanding nombor", "Tambah dan tolak mudah"],
    Sederhana: ["Tambah dan tolak tanpa bahan konkrit", "Menyelesaikan masalah satu langkah", "Memilih operasi yang sesuai"],
    Tinggi: ["Menyelesaikan masalah dua Langkah atau lebih", "Aplikasi numerasi dalam situasi harian", "Menerangkan strategi penyelesaian (KBAT)"]
  }
};

export default function PhaseTest() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState('Semua');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('BM');
  const [selectedPhase, setSelectedPhase] = useState(1);
  const [results, setResults] = useState<Record<string, boolean[]>>({
    Asas: [], Sederhana: [], Tinggi: []
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('archived', false)
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching students:', error);
    } else {
      setStudents(data || []);
    }
  };

  useEffect(() => {
    fetchStudents();

    const channel = supabase
      .channel('students_changes_phasetest')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        fetchStudents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const items = TEST_ITEMS[selectedSubject as keyof typeof TEST_ITEMS];
    setResults({
      Asas: new Array(items.Asas.length).fill(false),
      Sederhana: new Array(items.Sederhana.length).fill(false),
      Tinggi: new Array(items.Tinggi.length).fill(false)
    });
  }, [selectedSubject]);

  const handleToggle = (level: string, idx: number) => {
    setResults(prev => ({
      ...prev,
      [level]: prev[level].map((v, i) => i === idx ? !v : v)
    }));
  };

  const calculateStatus = () => {
    const allAsas = results.Asas.every(v => v);
    const allSederhana = results.Sederhana.every(v => v);
    const allTinggi = results.Tinggi.every(v => v);
    
    const someAsas = results.Asas.some(v => v);
    const someSederhana = results.Sederhana.some(v => v);
    const someTinggi = results.Tinggi.some(v => v);

    if (!allAsas) return 'INTERVENSI';
    if (allAsas && !someSederhana) return 'LULUS INTERVENSI';
    if (allAsas && !allSederhana) return 'PENGUKUHAN';
    if (allAsas && allSederhana && !someTinggi) return 'LULUS PENGUKUHAN';
    if (allAsas && allSederhana && !allTinggi) return 'PENGGAYAAN';
    if (allAsas && allSederhana && allTinggi) return 'LULUS PENGGAYAAN';
    return 'INTERVENSI';
  };

  const getStatusColor = (status: string) => {
    if (status.includes('INTERVENSI')) return 'bg-red-100 text-red-700';
    if (status.includes('PENGUKUHAN')) return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-700';
  };

  const handleSubmit = async () => {
    if (!selectedStudent) return;
    setLoading(true);
    const status = calculateStatus();
    
    try {
      const { error } = await supabase
        .from('phase_tests')
        .insert([{
          student_id: selectedStudent,
          subject: selectedSubject,
          phase: selectedPhase,
          items: results,
          status
        }]);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Ujian Pelepasan berjaya direkodkan!' });
      setSelectedStudent('');
    } catch (error: any) {
      console.error('Error saving phase test:', error);
      setMessage({ type: 'error', text: `Gagal merekod ujian: ${error.message || 'Ralat tidak diketahui'}` });
    }
    setLoading(false);
  };

  const currentItems = TEST_ITEMS[selectedSubject as keyof typeof TEST_ITEMS];

  const filteredStudents = students.filter(s => selectedClass === 'Semua' || s.class === selectedClass);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Ujian Pelepasan i-LINAR</h2>
            <p className="text-slate-500">Penilaian berfasa perkembangan murid</p>
          </div>
          <div className="flex gap-2">
            {PHASES.map(p => (
              <button
                key={p}
                onClick={() => setSelectedPhase(p)}
                className={cn(
                  "w-10 h-10 rounded-full font-bold text-sm border transition-all",
                  selectedPhase === p ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-500 border-slate-200"
                )}
              >
                F{p}
              </button>
            ))}
          </div>
        </div>

        {message && (
          <div className={cn("p-4 rounded-xl flex items-center gap-3", message.type === 'success' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
            {message.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tapis Kelas</label>
              <select 
                value={selectedClass} 
                onChange={e => {
                  setSelectedClass(e.target.value);
                  setSelectedStudent('');
                }} 
                className="w-full rounded-xl border-slate-200 text-sm"
              >
                <option value="Semua">Semua Kelas</option>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pilih Murid</label>
              <select 
                value={selectedStudent} 
                onChange={e => setSelectedStudent(e.target.value)} 
                className="w-full rounded-xl border-slate-200 text-sm"
              >
                <option value="">-- Pilih Murid --</option>
                {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.name} ({s.class})</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Subjek</label>
            <div className="flex gap-2">
              {SUBJECTS.map(sub => (
                <button key={sub.id} onClick={() => setSelectedSubject(sub.id)} className={cn("flex-1 py-2 rounded-lg border text-xs font-bold", selectedSubject === sub.id ? "bg-slate-900 text-white" : "bg-white text-slate-600")}>
                  {sub.id}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {Object.entries(currentItems).map(([level, items]) => (
            <div key={level} className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full", level === 'Asas' ? 'bg-red-500' : level === 'Sederhana' ? 'bg-amber-500' : 'bg-emerald-500')} />
                Tahap {level}
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {items.map((item, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleToggle(level, idx)}
                    className={cn(
                      "p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all",
                      results[level][idx] ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-600"
                    )}
                  >
                    <span className="text-sm font-medium">{idx + 1}. {item}</span>
                    {results[level][idx] ? <Check size={16} /> : <X size={16} className="opacity-20" />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">Keputusan Auto-Tag:</span>
            <span className={cn("px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide", getStatusColor(calculateStatus()))}>
              {calculateStatus()}
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!selectedStudent || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
          >
            <GraduationCap size={20} />
            {loading ? 'Menyimpan...' : 'Sahkan Keputusan'}
          </button>
        </div>
      </div>
    </div>
  );
}
