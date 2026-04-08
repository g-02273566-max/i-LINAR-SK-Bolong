import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Trash2, Edit2, AlertCircle, Check } from 'lucide-react';
import { CLASSES, Student, cn } from '../types';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, onSnapshot } from 'firebase/firestore';

export default function StudentData() {
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState('');
  const [className, setClassName] = useState('1 Amanah');
  const [gender, setGender] = useState('Lelaki');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'students'), where('archived', '==', false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
      setStudents(studentList);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    
    try {
      await addDoc(collection(db, 'students'), {
        name: name.toUpperCase(),
        class: className,
        gender,
        archived: false
      });
      setMessage({ type: 'success', text: 'Murid berjaya ditambah!' });
      setName('');
    } catch (error) {
      setMessage({ type: 'error', text: 'Gagal menambah murid.' });
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Adakah anda pasti mahu memadam murid ini? Rekod penilaian akan diarkibkan.')) return;
    
    try {
      await updateDoc(doc(db, 'students', id), { archived: true });
    } catch (error) {
      console.error("Error deleting student:", error);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.class.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Student Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-24">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <UserPlus size={20} className="text-emerald-600" />
              Tambah Murid Baharu
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nama Penuh</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Contoh: AHMAD BIN ALI"
                  className="w-full rounded-xl border-slate-200 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kelas</label>
                <select 
                  value={className}
                  onChange={e => setClassName(e.target.value)}
                  className="w-full rounded-xl border-slate-200 text-sm"
                >
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Jantina</label>
                <div className="flex gap-2">
                  {['Lelaki', 'Perempuan'].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={cn(
                        "flex-1 py-2 text-xs font-bold rounded-lg border transition-all",
                        gender === g ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {message && (
                <div className={cn(
                  "p-3 rounded-lg text-xs font-medium flex items-center gap-2",
                  message.type === 'success' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                )}>
                  {message.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !name}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
              >
                {loading ? 'Memproses...' : 'Daftar Murid'}
              </button>
            </form>
          </div>
        </div>

        {/* Student List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-slate-900">Senarai Murid SK Bolong</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Cari murid..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-xl border-slate-200 text-sm w-full sm:w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Nama Murid</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Kelas</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Jantina</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map(student => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-900">{student.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">{student.class}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-500">{student.gender}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(student.id)}
                            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                        Tiada rekod murid dijumpai.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
