import React, { useState, useEffect } from 'react';
import { Printer, Search, FileText, User, Calendar, BookOpen, GraduationCap } from 'lucide-react';
import { Student, Screening, PhaseTest, ReadingRecord, cn } from '../types';

export default function StudentSlip() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentData, setStudentData] = useState<{
    student: Student;
    screenings: Screening[];
    phaseTests: PhaseTest[];
    readingRecords: ReadingRecord[];
  } | null>(null);

  useEffect(() => {
    fetch('/api/students').then(res => res.json()).then(setStudents);
  }, []);

  const handleFetchData = async (id: string) => {
    setSelectedStudentId(id);
    if (!id) {
      setStudentData(null);
      return;
    }

    const [scRes, ptRes, rrRes] = await Promise.all([
      fetch('/api/screenings').then(res => res.json()),
      fetch('/api/phase-tests').then(res => res.json()),
      fetch('/api/reading-records').then(res => res.json())
    ]);

    const student = students.find(s => s.id === parseInt(id))!;
    const studentScreenings = scRes.filter((s: any) => s.student_id === parseInt(id));
    const studentPhaseTests = ptRes.filter((s: any) => s.student_id === parseInt(id));
    const studentReading = rrRes.filter((s: any) => s.student_id === parseInt(id));

    setStudentData({
      student,
      screenings: studentScreenings,
      phaseTests: studentPhaseTests,
      readingRecords: studentReading
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusColor = (status: string) => {
    if (status.includes('INTERVENSI')) return 'text-red-600';
    if (status.includes('PENGUKUHAN')) return 'text-amber-600';
    if (status.includes('PENGGAYAAN')) return 'text-emerald-600';
    return 'text-slate-600';
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4 flex-grow max-w-md">
          <Search className="text-slate-400" size={20} />
          <select 
            value={selectedStudentId}
            onChange={e => handleFetchData(e.target.value)}
            className="w-full rounded-xl border-slate-200 text-sm"
          >
            <option value="">-- Pilih Murid untuk Jana Slip --</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.class})</option>)}
          </select>
        </div>
        
        <button
          onClick={handlePrint}
          disabled={!studentData}
          className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
        >
          <Printer size={18} />
          Cetak Slip
        </button>
      </div>

      {studentData ? (
        <div className="bg-white p-12 rounded-none border border-slate-200 shadow-lg max-w-4xl mx-auto print:shadow-none print:border-none print:p-0" id="printable-slip">
          {/* Slip Header */}
          <div className="flex items-center justify-between border-b-4 border-slate-900 pb-6 mb-8">
            <div className="flex items-center gap-6">
              <img src="https://iili.io/fgc1zoF.jpg" alt="Logo" className="h-24 w-auto" />
              <div>
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">SLIP PRESTASI i-LINAR</h1>
                <p className="text-sm font-bold text-slate-500 uppercase">SK BOLONG, TUARAN • TAHUN 2026</p>
                <p className="text-xs font-medium text-emerald-600 tracking-widest mt-1">"SKBT TA’ATAIKU"</p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-slate-900 text-white px-4 py-2 rounded-lg inline-block">
                <span className="text-xs font-bold block uppercase opacity-70">Tarikh Cetakan</span>
                <span className="text-sm font-black">{new Date().toLocaleDateString('ms-MY')}</span>
              </div>
            </div>
          </div>

          {/* Student Info */}
          <div className="grid grid-cols-2 gap-8 mb-10 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User size={18} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nama Murid</span>
              </div>
              <p className="text-lg font-black text-slate-900 uppercase">{studentData.student.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Kelas</span>
                <p className="text-sm font-bold text-slate-900">{studentData.student.class}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Jantina</span>
                <p className="text-sm font-bold text-slate-900">{studentData.student.gender}</p>
              </div>
            </div>
          </div>

          {/* Assessment Results */}
          <div className="space-y-10">
            {/* Screening Section */}
            <section>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                Keputusan Ujian Saringan (Awal Tahun)
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {['BM', 'EN', 'NUM'].map(sub => {
                  const sc = studentData.screenings.find(s => s.subject === sub);
                  return (
                    <div key={sub} className="border border-slate-200 p-4 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{sub === 'BM' ? 'B. Melayu' : sub === 'EN' ? 'English' : 'Numerasi'}</span>
                      <p className={cn("text-sm font-black uppercase", getStatusColor(sc?.status || ''))}>
                        {sc?.status || 'TIADA REKOD'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Phase Tests Section */}
            <section>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                Perkembangan Ujian Pelepasan (Berfasa)
              </h3>
              <div className="overflow-hidden border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Fasa</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Literasi BM</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">English Literacy</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Numerasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[1, 2, 3, 4].map(phase => (
                      <tr key={phase}>
                        <td className="px-4 py-3 text-xs font-bold text-slate-900">Fasa {phase}</td>
                        {['BM', 'EN', 'NUM'].map(sub => {
                          const test = studentData.phaseTests.find(pt => pt.phase === phase && pt.subject === sub);
                          return (
                            <td key={sub} className="px-4 py-3">
                              <span className={cn("text-[10px] font-bold uppercase", getStatusColor(test?.status || ''))}>
                                {test?.status || '-'}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Reading Progress */}
            <section>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                Rekod Perkembangan Bacaan
              </h3>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex gap-12">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Kategori Terkini</span>
                      <p className="text-sm font-black text-slate-900">
                        {studentData.readingRecords[studentData.readingRecords.length - 1]?.category || 'TIADA DATA'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Status Bacaan</span>
                      <p className="text-sm font-black text-slate-900">
                        {studentData.readingRecords[studentData.readingRecords.length - 1]?.status || 'TIADA DATA'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {studentData.readingRecords.some(r => r.is_mahir) && (
                      <div className="bg-emerald-600 text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                        Mahir Membaca
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Slip Footer */}
          <div className="mt-16 pt-8 border-t border-slate-200 grid grid-cols-2 gap-12 text-center">
            <div>
              <div className="h-20 border-b border-slate-300 mb-2"></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Tandatangan Guru Kelas</p>
            </div>
            <div>
              <div className="h-20 border-b border-slate-300 mb-2"></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Tandatangan Guru Besar / PK1</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-20 rounded-2xl border border-slate-200 shadow-sm text-center">
          <FileText size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-medium italic">Sila pilih murid untuk memaparkan slip prestasi.</p>
        </div>
      )}
    </div>
  );
}
