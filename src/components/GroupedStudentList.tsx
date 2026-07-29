import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Printer, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Users, 
  ArrowUpDown, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  BookOpen
} from 'lucide-react';
import { Student, Screening, PhaseTest, CLASSES, SUBJECTS, cn } from '../types';

interface GroupedStudentListProps {
  students: Student[];
  screenings: Screening[];
  phaseTests: PhaseTest[];
}

export type MasteryGroup = 'Intervensi' | 'Pengukuhan' | 'Penggayaan';

export type StudentGroupRecord = {
  id: string;
  studentId: string;
  studentName: string;
  tahun: string;
  kelas: string;
  subjectCode: string;
  subjectName: string;
  testTypeCode: string;
  testTypeName: string;
  group: MasteryGroup;
  rawStatus: string;
  createdAt: string;
};

const TEST_TYPE_OPTIONS = [
  { id: 'all', label: 'Semua Ujian' },
  { id: 'saringan', label: 'Ujian Saringan' },
  { id: 'fasa1', label: 'Ujian Pelepasan Fasa 1' },
  { id: 'fasa2', label: 'Ujian Pelepasan Fasa 2' },
  { id: 'fasa3', label: 'Ujian Pelepasan Fasa 3' },
  { id: 'fasa4', label: 'Ujian Pelepasan Fasa 4' },
];

export function getMasteryGroup(status: string): MasteryGroup | null {
  if (!status) return null;
  const upper = status.toUpperCase();
  if (upper.includes('INTERVENSI')) return 'Intervensi';
  if (upper.includes('PENGUKUHAN')) return 'Pengukuhan';
  if (upper.includes('PENGGAYAAN')) return 'Penggayaan';
  return null;
}

export default function GroupedStudentList({ students, screenings, phaseTests }: GroupedStudentListProps) {
  const [selectedTahun, setSelectedTahun] = useState<string>('Semua');
  const [selectedClass, setSelectedClass] = useState<string>('Semua');
  const [selectedSubject, setSelectedSubject] = useState<string>('Semua');
  const [selectedTestType, setSelectedTestType] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<'name' | 'class' | 'tahun' | 'subject' | 'test' | 'group'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter available classes based on selected Tahun
  const availableClasses = useMemo(() => {
    if (selectedTahun === 'Semua') return CLASSES;
    const digit = selectedTahun.replace('Tahun ', '');
    return CLASSES.filter(c => c.startsWith(digit));
  }, [selectedTahun]);

  // Reset class selection if current class is not in filtered list
  const handleTahunChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedTahun(val);
    setSelectedClass('Semua');
  };

  // Build all individual test results records from database
  const allRecords = useMemo(() => {
    const records: StudentGroupRecord[] = [];

    students.forEach(student => {
      const yearDigit = student.class.charAt(0);
      const tahun = `Tahun ${yearDigit}`;

      // 1. Process Screenings
      screenings
        .filter(sc => sc.student_id === student.id)
        .forEach(sc => {
          const group = getMasteryGroup(sc.status);
          if (group) {
            const subObj = SUBJECTS.find(s => s.id === sc.subject);
            records.push({
              id: `scr_${sc.id}`,
              studentId: student.id,
              studentName: student.name,
              tahun,
              kelas: student.class,
              subjectCode: sc.subject,
              subjectName: subObj ? subObj.name : sc.subject,
              testTypeCode: 'saringan',
              testTypeName: 'Ujian Saringan',
              group,
              rawStatus: sc.status,
              createdAt: sc.created_at || new Date().toISOString()
            });
          }
        });

      // 2. Process Phase Tests (Fasa 1 - 4)
      phaseTests
        .filter(pt => pt.student_id === student.id)
        .forEach(pt => {
          const group = getMasteryGroup(pt.status);
          if (group) {
            const subObj = SUBJECTS.find(s => s.id === pt.subject);
            records.push({
              id: `phase_${pt.id}`,
              studentId: student.id,
              studentName: student.name,
              tahun,
              kelas: student.class,
              subjectCode: pt.subject,
              subjectName: subObj ? subObj.name : pt.subject,
              testTypeCode: `fasa${pt.phase}`,
              testTypeName: `Ujian Pelepasan Fasa ${pt.phase}`,
              group,
              rawStatus: pt.status,
              createdAt: pt.created_at || new Date().toISOString()
            });
          }
        });
    });

    return records;
  }, [students, screenings, phaseTests]);

  // Apply filters
  const filteredRecords = useMemo(() => {
    return allRecords.filter(rec => {
      // Tahun filter
      if (selectedTahun !== 'Semua' && rec.tahun !== selectedTahun) return false;

      // Class filter
      if (selectedClass !== 'Semua' && rec.kelas !== selectedClass) return false;

      // Subject filter
      if (selectedSubject !== 'Semua' && rec.subjectCode !== selectedSubject) return false;

      // Test type filter
      if (selectedTestType !== 'all' && rec.testTypeCode !== selectedTestType) return false;

      // Mastery Group filter
      if (selectedGroup !== 'Semua' && rec.group !== selectedGroup) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = rec.studentName.toLowerCase().includes(query);
        const matchClass = rec.kelas.toLowerCase().includes(query);
        if (!matchName && !matchClass) return false;
      }

      return true;
    });
  }, [allRecords, selectedTahun, selectedClass, selectedSubject, selectedTestType, selectedGroup, searchQuery]);

  // Sorted records
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      let valA = '';
      let valB = '';

      switch (sortField) {
        case 'name':
          valA = a.studentName;
          valB = b.studentName;
          break;
        case 'class':
          valA = a.kelas;
          valB = b.kelas;
          break;
        case 'tahun':
          valA = a.tahun;
          valB = b.tahun;
          break;
        case 'subject':
          valA = a.subjectName;
          valB = b.subjectName;
          break;
        case 'test':
          valA = a.testTypeName;
          valB = b.testTypeName;
          break;
        case 'group':
          valA = a.group;
          valB = b.group;
          break;
      }

      const cmp = valA.localeCompare(valB, 'ms');
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredRecords, sortField, sortOrder]);

  // Count summaries
  const counts = useMemo(() => {
    let intervensi = 0;
    let pengukuhan = 0;
    let penggayaan = 0;

    filteredRecords.forEach(r => {
      if (r.group === 'Intervensi') intervensi++;
      else if (r.group === 'Pengukuhan') pengukuhan++;
      else if (r.group === 'Penggayaan') penggayaan++;
    });

    return {
      intervensi,
      pengukuhan,
      penggayaan,
      total: filteredRecords.length
    };
  }, [filteredRecords]);

  const toggleSort = (field: 'name' | 'class' | 'tahun' | 'subject' | 'test' | 'group') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Export CSV
  const exportCSV = () => {
    const headers = ['Bil', 'Nama Murid', 'Tahun', 'Kelas', 'Subjek', 'Jenis Ujian', 'Kumpulan Penguasaan', 'Status Detail'];
    const rows = sortedRecords.map((r, index) => [
      index + 1,
      `"${r.studentName.replace(/"/g, '""')}"`,
      `"${r.tahun}"`,
      `"${r.kelas}"`,
      `"${r.subjectName}"`,
      `"${r.testTypeName}"`,
      `"${r.group}"`,
      `"${r.rawStatus}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Senarai_Murid_Kumpulan_${selectedGroup}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Excel (.xls HTML table string)
  const exportExcel = () => {
    const headers = ['Bil.', 'Nama Murid', 'Tahun', 'Kelas', 'Subjek', 'Jenis Ujian', 'Kumpulan Penguasaan'];
    let tableHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"/><style>
      table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
      th { background-color: #0f172a; color: #ffffff; border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
      td { border: 1px solid #cbd5e1; padding: 8px; }
      .intervensi { background-color: #fee2e2; color: #991b1b; font-weight: bold; }
      .pengukuhan { background-color: #fef3c7; color: #92400e; font-weight: bold; }
      .penggayaan { background-color: #d1fae5; color: #065f46; font-weight: bold; }
    </style></head>
    <body>
      <h2>SISTEM i-LINAR SK BOLONG - SENARAI MURID MENGIKUT KUMPULAN PENGUASAAN</h2>
      <p><b>Tahun:</b> ${selectedTahun} | <b>Kelas:</b> ${selectedClass} | <b>Subjek:</b> ${selectedSubject === 'Semua' ? 'Semua Subjek' : SUBJECTS.find(s=>s.id===selectedSubject)?.name} | <b>Ujian:</b> ${TEST_TYPE_OPTIONS.find(t=>t.id===selectedTestType)?.label}</p>
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>`;

    sortedRecords.forEach((r, idx) => {
      const groupClass = r.group === 'Intervensi' ? 'intervensi' : r.group === 'Pengukuhan' ? 'pengukuhan' : 'penggayaan';
      tableHtml += `<tr>
        <td>${idx + 1}</td>
        <td>${r.studentName}</td>
        <td>${r.tahun}</td>
        <td>${r.kelas}</td>
        <td>${r.subjectName}</td>
        <td>${r.testTypeName}</td>
        <td class="${groupClass}">${r.group}</td>
      </tr>`;
    });

    tableHtml += `</tbody></table>
      <br/>
      <p><b>Ringkasan Jumlah:</b> Intervensi: ${counts.intervensi} | Pengukuhan: ${counts.pengukuhan} | Penggayaan: ${counts.penggayaan} | Jumlah Keseluruhan: ${counts.total}</p>
    </body></html>`;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Senarai_Murid_Kumpulan_${selectedGroup}_${new Date().toISOString().slice(0,10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  const getGroupBadgeClass = (group: MasteryGroup) => {
    if (group === 'Intervensi') return 'bg-red-100 text-red-800 border-red-200';
    if (group === 'Pengukuhan') return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  };

  return (
    <div className="space-y-6">
      {/* Print-Only Header */}
      <div className="hidden print:block print:p-4 mb-4 border-b pb-4">
        <h1 className="text-xl font-bold text-slate-900">SISTEM i-LINAR SK BOLONG</h1>
        <h2 className="text-lg font-bold text-slate-700">Senarai Murid Mengikut Kumpulan Penguasaan</h2>
        <div className="text-xs text-slate-600 mt-2 grid grid-cols-2 gap-1">
          <div><strong>Tahun:</strong> {selectedTahun}</div>
          <div><strong>Kelas:</strong> {selectedClass}</div>
          <div><strong>Subjek:</strong> {selectedSubject === 'Semua' ? 'Semua Subjek' : SUBJECTS.find(s=>s.id===selectedSubject)?.name}</div>
          <div><strong>Jenis Ujian:</strong> {TEST_TYPE_OPTIONS.find(t=>t.id===selectedTestType)?.label}</div>
          <div><strong>Kumpulan:</strong> {selectedGroup}</div>
          <div><strong>Tarikh Cetakan:</strong> {new Date().toLocaleDateString('ms-MY')}</div>
        </div>
      </div>

      {/* Screen Controls & Filters Header */}
      <div className="print:hidden bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="text-emerald-600" size={22} />
              Senarai Murid Mengikut Kumpulan Penguasaan
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Paparan data terkini bagi menentukan kumpulan Intervensi, Pengukuhan dan Penggayaan
            </p>
          </div>

          {/* Export & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              title="Cetak Senarai"
            >
              <Printer size={16} />
              <span>Cetak</span>
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              title="Muat Turun CSV"
            >
              <Download size={16} />
              <span>CSV</span>
            </button>
            <button
              onClick={exportExcel}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              title="Eksport ke Excel"
            >
              <FileSpreadsheet size={16} />
              <span>Eksport Excel</span>
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-4 border-t border-slate-100">
          {/* Tahun Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Tahun
            </label>
            <select
              value={selectedTahun}
              onChange={handleTahunChange}
              className="w-full rounded-xl border-slate-200 text-xs font-semibold focus:border-emerald-500 focus:ring-emerald-500"
            >
              <option value="Semua">Semua Tahun</option>
              <option value="Tahun 1">Tahun 1</option>
              <option value="Tahun 2">Tahun 2</option>
              <option value="Tahun 3">Tahun 3</option>
            </select>
          </div>

          {/* Kelas Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Kelas
            </label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full rounded-xl border-slate-200 text-xs font-semibold focus:border-emerald-500 focus:ring-emerald-500"
            >
              <option value="Semua">Semua Kelas</option>
              {availableClasses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Subjek Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Subjek
            </label>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="w-full rounded-xl border-slate-200 text-xs font-semibold focus:border-emerald-500 focus:ring-emerald-500"
            >
              <option value="Semua">Semua Subjek</option>
              {SUBJECTS.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Jenis Ujian Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Jenis Ujian
            </label>
            <select
              value={selectedTestType}
              onChange={e => setSelectedTestType(e.target.value)}
              className="w-full rounded-xl border-slate-200 text-xs font-semibold focus:border-emerald-500 focus:ring-emerald-500"
            >
              {TEST_TYPE_OPTIONS.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Kumpulan Penguasaan Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Kumpulan
            </label>
            <select
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
              className="w-full rounded-xl border-slate-200 text-xs font-semibold focus:border-emerald-500 focus:ring-emerald-500"
            >
              <option value="Semua">Semua Kumpulan</option>
              <option value="Intervensi">Intervensi</option>
              <option value="Pengukuhan">Pengukuhan</option>
              <option value="Penggayaan">Penggayaan</option>
            </select>
          </div>
        </div>

        {/* Quick Kumpulan Filter Pills & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'Semua', label: 'Semua', count: counts.total, color: 'bg-slate-100 text-slate-800' },
              { id: 'Intervensi', label: 'Intervensi', count: counts.intervensi, color: 'bg-red-50 text-red-700 border-red-200' },
              { id: 'Pengukuhan', label: 'Pengukuhan', count: counts.pengukuhan, color: 'bg-amber-50 text-amber-700 border-amber-200' },
              { id: 'Penggayaan', label: 'Penggayaan', count: counts.penggayaan, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            ].map(groupPill => (
              <button
                key={groupPill.id}
                onClick={() => setSelectedGroup(groupPill.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2",
                  selectedGroup === groupPill.id
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : `${groupPill.color} hover:opacity-80`
                )}
              >
                <span>{groupPill.label}</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded-md text-[10px] font-extrabold",
                  selectedGroup === groupPill.id ? "bg-white/20 text-white" : "bg-white text-slate-800 shadow-2xs"
                )}>
                  {groupPill.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari nama murid..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border-slate-200 text-xs font-medium focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Keseluruhan</span>
            <Users size={18} className="text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{counts.total}</div>
          <p className="text-[10px] text-slate-400 mt-1">Rekod murid terpilih</p>
        </div>

        <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Intervensi</span>
            <AlertCircle size={18} className="text-red-500" />
          </div>
          <div className="text-2xl font-black text-red-700 mt-1">{counts.intervensi}</div>
          <p className="text-[10px] text-red-500 mt-1">Perlu bimbingan khas / asas</p>
        </div>

        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Pengukuhan</span>
            <BookOpen size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-800 mt-1">{counts.pengukuhan}</div>
          <p className="text-[10px] text-amber-600 mt-1">Menguasai tahap sederhana</p>
        </div>

        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Penggayaan</span>
            <Sparkles size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-800 mt-1">{counts.penggayaan}</div>
          <p className="text-[10px] text-emerald-600 mt-1">Menguasai tahap tinggi</p>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider w-12 text-center">
                  Bil.
                </th>
                <th 
                  onClick={() => toggleSort('name')}
                  className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Nama Murid</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('tahun')}
                  className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Tahun</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('class')}
                  className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Kelas</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('subject')}
                  className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Subjek</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('test')}
                  className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Jenis Ujian</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('group')}
                  className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Kumpulan</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRecords.map((record, index) => (
                <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 text-xs text-slate-500 font-bold text-center">
                    {index + 1}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="text-xs font-bold text-slate-900">{record.studentName}</div>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium text-slate-600">
                    {record.tahun}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {record.kelas}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-xs font-medium text-slate-700">
                    {record.subjectName}
                  </td>
                  <td className="px-6 py-3.5 text-xs font-medium text-slate-600">
                    <span className="inline-block bg-slate-50 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200/60 font-semibold">
                      {record.testTypeName}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-extrabold border inline-flex items-center gap-1 tracking-wide uppercase",
                      getGroupBadgeClass(record.group)
                    )}>
                      {record.group}
                    </span>
                  </td>
                </tr>
              ))}

              {sortedRecords.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                    Tiada rekod murid dijumpai mengikut tapisan yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 print:hidden">
          <span>Memaparkan <strong>{sortedRecords.length}</strong> daripada <strong>{allRecords.length}</strong> rekod ujian</span>
          <span>Sistem i-LINAR • Data Terkini Supabase</span>
        </div>
      </div>
    </div>
  );
}
