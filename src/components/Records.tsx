import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Filter, Calendar, User, BookOpen, ChevronRight, ArrowLeft, 
  TrendingUp, CheckCircle, AlertCircle, FileWarning, ClipboardList, 
  Users, UserCheck, Printer, CheckCircle2, XCircle 
} from 'lucide-react';
import { CLASSES, Student, Screening, PhaseTest, ReadingRecord, cn, SUBJECTS, PHASES } from '../types';
import { supabase, fetchAllRows } from '../supabase';
import GroupedStudentList from './GroupedStudentList';

export default function Records() {
  const [students, setStudents] = useState<Student[]>([]);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [phaseTests, setPhaseTests] = useState<PhaseTest[]>([]);
  const [readingRecords, setReadingRecords] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'individual' | 'grouped' | 'missing'>('individual');

  // Laporan Keciciran Filters & State
  const [missingTestFilter, setMissingTestFilter] = useState<'fasa2' | 'fasa1' | 'saringan' | 'active_phases' | 'all'>('fasa2');
  const [missingSubjectFilter, setMissingSubjectFilter] = useState<string>('Semua');
  const [missingSearchQuery, setMissingSearchQuery] = useState<string>('');
  const [missingViewMode, setMissingViewMode] = useState<'cicir' | 'lengkap' | 'all'>('cicir');

  const fetchData = async () => {
    try {
      const [studentData, screeningData, testData, readingData] = await Promise.all([
        fetchAllRows<Student>('students', (q) => q.eq('archived', false).order('name', { ascending: true })),
        fetchAllRows<Screening>('screenings'),
        fetchAllRows<PhaseTest>('phase_tests'),
        fetchAllRows<ReadingRecord>('reading_records'),
      ]);
      
      setStudents(studentData || []);
      setScreenings(screeningData || []);
      setPhaseTests(testData || []);
      setReadingRecords(readingData || []);
    } catch (err) {
      console.error('Error fetching data in Records:', err);
    }
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
    const studentTests = phaseTests.filter(pt => pt.student_id === studentId);
    const latestTest = studentTests.sort((a, b) => {
      if (b.phase !== a.phase) return b.phase - a.phase;
      const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
      const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
      return timeB - timeA;
    })[0];
    
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

  // Sub-tab Navigation rendering
  const renderSubTabs = () => (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4 mb-6">
      <button
        onClick={() => { setActiveSubTab('individual'); setSelectedStudentId(null); }}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all",
          activeSubTab === 'individual'
            ? "bg-slate-900 text-white shadow-sm"
            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
        )}
      >
        <UserCheck size={16} />
        <span>Rekod Individu Murid</span>
      </button>

      <button
        onClick={() => { setActiveSubTab('grouped'); setSelectedStudentId(null); }}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all",
          activeSubTab === 'grouped'
            ? "bg-slate-900 text-white shadow-sm"
            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
        )}
      >
        <Users size={16} />
        <span>Senarai Murid Mengikut Kumpulan</span>
      </button>

      <button
        onClick={() => { setActiveSubTab('missing'); setSelectedStudentId(null); }}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all",
          activeSubTab === 'missing'
            ? "bg-slate-900 text-white shadow-sm"
            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
        )}
      >
        <ClipboardList size={16} />
        <span>Laporan Keciciran Data</span>
      </button>
    </div>
  );

  // Missing data analysis calculation
  const missingAnalysis = useMemo(() => {
    const targetStudents = students.filter(s => selectedClass === 'Semua' || s.class === selectedClass);
    const subjectsToCheck = missingSubjectFilter === 'Semua' ? ['BM', 'EN', 'NUM'] : [missingSubjectFilter];

    const missingList: { student: Student; missingItems: { subject: string; types: string[] }[]; completedItems: { subject: string; types: string[] }[] }[] = [];
    const completedList: { student: Student; completedItems: { subject: string; types: string[] }[] }[] = [];

    targetStudents.forEach(student => {
      const missingItems: { subject: string; types: string[] }[] = [];
      const completedItems: { subject: string; types: string[] }[] = [];

      subjectsToCheck.forEach(sub => {
        const missingTypes: string[] = [];
        const completedTypes: string[] = [];

        // Check based on selected assessment scope
        if (missingTestFilter === 'saringan' || missingTestFilter === 'active_phases' || missingTestFilter === 'all') {
          const hasSc = screenings.some(sc => sc.student_id === student.id && sc.subject === sub);
          if (hasSc) completedTypes.push('Saringan');
          else missingTypes.push('Saringan');
        }

        if (missingTestFilter === 'fasa1' || missingTestFilter === 'active_phases' || missingTestFilter === 'all') {
          const hasP1 = phaseTests.some(pt => pt.student_id === student.id && pt.subject === sub && pt.phase === 1);
          if (hasP1) completedTypes.push('Fasa 1');
          else missingTypes.push('Fasa 1');
        }

        if (missingTestFilter === 'fasa2' || missingTestFilter === 'active_phases' || missingTestFilter === 'all') {
          const hasP2 = phaseTests.some(pt => pt.student_id === student.id && pt.subject === sub && pt.phase === 2);
          if (hasP2) completedTypes.push('Fasa 2');
          else missingTypes.push('Fasa 2');
        }

        if (missingTestFilter === 'all') {
          [3, 4].forEach(p => {
            const hasP = phaseTests.some(pt => pt.student_id === student.id && pt.subject === sub && pt.phase === p);
            if (hasP) completedTypes.push(`Fasa ${p}`);
            else missingTypes.push(`Fasa ${p}`);
          });
        }

        if (missingTypes.length > 0) {
          missingItems.push({ subject: sub, types: missingTypes });
        }
        if (completedTypes.length > 0) {
          completedItems.push({ subject: sub, types: completedTypes });
        }
      });

      if (missingItems.length > 0) {
        missingList.push({ student, missingItems, completedItems });
      } else {
        completedList.push({ student, completedItems });
      }
    });

    return {
      total: targetStudents.length,
      missingList,
      completedList,
      completionRate: targetStudents.length > 0 
        ? ((completedList.length / targetStudents.length) * 100).toFixed(1) 
        : '0.0'
    };
  }, [students, screenings, phaseTests, selectedClass, missingTestFilter, missingSubjectFilter]);

  if (activeSubTab === 'missing') {
    // Filter by search query if any
    const query = missingSearchQuery.toLowerCase().trim();
    const displayMissing = missingAnalysis.missingList.filter(item => 
      !query || item.student.name.toLowerCase().includes(query) || item.student.class.toLowerCase().includes(query)
    );
    const displayCompleted = missingAnalysis.completedList.filter(item => 
      !query || item.student.name.toLowerCase().includes(query) || item.student.class.toLowerCase().includes(query)
    );

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Rekod & Sejarah Penilaian</h2>
            <p className="text-slate-500">Jejak perkembangan murid secara berfasa</p>
          </div>
          <button
            onClick={() => window.print()}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Printer size={15} /> Cetak Laporan
          </button>
        </div>

        {renderSubTabs()}

        {/* Filter Controls Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Filter size={16} className="text-emerald-600" />
                Penapis Semakan Keciciran
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih sasaran ujian untuk mengenal pasti murid yang belum melengkapkan pengisian.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kelas:</span>
              <select 
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="rounded-xl border-slate-200 text-xs font-bold bg-slate-50 px-3 py-2"
              >
                <option value="Semua">Semua Kelas</option>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Sasaran Ujian / Fasa
              </label>
              <select 
                value={missingTestFilter}
                onChange={e => setMissingTestFilter(e.target.value as any)}
                className="w-full rounded-xl border-slate-200 text-xs font-bold bg-slate-50 px-3 py-2"
              >
                <option value="fasa2">★ Ujian Pelepasan Fasa 2 (Semasa)</option>
                <option value="active_phases">Fasa Berlangsung (Saringan, F1 & F2)</option>
                <option value="fasa1">Ujian Pelepasan Fasa 1</option>
                <option value="saringan">Ujian Saringan</option>
                <option value="all">Semua Fasa Lengkap (Saringan - F4)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Subjek
              </label>
              <select 
                value={missingSubjectFilter}
                onChange={e => setMissingSubjectFilter(e.target.value)}
                className="w-full rounded-xl border-slate-200 text-xs font-bold bg-slate-50 px-3 py-2"
              >
                <option value="Semua">Semua Subjek (BM, EN, NUM)</option>
                <option value="BM">Literasi BM</option>
                <option value="EN">English Literacy</option>
                <option value="NUM">Numerasi</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Cari Murid
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={missingSearchQuery}
                  onChange={e => setMissingSearchQuery(e.target.value)}
                  placeholder="Nama murid..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border-slate-200 text-xs bg-slate-50 font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Jumlah Murid</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{missingAnalysis.total}</span>
              <span className="text-xs text-slate-500 font-medium">({selectedClass})</span>
            </div>
          </div>

          <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200 shadow-sm">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Selesai / Lengkap
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-800">{missingAnalysis.completedList.length}</span>
              <span className="text-xs font-bold text-emerald-700">Murid</span>
            </div>
          </div>

          <div className="bg-red-50/70 p-5 rounded-2xl border border-red-200 shadow-sm">
            <span className="text-xs font-bold text-red-700 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
              <AlertCircle size={14} /> Belum Lengkap (Cicir)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-red-800">{missingAnalysis.missingList.length}</span>
              <span className="text-xs font-bold text-red-700">Murid</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Kadar Pengisian</span>
              <span className="text-2xl font-black text-slate-900">{missingAnalysis.completionRate}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
              <div 
                className={cn(
                  "h-2 rounded-full transition-all",
                  Number(missingAnalysis.completionRate) >= 90 ? "bg-emerald-500" :
                  Number(missingAnalysis.completionRate) >= 60 ? "bg-amber-500" : "bg-red-500"
                )}
                style={{ width: `${missingAnalysis.completionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setMissingViewMode('cicir')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
              missingViewMode === 'cicir'
                ? "bg-red-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
          >
            <AlertCircle size={14} />
            <span>Murid Belum Lengkap ({missingAnalysis.missingList.length})</span>
          </button>

          <button
            onClick={() => setMissingViewMode('lengkap')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
              missingViewMode === 'lengkap'
                ? "bg-emerald-700 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
          >
            <CheckCircle2 size={14} />
            <span>Murid Rekod Lengkap ({missingAnalysis.completedList.length})</span>
          </button>

          <button
            onClick={() => setMissingViewMode('all')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
              missingViewMode === 'all'
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
          >
            <span>Semua Murid ({missingAnalysis.total})</span>
          </button>
        </div>

        {/* Missing Table */}
        {(missingViewMode === 'cicir' || missingViewMode === 'all') && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  Senarai Murid Cicir Pengisian Data
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sasaran: {
                    missingTestFilter === 'fasa2' ? 'Ujian Pelepasan Fasa 2 (Semasa)' :
                    missingTestFilter === 'active_phases' ? 'Saringan, Fasa 1 & Fasa 2' :
                    missingTestFilter === 'fasa1' ? 'Ujian Pelepasan Fasa 1' :
                    missingTestFilter === 'saringan' ? 'Ujian Saringan' : 'Semua Fasa (Saringan - F4)'
                  } • {missingSubjectFilter === 'Semua' ? 'Semua Subjek' : missingSubjectFilter}
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-red-50 text-red-700 border border-red-100 rounded-full self-start sm:self-auto">
                {displayMissing.length} Murid Perlu Tindakan
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest w-1/3">Murid & Kelas</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Ujian Yang Belum Lengkap</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayMissing.map(({ student, missingItems }) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 align-top">
                        <div className="font-bold text-slate-900 text-sm">{student.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">{student.class}</span>
                          <span>{student.gender}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="space-y-3">
                          {missingItems.map(m => (
                            <div key={m.subject} className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-black bg-slate-900 text-white px-2 py-0.5 rounded">
                                {m.subject}
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {m.types.map(t => (
                                  <span key={t} className="text-[11px] font-bold px-2.5 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-full flex items-center gap-1">
                                    <XCircle size={12} /> Belum Isi: {t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top text-right">
                        <button
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            setActiveSubTab('individual');
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 rounded-xl text-xs font-bold transition-all"
                        >
                          Lihat Rekod
                        </button>
                      </td>
                    </tr>
                  ))}
                  {displayMissing.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                        <div className="max-w-md mx-auto space-y-2">
                          <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
                          <p className="text-sm font-bold text-slate-900">
                            Tiada Keciciran Data Dikesan!
                          </p>
                          <p className="text-xs text-slate-500">
                            Semua murid bagi kriteria tapisan ini telah lengkap menjalani penilaian. Syabas dan tahniah!
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Completed Table */}
        {(missingViewMode === 'lengkap' || (missingViewMode === 'all' && displayCompleted.length > 0)) && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Senarai Murid Yang Lengkap Pengisian
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Murid yang telah melengkapkan penilaian bagi sasaran yang dipilih
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full">
                {displayCompleted.length} Murid Selesai
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest w-1/3">Murid & Kelas</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status Pengisian</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayCompleted.map(({ student, completedItems }) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 align-top">
                        <div className="font-bold text-slate-900 text-sm">{student.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">{student.class}</span>
                          <span>{student.gender}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full flex items-center gap-1">
                            <CheckCircle2 size={12} /> Lengkap Disimpan
                          </span>
                          <span className="text-xs text-slate-500">
                            (Termasuk {
                              missingTestFilter === 'fasa2' ? 'Ujian Pelepasan Fasa 2' :
                              missingTestFilter === 'fasa1' ? 'Ujian Pelepasan Fasa 1' :
                              missingTestFilter === 'saringan' ? 'Ujian Saringan' : 'Semua Ujian Sasaran'
                            })
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top text-right">
                        <button
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            setActiveSubTab('individual');
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 rounded-xl text-xs font-bold transition-all"
                        >
                          Lihat Rekod
                        </button>
                      </td>
                    </tr>
                  ))}
                  {displayCompleted.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">
                        Tiada murid dalam senarai lengkap bagi tapisan ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeSubTab === 'grouped') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Rekod & Sejarah Penilaian</h2>
          <p className="text-slate-500">Jejak perkembangan murid secara berfasa</p>
        </div>

        {renderSubTabs()}

        <GroupedStudentList 
          students={students} 
          screenings={screenings} 
          phaseTests={phaseTests} 
        />
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
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Rekod & Sejarah Penilaian</h2>
        <p className="text-slate-500">Jejak perkembangan murid secara berfasa</p>
      </div>

      {renderSubTabs()}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          Rekod Individu Murid
        </h3>
        
        <div className="flex flex-wrap gap-2">
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
