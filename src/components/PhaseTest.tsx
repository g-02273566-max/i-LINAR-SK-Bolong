import React, { useState, useEffect } from 'react';
import { Check, X, Save, GraduationCap, AlertCircle } from 'lucide-react';
import { SUBJECTS, PHASES, Student, cn, CLASSES } from '../types';
import { supabase } from '../supabase';

const LEVEL_DISPLAY_NAMES: Record<string, Record<string, string>> = {
  Asas: {
    BM: "Kumpulan Intervensi (Kemahiran Asas)",
    EN: "Intervention Group (Basic Literacy)",
    NUM: "Kumpulan Intervensi (Kemahiran Asas Nombor)"
  },
  Sederhana: {
    BM: "Kumpulan Pengukuhan (Kombinasi & Struktur Perkataan)",
    EN: "Reinforcement Group (Understanding & Communication)",
    NUM: "Kumpulan Pengukuhan (Operasi & Penggunaan Asas)"
  },
  Tinggi: {
    BM: "Kumpulan Pengayaan (Pemahaman & Penghasilan Ayat)",
    EN: "Enrichment Group (Sentence Level & Writing)",
    NUM: "Kumpulan Pengayaan (Aplikasi Matematik Kompleks)"
  }
};

const TEST_ITEMS = {
  BM: {
    Asas: [
      "Membaca dan menulis huruf vokal dan konsonan",
      "Membaca dan menulis suku kata terbuka",
      "Membaca dan menulis perkataan suku kata terbuka",
      "Membaca dan menulis suku kata tertutup"
    ],
    Sederhana: [
      "Membaca dan menulis perkataan suku kata tertutup",
      "Membaca dan menulis perkataan yang mengandungi suku kata tertutup \"ng\"",
      "Membaca dan menulis perkataan yang mengandungi diftong",
      "Membaca dan menulis perkataan yang mengandungi vokal berganding"
    ],
    Tinggi: [
      "Menulis perkataan yang mengandungi digraf dan konsonan bergabung",
      "Membaca dan menulis perkataan berimbuhan",
      "Membaca dan menulis ayat mudah",
      "Membaca, memahami dan menulis ayat berdasarkan bahan rangsangan"
    ]
  },
  EN: {
    Asas: [
      "Identify and distinguish letters",
      "Associate sounds with letters",
      "Blend sounds into words",
      "Segment words into phonemes"
    ],
    Sederhana: [
      "Understand and use language at word level",
      "Participate in daily conversations",
      "Understand phrases in linear texts",
      "Understand phrases in non-linear texts"
    ],
    Tinggi: [
      "Read and understand sentences with guidance",
      "Understand sentence level in non-linear texts",
      "Understand sentence level in linear texts",
      "Construct sentences with guidance"
    ]
  },
  NUM: {
    Asas: [
      "Keupayaan pra nombor dan mengenal angka",
      "Keupayaan membilang",
      "Keupayaan memahami nilai nombor",
      "Keupayaan membuat seriasi"
    ],
    Sederhana: [
      "Keupayaan mengenal mata wang Malaysia",
      "Keupayaan menyatakan waktu",
      "Keupayaan mengendalikan operasi asas",
      "Keupayaan mengendalikan operasi asas melibatkan mata wang Malaysia"
    ],
    Tinggi: [
      "Keupayaan mengukur panjang objek, jisim objek dan isipadu",
      "Keupayaan menterjemah ayat biasa kepada ayat matematik dan sebaliknya",
      "Keupayaan mengaplikasikan pengetahuan dan kemahiran dalam kehidupan harian terhad kepada nombor bulat",
      "Keupayaan mengaplikasikan pengetahuan dan kemahiran dalam kehidupan harian melibatkan mata wang, masa dan ukuran panjang"
    ]
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

  const fetchExistingTest = async () => {
    if (!selectedStudent || !selectedSubject || !selectedPhase) return;
    
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('phase_tests')
        .select('*')
        .eq('student_id', selectedStudent)
        .eq('subject', selectedSubject)
        .eq('phase', selectedPhase)
        .single();

      if (data) {
        // Normalize loaded results to match current items length
        const normalized = { ...data.items };
        const itemsList = TEST_ITEMS[selectedSubject as keyof typeof TEST_ITEMS];
        
        ['Asas', 'Sederhana', 'Tinggi'].forEach(level => {
          const currentLength = itemsList[level as keyof typeof itemsList].length;
          let levelArray = normalized[level] || [];
          if (levelArray.length < currentLength) {
            levelArray = [...levelArray, ...new Array(currentLength - levelArray.length).fill(false)];
          } else if (levelArray.length > currentLength) {
            levelArray = levelArray.slice(0, currentLength);
          }
          normalized[level] = levelArray;
        });

        setResults(normalized);
        setMessage({ type: 'success', text: 'Data ujian fasa sedia ada telah dimuatkan. Anda boleh mengemaskini (overwrite) data ini.' });
      } else {
        resetResults();
        setMessage(null);
      }
    } catch (error) {
      resetResults();
      setMessage(null);
    }
    setFetching(false);
  };

  const resetResults = () => {
    const items = TEST_ITEMS[selectedSubject as keyof typeof TEST_ITEMS];
    setResults({
      Asas: new Array(items.Asas.length).fill(false),
      Sederhana: new Array(items.Sederhana.length).fill(false),
      Tinggi: new Array(items.Tinggi.length).fill(false)
    });
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
    resetResults();
  }, [selectedSubject]);

  useEffect(() => {
    fetchExistingTest();
  }, [selectedStudent, selectedSubject, selectedPhase]);

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
      const { error: testError } = await supabase
        .from('phase_tests')
        .upsert({
          student_id: selectedStudent,
          subject: selectedSubject,
          phase: selectedPhase,
          items: results,
          status,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'student_id,subject,phase'
        });

      if (testError) throw testError;

      // Audit Log
      try {
        await supabase.from('audit_logs').insert([{
          student_id: selectedStudent,
          table_name: 'phase_tests',
          action: 'UPSERT',
          old_data: null,
          new_data: { subject: selectedSubject, phase: selectedPhase, status, items: results },
          description: `Kemaskini/Simpan Ujian Pelepasan Fasa ${selectedPhase} untuk ${selectedSubject}`
        }]);
      } catch (e) {
        console.warn('Audit log failed:', e);
      }

      setMessage({ type: 'success', text: 'Ujian Pelepasan berjaya direkodkan / dikemaskini!' });
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

        <div className="space-y-8 relative">
          {fetching && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl">
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                Menyemak rekod sedia ada...
              </div>
            </div>
          )}
          {Object.entries(currentItems).map(([level, items]) => (
            <div key={level} className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full", level === 'Asas' ? 'bg-red-500' : level === 'Sederhana' ? 'bg-amber-500' : 'bg-emerald-500')} />
                {LEVEL_DISPLAY_NAMES[level]?.[selectedSubject] || `Tahap ${level}`}
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
