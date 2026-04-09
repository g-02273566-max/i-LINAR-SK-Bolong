import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  GraduationCap, 
  History, 
  BookOpen, 
  FileText, 
  Users,
  Menu,
  X,
  ChevronRight,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, CLASSES } from './types';

// Components
import Dashboard from './components/Dashboard';
import Screening from './components/Screening';
import PhaseTest from './components/PhaseTest';
import Records from './components/Records';
import Reading from './components/Reading';
import StudentSlip from './components/StudentSlip';
import StudentData from './components/StudentData';
import { db } from './firebase';
import { collection, doc } from 'firebase/firestore';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'screening', label: 'Ujian Saringan', icon: ClipboardCheck },
    { id: 'phasetest', label: 'Ujian Pelepasan', icon: GraduationCap },
    { id: 'records', label: 'Rekod & Sejarah', icon: History },
    { id: 'reading', label: 'Rekod Bacaan', icon: BookOpen },
    { id: 'slip', label: 'Jana Slip', icon: FileText },
    { id: 'students', label: 'Data Murid', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Persistent Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <img 
                src="https://iili.io/fgc1zoF.jpg" 
                alt="Logo SK Bolong" 
                className="h-14 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-slate-900 leading-tight">SISTEM i-LINAR SK BOLONG</h1>
                <p className="text-xs font-medium text-emerald-600 tracking-widest uppercase">SKBT TA’ATAIKU • 2026</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <span className="block text-sm font-semibold text-slate-700">Tahun Semasa</span>
                <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded">2026</span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden lg:block bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex space-x-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2",
                    activeTab === item.id 
                      ? "bg-white/10 border-emerald-400 text-white" 
                      : "border-transparent text-slate-300 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden bg-slate-900 border-t border-slate-800 fixed inset-x-0 top-20 z-40 shadow-xl"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium transition-colors",
                    activeTab === item.id 
                      ? "bg-emerald-600 text-white" 
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <item.icon size={20} />
                  {item.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'screening' && <Screening />}
          {activeTab === 'phasetest' && <PhaseTest />}
          {activeTab === 'records' && <Records />}
          {activeTab === 'reading' && <Reading />}
          {activeTab === 'slip' && <StudentSlip />}
          {activeTab === 'students' && <StudentData />}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-slate-500">
            © 2026 SISTEM i-LINAR SK BOLONG. Hak Cipta Terpelihara.
          </p>
        </div>
      </footer>
    </div>
  );
}
