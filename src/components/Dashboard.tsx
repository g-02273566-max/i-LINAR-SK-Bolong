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
  const [classAnalysisData, setClassAnalysisData] = useState<any[]>([]);
  const [selectedPhaseForClass, setSelectedPhaseForClass] = useState(0);
  const [selectedSubjectForClass, setSelectedSubjectForClass] = useState('BM');
  const [selectedClass, setSelectedClass] = useState('Semua');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    
    let studentQuery = supabase.from('students').select('*').eq('archived', false);
    
    const { data: studentList } = await studentQuery;
    const { data: screeningList } = await supabase.from('screenings').select('*');
    const { data: phaseTestList } = await supabase.from('phase_tests').select('*');
    
    if (!studentList) return;

    // Filter students for the main dashboard class filter
    const dashboardStudents = selectedClass === 'Semua' 
      ? studentList 
      : studentList.filter(s => s.class === selectedClass);

    const studentIdsForDashboard = new Set(dashboardStudents.map(s => s.id));
    const filteredScreenings = (screeningList || []).filter(s => studentIdsForDashboard.has(s.student_id));
    const filteredPhaseTests = (phaseTestList || []).filter(s => studentIdsForDashboard.has(s.student_id));
    
    // Calculate latest status for EACH subject for EACH student (Respecting Class Filter)
    const subjectsList = ['BM', 'EN', 'NUM'];
    const subjectSummaries: Record<string, Record<string, number>> = {
      BM: { Intervensi: 0, Pengukuhan: 0, Penggayaan: 0 },
      EN: { Intervensi: 0, Pengukuhan: 0, Penggayaan: 0 },
      NUM: { Intervensi: 0, Pengukuhan: 0, Penggayaan: 0 },
    };
    const tripleInterventionStudents: any[] = [];

    dashboardStudents.forEach(s => {
      let interventionCount = 0;
      const studentLatestStatuses: Record<string, string> = {};

      subjectsList.forEach(sub => {
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
          studentLatestStatuses[sub] = status;
          const upStatus = status.toUpperCase();
          if (upStatus.includes('INTERVENSI')) {
            subjectSummaries[sub].Intervensi++;
            interventionCount++;
          }
          else if (upStatus.includes('PENGUKUHAN')) subjectSummaries[sub].Pengukuhan++;
          else if (upStatus.includes('PENGGAYAAN')) subjectSummaries[sub].Penggayaan++;
        }
      });

      if (interventionCount === 3) {
        tripleInterventionStudents.push({
          ...s,
          statuses: studentLatestStatuses
        });
      }
    });

    setSummary({
      totalStudents: dashboardStudents.length,
      subjectSummaries,
      interventionList: tripleInterventionStudents.slice(0, 10)
    });

    const phases = ['Saringan', 'Fasa 1', 'Fasa 2', 'Fasa 3', 'Fasa 4'];
    
    // Helper to get latest status per student+subject for a specific phase
    const getPhaseCounts = (pIdx: number, subjectFilter?: string, classFilter?: string) => {
      const counts = { Intervensi: 0, Pengukuhan: 0, Penggayaan: 0 };
      const latestMap = new Map<string, string>();
      
      // Filter students by class if provided
      const relevantStudents = classFilter && classFilter !== 'Semua'
        ? studentList.filter(s => s.class === classFilter)
        : dashboardStudents;
      
      const relevantStudentIds = new Set(relevantStudents.map(s => s.id));

      if (pIdx === 0) {
        (screeningList || [])
          .filter(s => relevantStudentIds.has(s.student_id) && (!subjectFilter || s.subject === subjectFilter))
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .forEach(s => latestMap.set(`${s.student_id}_${s.subject}`, s.status));
      } else {
        (phaseTestList || [])
          .filter(pt => relevantStudentIds.has(pt.student_id) && pt.phase === pIdx && (!subjectFilter || pt.subject === subjectFilter))
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .forEach(pt => latestMap.set(`${pt.student_id}_${pt.subject}`, pt.status));
      }

      latestMap.forEach(status => {
        const upStatus = status.toUpperCase();
        if (upStatus.includes('INTERVENSI')) counts.Intervensi++;
        else if (upStatus.includes('PENGUKUHAN')) counts.Pengukuhan++;
        else if (upStatus.includes('PENGGAYAAN')) counts.Penggayaan++;
      });
      return counts;
    };

    // Overall Phase Analysis
    const overallPhaseAnalysis = phases.map((phaseName, idx) => ({
      name: phaseName,
      ...getPhaseCounts(idx)
    }));
    setPhaseData(overallPhaseAnalysis);

    // Subject-Specific Analysis
    const subjectsDataMap: Record<string, any[]> = {};
    subjectsList.forEach(subject => {
      subjectsDataMap[subject] = phases.map((phaseName, idx) => ({
        name: phaseName,
        ...getPhaseCounts(idx, subject)
      }));
    });
    setSubjectData(subjectsDataMap);

    // Class breakdown for the selected class analysis settings
    const classAnalysis = CLASSES.map(c => ({
      name: c,
      ...getPhaseCounts(selectedPhaseForClass, selectedSubjectForClass, c)
    }));
    setClassAnalysisData(classAnalysis);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedClass, selectedPhaseForClass, selectedSubjectForClass]);

  useEffect(() => {
    const studentsChannel = supabase.channel('dashboard_students').on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchData()).subscribe();
    const screeningsChannel = supabase.channel('dashboard_screenings').on('postgres_changes', { event: '*', schema: 'public', table: 'screenings' }, () => fetchData()).subscribe();
    const testsChannel = supabase.channel('dashboard_tests').on('postgres_changes', { event: '*', schema: 'public', table: 'phase_tests' }, () => fetchData()).subscribe();

    return () => {
      supabase.removeChannel(studentsChannel);
      supabase.removeChannel(screeningsChannel);
      supabase.removeChannel(testsChannel);
    };
  }, []);

  if (loading) return <div className="flex justify-center items-center h-64">Memuatkan data...</div>;

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

      {/* Subject Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { id: 'BM', title: 'Literasi BM', color: 'blue' },
          { id: 'EN', title: 'English Literacy', color: 'indigo' },
          { id: 'NUM', title: 'Numerasi', color: 'violet' }
        ].map((sub) => {
          const data = summary?.subjectSummaries[sub.id] || { Intervensi: 0, Pengukuhan: 0, Penggayaan: 0 };
          return (
            <div key={sub.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900">{sub.title}</h3>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{summary?.totalStudents} Murid</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-center">
                  <p className="text-[10px] font-bold text-red-500 uppercase">INT</p>
                  <p className="text-lg font-bold text-red-700">{data.Intervensi}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
                  <p className="text-[10px] font-bold text-amber-500 uppercase">KUK</p>
                  <p className="text-lg font-bold text-amber-700">{data.Pengukuhan}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                  <p className="text-[10px] font-bold text-emerald-500 uppercase">GAYA</p>
                  <p className="text-lg font-bold text-emerald-700">{data.Penggayaan}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall Phase Analysis Chart */}
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

      {/* Class Analysis Breakdown */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Analisis Penguasaan Mengikut Kelas</h3>
            <p className="text-xs text-slate-500 mt-1">Gunakan kawalan di bawah untuk menapis graf mengikut ujian dan fasa</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select 
              value={selectedPhaseForClass}
              onChange={(e) => setSelectedPhaseForClass(Number(e.target.value))}
              className="text-xs font-bold border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50"
            >
              <option value={0}>Ujian Saringan</option>
              <option value={1}>Fasa 1</option>
              <option value={2}>Fasa 2</option>
              <option value={3}>Fasa 3</option>
              <option value={4}>Fasa 4</option>
            </select>
            <select 
              value={selectedSubjectForClass}
              onChange={(e) => setSelectedSubjectForClass(e.target.value)}
              className="text-xs font-bold border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50"
            >
              <option value="BM">Literasi BM</option>
              <option value="EN">English Literacy</option>
              <option value="NUM">Numerasi</option>
            </select>
          </div>
        </div>

        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={classAnalysisData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} fontSize={12} fontWeight="bold" />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="top" align="right" />
              <Bar dataKey="Intervensi" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Pengukuhan" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Penggayaan" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
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

      {/* Charts Grid - Subject Specific */}
      <div className="space-y-8">
        {[
          { id: 'BM', title: 'Literasi Bahasa Melayu' },
          { id: 'EN', title: 'English Literacy' },
          { id: 'NUM', title: 'Numerasi' }
        ].map((sub) => {
          const data = summary?.subjectSummaries[sub.id] || { Intervensi: 0, Pengukuhan: 0, Penggayaan: 0 };
          const chartData = [
            { name: 'Intervensi', value: data.Intervensi, color: '#ef4444' },
            { name: 'Pengukuhan', value: data.Pengukuhan, color: '#f59e0b' },
            { name: 'Penggayaan', value: data.Penggayaan, color: '#10b981' },
          ];

          return (
            <div key={sub.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">{sub.title}</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Status Semasa (%)</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Pencapaian Terkini</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Attention List */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <AlertCircle size={20} className="text-red-500" />
          Senarai Murid Perlu Perhatian (Intervensi di Ketiga-tiga Ujian)
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
