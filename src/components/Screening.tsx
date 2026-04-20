import React, { useState, useEffect } from 'react';
import { Check, X, Save, AlertCircle } from 'lucide-react';
import { SUBJECTS, Student, cn, CLASSES } from '../types';
import { supabase } from '../supabase';

const SCREENING_ITEMS = {
  BM: [
    "Mengenal huruf dan suku kata",
    "Membaca perkataan mudah",
    "Membaca ayat mudah",
    "Memahami maksud ayat mudah",
    "Menulis ayat mudah"
  ],
  EN: [
    "Recognises letters and sounds",
    "Reads simple words",
    "Reads simple sentences",
    "Understands simple sentences",
    "Writes or completes a simple sentence"
  ],
  NUM: [
    "Mengenal dan menulis nombor",
    "Membilang dan menyusun nombor",
    "Tambah mudah",
    "Tolak mudah",
    "Menyelesaikan masalah matematik mudah"
  ]
};

export default function Screening() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('Semua');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState('BM');
  const [results, setResults] = useState<boolean[]>(new Array(5).fill(false));
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
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

  const fetchExistingScreening = async () => {
    if (!selectedStudent || !selectedSubject) return;
    
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('screenings')
        .select('*')
        .eq('student_id', selectedStudent)
        .eq('subject', selectedSubject)
        .single();

      if (data) {
        setResults(data.items);
        setMessage({ type: 'success', text: 'Data saringan sedia ada telah dimuatkan. Anda boleh mengemaskini (overwrite) data ini.' });
      } else {
        setResults(new Array(5).fill(false));
        setMessage(null);
      }
    } catch (error) {
      // It's fine if no data is found
      setResults(new Array(5).fill(false));
      setMessage(null);
    }
    setFetching(false);
  };

  useEffect(() => {
    fetchStudents();

    const channel = supabase
      .channel('students_changes_screening')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        fetchStudents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    fetchExistingScreening();
  }, [selectedStudent, selectedSubject]);

  const handleToggle = (index: number) => {
    const newResults = [...results];
    newResults[index] = !newResults[index];
    setResults(newResults);
  };

  const calculateStatus = () => {
    const score = results.filter(r => r).length;
    if (score <= 1) return 'Intervensi';
    if (score <= 3) return 'Pengukuhan';
    return 'Penggayaan';
  };

  const handleSubmit = async () => {
    if (!selectedStudent) return;
    setLoading(true);
    setMessage(null);

    const status = calculateStatus();
    
    try {
      // Record to screenings table (Upsert)
      const { data: screeningData, error: screeningError } = await supabase
        .from('screenings')
        .upsert({
          student_id: selectedStudent,
          subject: selectedSubject,
          items: results,
          status,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'student_id,subject'
        })
        .select();

      if (screeningError) throw screeningError;

      // Audit Log
      try {
        await supabase.from('audit_logs').insert([{
          student_id: selectedStudent,
          table_name: 'screenings',
          action: 'UPSERT',
          old_data: null,
          new_data: { subject: selectedSubject, status, items: results },
          description: `Kemaskini/Simpan Ujian Saringan untuk ${selectedSubject}`
        }]);
      } catch (e) {
        console.warn('Audit log failed:', e);
      }

      setMessage({ type: 'success', text: 'Saringan berjaya direkodkan / dikemaskini!' });
    } catch (error: any) {
      console.error('Error saving screening:', error);
      setMessage({ type: 'error', text: `Gagal merekod saringan: ${error.message || 'Ralat tidak diketahui'}` });
    }
    setLoading(false);
  };

  const currentItems = SCREENING_ITEMS[selectedSubject as keyof typeof SCREENING_ITEMS];

  const filteredStudents = students.filter(s => selectedClass === 'Semua' || s.class === selectedClass);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-2xl font-bold text-slate-900">Ujian Saringan i-LINAR</h2>
          <p className="text-slate-500">Penilaian diagnostik awal murid Tahap 1</p>
        </div>

        {message && (
          <div className={cn(
            "p-4 rounded-xl flex items-center gap-3",
            message.type === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
          )}>
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
                onChange={(e) => {
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
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full rounded-xl border-slate-200 text-sm focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">-- Pilih Murid --</option>
                {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.name} ({s.class})</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Subjek</label>
            <div className="flex gap-2">
              {SUBJECTS.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubject(sub.id)}
                  className={cn(
                    "flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-all",
                    selectedSubject === sub.id 
                      ? "bg-slate-900 text-white border-slate-900" 
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  )}
                >
                  {sub.id}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 relative">
          {fetching && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl">
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                Menyemak rekod sedia ada...
              </div>
            </div>
          )}
          <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Item Penilaian</label>
          <div className="space-y-2">
            {currentItems.map((item, idx) => (
              <div 
                key={idx}
                onClick={() => handleToggle(idx)}
                className={cn(
                  "p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-all",
                  results[idx] 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                    : "bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-200"
                )}
              >
                <span className="text-sm font-medium">{idx + 1}. {item}</span>
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center",
                  results[idx] ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
                )}>
                  {results[idx] ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
          <div className="text-sm">
            <span className="text-slate-500">Status Awal: </span>
            <span className={cn(
              "font-bold px-3 py-1 rounded-full text-xs uppercase",
              calculateStatus() === 'Intervensi' ? "bg-red-100 text-red-700" :
              calculateStatus() === 'Pengukuhan' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
            )}>
              {calculateStatus()}
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!selectedStudent || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Save size={18} />
            {loading ? 'Menyimpan...' : 'Simpan Keputusan'}
          </button>
        </div>
      </div>
    </div>
  );
}
