import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, User, BookOpen, ChevronRight, ArrowLeft, TrendingUp, CheckCircle, AlertCircle, FileWarning, ClipboardList } from 'lucide-react';
import { CLASSES, Student, Screening, PhaseTest, cn, SUBJECTS, PHASES } from '../types';
import { supabase } from '../supabase';

export default function Records() {
  const [students, setStudents] = useState<Student[]>([]);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [phaseTests, setPhaseTests] = useState<PhaseTest[]>([]);
  const [readingRecords, setReadingRecords] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showMissingReport, setShowMissingReport] = useState(false);

  const fetchData = async () => {
    const { data: studentData } = await supabase
      .from('students')
      .select('*')
      .eq('archived', false)
      .order('name', { ascending: true });
    
    const { data: screeningData } = await supabase
      .from('screenings')
      .select('*');
    
    const { data: testData } = await supabase
      .from('phase_tests')
      .select('*');

    const { data: readingData } = await supabase
      .from('reading_records')
      .select('*');
    
    setStudents(studentData || []);
    setScreenings(screeningData || []);
    setPhaseTests(testData || []);
    setReadingRecords(readingData || []);
  };

  useEffect(() => {
    fetchData();

    const studentsChannel = supabase.channel('records_students').on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchData()).subscribe();
    const screeningsChannel = supabase.channel('records_screenings').on('postgres_changes', { event: '*', schema: 'public', table: 'screenings' }, () => fetchData()).subscribe();
    const testsChannel = supabase.channel('records_tests').on('postgres_changes', { event: '*', schema: 'public', table: 'phase_tests' }, () => fetchData()).subscribe();
    const readingChannel = supabase.channel('records_reading').on('postgres_changes', { event: '*', schema: 'public', table: 'reading_records' }, () => fetchData()).subscribe();

    return () => {
      supabase.removeChannel(studentsChannel);
      supabase.removeChannel(screeningsChannel);
      supabase.removeChannel(testsChannel);
      supabase.removeChannel(readingChannel);
    };
  }, []);

  const filteredStudents = students.filter(s => {
    const matchesClass = selectedClass === 'Semua' || s.class === selectedClass;
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const getStudentStatus = (studentId: string) => {
    const latestTest = phaseTests
      .filter(pt => pt.student_id === studentId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    
    if (latestTest) return latestTest.status;

    const screening = screenings.find(sc => sc.student_id === studentId);
    return screening ? screening.status : 'Tiada Data';
  };

  const getStatusBadge = (status: string) => {
    const base = "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider";
    if (status.includes('INTERVENSI')) return `${base} bg-red-100 text-red-700 border border-red-200`;
    if (status.includes('PENGUKUHAN')) return `${base} bg-amber-100 text-amber-700 border border-amber-200`;
    if (status.includes('PENGGAYAAN')) return `${base} bg-emerald-100 text-emerald-700 border border-emerald-200`;
    return `${base} bg-slate-100 text-slate-500`;
  };

  if (showMissingReport) {
    const missingData = students
      .filter(s => selectedClass === 'Semua' || s.class === selectedClass)
      .map(student => {
        const missingItems: { subject: string, types: string[] }[] = [];
        
        ['BM', 'EN', 'NUM'].forEach(sub => {
          const types: string[] = [];
          
          // Check screening
          const hasScreening = screenings.some(sc => sc.student_id === student.id && sc.subject === sub);
          if (!hasScreening) types.push('Saringan');
          
          // Check phases
          [1, 2, 3, 4].forEach(p => {
            const hasPhase = phaseTests.some(pt => pt.student_id === student.id && pt.subject === sub && pt.phase === p);
            if (!hasPhase) types.push(`Fasa ${p}`);
          });

          if (types.length > 0) {
            missingItems.push({ subject: sub, types });
          }
        });

        return { student, missingItems };
      })
      .filter(item => item.missingItems.length > 0);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setShowMissingReport(false)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold text-sm"
          >
            <ArrowLeft size={18} /> Kembali ke Rekod
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm font-bold">
            <AlertCircle size={16} />
            {missingData.length} Murid Dengan Data Cicir ({selectedClass})
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Laporan Keciciran Pengisian Data</h3>
            <p className="text-sm text-slate-500">Senarai murid yang belum melengkapkan Ujian Saringan atau Ujian Pelepasan (F1-F4)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Murid & Kelas</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Subjek</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Ujian Yang Belum Diisi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {missingData.map(({ student, missingItems }) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 align-top">
                      <div className="font-bold text-slate-900 text-sm">{student.name}</div>
                      <div className="text-xs text-slate-500">{student.class}</div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-6">
                        {missingItems.map(m => (
                          <div key={m.subject} className="space-y-2">
                            <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded">{m.subject}</span>
                            <div className="flex flex-wrap gap-1">
                              {m.types.map(t => (
                                <span key={t} className="text-[10px] font-bold px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center gap-2 text-xs text-red-500 font-medium mt-1">
                        <FileWarning size={14} />
                        Perlu Tindakan Segera
                      </div>
                    </td>
                  </tr>
                ))}
                {missingData.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">
                      Semua data murid bagi subjek dan fasa terpilih telah lengkap. Syabas!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (selectedStudentId) {
    const student = students.find(s => s.id === selectedStudentId);
    const studentScreenings = screenings.filter(s => s.student_id === selectedStudentId);
    const studentTests = phaseTests.filter(s => s.student_id === selectedStudentId).sort((a, b) => a.phase - b.phase);
    const studentReading = readingRecords.filter(s => s.student_id === selectedStudentId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return (
      <div className="space-y-6">
        <button 
          onClick={() => setSelectedStudentId(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold text-sm"
        >
          <ArrowLeft size={18} /> Kembali ke Senarai
        </button>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                <User size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{student?.name}</h2>
                <p className="text-slate-500 font-medium">{student?.class} • {student?.gender}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status Terkini</p>
              <span className={getStatusBadge(getStudentStatus(selectedStudentId))}>
                {getStudentStatus(selectedStudentId)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Assessment History */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-600" />
                Sejarah Penilaian (Saringan & Pelepasan)
              </h3>
              
              <div className="space-y-4">
                {/* Screening */}
                {['BM', 'EN', 'NUM'].map(sub => {
                  const screening = studentScreenings.find(s => s.subject === sub);
                  return (
                    <div key={sub} className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Saringan: {sub}</span>
                        {screening ? (
                          <span className={getStatusBadge(screening.status)}>{screening.status}</span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Tiada Rekod</span>
                        )}
                      </div>
                      {screening && (
                        <p className="text-xs text-slate-500">
                          Tarikh: {new Date(screening.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Phase Tests */}
                {studentTests.map((test, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Fasa {test.phase}: {test.subject}</span>
                      <span className={getStatusBadge(test.status)}>{test.status}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Tarikh: {new Date(test.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Reading Records */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BookOpen size={20} className="text-blue-600" />
                Rekod Bacaan Terkini
              </h3>
              
              <div className="space-y-3">
                {studentReading.map((record, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{record.status}</p>
                      <p className="text-xs text-slate-500">Kategori: {record.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">{new Date(record.created_at).toLocaleDateString()}</p>
                      {record.is_mahir && (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 justify-end">
                          <CheckCircle size={12} /> MAHIR
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {studentReading.length === 0 && (
                  <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                    <p className="text-sm text-slate-400 italic">Tiada rekod bacaan dijumpai.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Rekod & Sejarah Penilaian</h2>
          <p className="text-slate-500">Jejak perkembangan murid secara berfasa</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowMissingReport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 rounded-xl text-sm font-bold transition-all"
          >
            <ClipboardList size={18} />
            Laporan Keciciran
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Cari nama murid..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border-slate-200 text-sm w-full md:w-64"
            />
          </div>
          <select 
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="rounded-xl border-slate-200 text-sm font-medium"
          >
            <option value="Semua">Semua Kelas</option>
            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Murid</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Kelas</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Saringan</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status Semasa</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map(student => {
                const screening = screenings.find(sc => sc.student_id === student.id);
                const status = getStudentStatus(student.id);
                
                return (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <User size={16} />
                        </div>
                        <span className="text-sm font-bold text-slate-900">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">{student.class}</span>
                    </td>
                    <td className="px-6 py-4">
                      {screening ? (
                        <span className={getStatusBadge(screening.status)}>{screening.status}</span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Belum Saring</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={getStatusBadge(status)}>{status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedStudentId(student.id)}
                        className="text-emerald-600 hover:text-emerald-700 text-xs font-bold flex items-center gap-1 ml-auto"
                      >
                        Lihat Detail <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    Tiada rekod murid dijumpai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
