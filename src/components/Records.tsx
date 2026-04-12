import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, User, BookOpen, ChevronRight } from 'lucide-react';
import { CLASSES, Student, Screening, PhaseTest, cn } from '../types';
import { supabase } from '../supabase';

export default function Records() {
  const [students, setStudents] = useState<Student[]>([]);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [phaseTests, setPhaseTests] = useState<PhaseTest[]>([]);
  const [selectedClass, setSelectedClass] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

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
    
    setStudents(studentData || []);
    setScreenings(screeningData || []);
    setPhaseTests(testData || []);
  };

  useEffect(() => {
    fetchData();

    const studentsChannel = supabase.channel('records_students').on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchData()).subscribe();
    const screeningsChannel = supabase.channel('records_screenings').on('postgres_changes', { event: '*', schema: 'public', table: 'screenings' }, () => fetchData()).subscribe();
    const testsChannel = supabase.channel('records_tests').on('postgres_changes', { event: '*', schema: 'public', table: 'phase_tests' }, () => fetchData()).subscribe();

    return () => {
      supabase.removeChannel(studentsChannel);
      supabase.removeChannel(screeningsChannel);
      supabase.removeChannel(testsChannel);
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
      .sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Rekod & Sejarah Penilaian</h2>
          <p className="text-slate-500">Jejak perkembangan murid secara berfasa</p>
        </div>
        
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
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Tindakan</th>
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
                    <td className="px-6 py-4">
                      <button className="text-emerald-600 hover:text-emerald-700 text-xs font-bold flex items-center gap-1">
                        Lihat Detail <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
