import React, { useState, useEffect } from 'react';
import { BookOpen, Check, TrendingUp, User, Search } from 'lucide-react';
import { CLASSES, Student, cn } from '../types';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, where, serverTimestamp, orderBy } from 'firebase/firestore';

export default function Reading() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedClass, setSelectedClass] = useState('Semua');
  const [readingStatus, setReadingStatus] = useState('Bacaan Lambat');
  const [category, setCategory] = useState('Rendah');
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    const unsubStudents = onSnapshot(query(collection(db, 'students'), where('archived', '==', false)), (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Student[]);
    });

    const unsubRecords = onSnapshot(query(collection(db, 'reading_records'), orderBy('created_at', 'desc')), (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubStudents();
      unsubRecords();
    };
  }, []);

  const filteredStudents = students.filter(s => selectedClass === 'Semua' || s.class === selectedClass);

  const handleSubmit = async () => {
    if (!selectedStudent) return;
    setLoading(true);
    
    const isMahir = category === 'Tinggi' && readingStatus === 'Bacaan Lancar';
    
    try {
      await addDoc(collection(db, 'reading_records'), {
        student_id: selectedStudent,
        category,
        status: readingStatus,
        is_mahir: isMahir,
        created_at: serverTimestamp()
      });
      setSelectedStudent('');
    } catch (error) {
      console.error("Error saving reading record:", error);
    }
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen size={20} className="text-emerald-600" />
            Rekod Bacaan Baharu
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kelas</label>
              <select 
                value={selectedClass} 
                onChange={e => setSelectedClass(e.target.value)}
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
                {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kategori Bahan</label>
              <div className="grid grid-cols-3 gap-2">
                {['Rendah', 'Sederhana', 'Tinggi'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={cn(
                      "py-2 text-[10px] font-bold rounded-lg border uppercase tracking-wider",
                      category === cat ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tahap Bacaan</label>
              <div className="space-y-2">
                {['Bacaan Lambat', 'Bacaan Sederhana', 'Bacaan Lancar'].map(status => (
                  <button
                    key={status}
                    onClick={() => setReadingStatus(status)}
                    className={cn(
                      "w-full py-3 px-4 text-left text-sm font-bold rounded-xl border flex items-center justify-between",
                      readingStatus === status ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-slate-100 text-slate-600"
                    )}
                  >
                    {status}
                    {readingStatus === status && <Check size={16} />}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!selectedStudent || loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan Rekod'}
            </button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">Senarai Bacaan Terkini</h3>
            <TrendingUp size={20} className="text-slate-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Murid</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Kategori</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Tarikh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.slice(0, 10).map((record, idx) => {
                  const student = students.find(s => s.id === record.student_id);
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-900">{student?.name || 'Murid Padam'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">{record.category}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-full uppercase",
                          record.status === 'Bacaan Lancar' ? "bg-emerald-100 text-emerald-700" :
                          record.status === 'Bacaan Sederhana' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                        )}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {record.created_at?.seconds ? new Date(record.created_at.seconds * 1000).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
