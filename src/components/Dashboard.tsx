import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Users, TrendingUp, CheckCircle, AlertCircle, Filter } from 'lucide-react';
import { CLASSES, Student, Screening, PhaseTest, cn } from '../types';
import { supabase } from '../supabase';

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [phaseData, setPhaseData] = useState<any[]>([]);
  const [subjectData, setSubjectData] = useState<Record<string, any[]>>({ BM: [], EN: [], NUM: [] });
  const [selectedClass, setSelectedClass] = useState('Semua');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    
    let studentQuery = supabase.from('students').select('*').eq('archived', false);
    if (selectedClass !== 'Semua') {
      studentQuery = studentQuery.eq('class', selectedClass);
    }
    
    const { data: studentList } = await studentQuery;
    const { data: screeningList } = await supabase.from('screenings').select('*');
    const { data: phaseTestList } = await supabase.from('phase_tests').select('*');
    
    if (!studentList) return;

    const studentIds = new Set(studentList.map(s => s.id));
    const filteredScreenings = (screeningList || []).filter(s => studentIds.has(s.student_id));
    const filteredPhaseTests = (phaseTestList || []).filter(s => studentIds.has(s.student_id));
    
    // Calculate latest status for EACH subject for EACH student
    const subjects = ['BM', 'EN', 'NUM'];
    const subjectStatuses: any[] = [];
    const interventionStudents: any[] = [];

    studentList.forEach(s => {
      let studentHasIntervention = false;
      const studentLatestStatuses: Record<string, string> = {};

      subjects.forEach(sub => {
        const latestTest = filteredPhaseTests
          .filter(pt => pt.student_id === s.id && pt.subject === sub)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        
        let status = '';
        if (latestTest) {
          status = latestTest.status;
        } else {
          const screening = filteredScreenings.find(sc => sc.student_id === s.id && sc.subject === sub);
          status = screening ? screening.status : '';
        }

        if (status) {
          subjectStatuses.push(status);
          studentLatestStatuses[sub] = status;
          if (status.includes('INTERVENSI')) studentHasIntervention = true;
        }
      });

      if (studentHasIntervention) {
        interventionStudents.push({
          ...s,
          statuses: studentLatestStatuses
        });
      }
    });

    const summaryCounts: Record<string, number> = { Intervensi: 0, Pengukuhan: 0, Penggayaan: 0 };
    subjectStatuses.forEach(status => {
      if (status.includes('INTERVENSI')) summaryCounts.Intervensi++;
      else if (status.includes('PENGUKUHAN')) summaryCounts.Pengukuhan++;
      else if (status.includes('PENGGAYAAN')) summaryCounts.Penggayaan++;
    });

    setSummary({
      totalStudents: studentList.length,
      summary: summaryCounts,
      interventionList: interventionStudents.slice(0, 10) // Show top 10 for attention
    });

    const phases = ['Saringan', 'Fasa 1', 'Fasa 2', 'Fasa 3', 'Fasa 4'];
    
    // Overall Phase Analysis
    const overallPhaseAnalysis = phases.map((phaseName, idx) => {
      const counts: any = { name: phaseName, Intervensi: 0, Pengukuhan: 0, Penggayaan: 0 };
      if (idx === 0) {
        filteredScreenings.forEach(s => {
          if (s.status.includes('Intervensi')) counts.Intervensi++;
          else if (s.status.includes('Pengukuhan')) counts.Pengukuhan++;
          else if (s.status.includes('Penggayaan')) counts.Penggayaan++;
        });
      } else {
        filteredPhaseTests.filter(pt => pt.phase === idx).forEach(pt => {
          if (pt.status.includes('INTERVENSI')) counts.Intervensi++;
          else if (pt.status.includes('PENGUKUHAN')) counts.Pengukuhan++;
          else if (pt.status.includes('PENGGAYAAN')) counts.Penggayaan++;
        });
      }
      return counts;
    });
    setPhaseData(overallPhaseAnalysis);

    // Subject-Specific Analysis
    const subjectsList = ['BM', 'EN', 'NUM'];
    const subjectsData: Record<string, any[]> = {};

    subjectsList.forEach(subject => {
      subjectsData[subject] = phases.map((phaseName, idx) => {
        const counts: any = { name: phaseName, Intervensi: 0, Pengukuhan: 0, Penggayaan: 0 };
        if (idx === 0) {
          filteredScreenings.filter(s => s.subject === subject).forEach(s => {
            if (s.status.includes('Intervensi')) counts.Intervensi++;
            else if (s.status.includes('Pengukuhan')) counts.Pengukuhan++;
            else if (s.status.includes('Penggayaan')) counts.Penggayaan++;
          });
        } else {
          filteredPhaseTests.filter(pt => pt.phase === idx && pt.subject === subject).forEach(pt => {
            if (pt.status.includes('INTERVENSI')) counts.Intervensi++;
            else if (pt.status.includes('PENGUKUHAN')) counts.Pengukuhan++;
            else if (pt.status.includes('PENGGAYAAN')) counts.Penggayaan++;
          });
        }
        return counts;
      });
    });
    setSubjectData(subjectsData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const studentsChannel = supabase.channel('dashboard_students').on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchData()).subscribe();
    const screeningsChannel = supabase.channel('dashboard_screenings').on('postgres_changes', { event: '*', schema: 'public', table: 'screenings' }, () => fetchData()).subscribe();
    const testsChannel = supabase.channel('dashboard_tests').on('postgres_changes', { event: '*', schema: 'public', table: 'phase_tests' }, () => fetchData()).subscribe();

    return () => {
      supabase.removeChannel(studentsChannel);
      supabase.removeChannel(screeningsChannel);
      supabase.removeChannel(testsChannel);
    };
  }, [selectedClass]);

  if (loading) return <div className="flex justify-center items-center h-64">Memuatkan data...</div>;

  const pieData = [
    { name: 'Intervensi', value: summary?.summary?.Intervensi || 0, color: '#ef4444' },
    { name: 'Pengukuhan', value: summary?.summary?.Pengukuhan || 0, color: '#f59e0b' },
    { name: 'Penggayaan', value: summary?.summary?.Penggayaan || 0, color: '#10b981' },
  ];

  const stats = [
    { label: 'Jumlah Murid', value: summary?.totalStudents || 0, icon: Users, color: 'bg-blue-500' },
    { label: 'Intervensi', value: summary?.summary?.Intervensi || 0, icon: AlertCircle, color: 'bg-red-500' },
    { label: 'Pengukuhan', value: summary?.summary?.Pengukuhan || 0, icon: TrendingUp, color: 'bg-amber-500' },
    { label: 'Penggayaan', value: summary?.summary?.Penggayaan || 0, icon: CheckCircle, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard Analisis Utama</h2>
          <p className="text-slate-500">Analisis real-time Program i-LINAR 2026</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <Filter size={18} className="text-slate-400" />
          <select 
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-transparent border-none text-sm font-medium focus:ring-0"
          >
            <option value="Semua">Semua Kelas</option>
            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`${stat.color} p-3 rounded-xl text-white`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Phase Analysis Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900">Analisis Keberkesanan Program (Keseluruhan)</h3>
          <div className="flex gap-4 text-xs font-bold uppercase tracking-wider">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-500 rounded-sm" /> Intervensi</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-amber-500 rounded-sm" /> Pengukuhan</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-500 rounded-sm" /> Penggayaan</div>
          </div>
        </div>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={phaseData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="top" align="right" height={36}/>
              <Bar dataKey="Intervensi" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Pengukuhan" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Penggayaan" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Subject Specific Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {[
          { id: 'BM', title: 'Literasi Bahasa Melayu', data: subjectData.BM },
          { id: 'EN', title: 'English Literacy', data: subjectData.EN },
          { id: 'NUM', title: 'Numerasi', data: subjectData.NUM }
        ].map((subject) => (
          <div key={subject.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-md font-bold text-slate-900 mb-4">{subject.title}</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subject.data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '12px' }}
                  />
                  <Bar dataKey="Intervensi" stackId="a" fill="#ef4444" />
                  <Bar dataKey="Pengukuhan" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="Penggayaan" stackId="a" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Status Semasa (%)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Pencapaian Terkini Mengikut Kumpulan</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pieData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Attention List */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <AlertCircle size={20} className="text-red-500" />
          Senarai Murid Perlu Perhatian (Kumpulan Intervensi Terkini)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Nama Murid</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Kelas</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status Terkini (BM / EN / NUM)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary?.interventionList?.map((student: any) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-slate-900">{student.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">{student.class}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {['BM', 'EN', 'NUM'].map(sub => {
                        const status = student.statuses[sub] || 'Tiada';
                        return (
                          <span key={sub} className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded border",
                            status.includes('INTERVENSI') ? "bg-red-50 text-red-700 border-red-100" :
                            status.includes('PENGUKUHAN') ? "bg-amber-50 text-amber-700 border-amber-100" :
                            status.includes('PENGGAYAAN') ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                          )}>
                            {sub}: {status}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
              {(!summary?.interventionList || summary.interventionList.length === 0) && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-400 italic">
                    Tiada murid dalam kumpulan intervensi buat masa ini. Syabas!
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
