import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Users, TrendingUp, CheckCircle, AlertCircle, Filter } from 'lucide-react';
import { CLASSES } from '../types';

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState('Semua');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/summary')
      .then(res => res.json())
      .then(data => {
        setSummary(data);
        setLoading(false);
      });
  }, []);

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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Status Kumpulan Murid (%)</h3>
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
          <h3 className="text-lg font-bold text-slate-900 mb-6">Analisis Pencapaian Mengikut Kumpulan</h3>
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
    </div>
  );
}
