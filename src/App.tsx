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
import { collection, writeBatch, doc } from 'firebase/firestore';

const classesToSeed = {
  "1 Amanah": [
    "AAFIYAH NAYLA BINTI RAJIS", "ADRA HUMAIRA BINTI MOKTARRUDIN", "AL KAHFI BIN SULAIMAN", "ALIMUDDIN BIN MIZPAL",
    "AMMAR ASHRAF BIN MOHAMMAD HAIRI SYAH", "AWIRA BIN JAFRI", "FREDOLIN RUMANEH", "HARRIS QAISER BIN MOHD KHAIRIE",
    "HAYYAN SHIRAZ BIN MOHD SABRIE", "ISAAC ZAFRAN BIN FAZIEZIE", "JENNA MALAEQA BINTI JUFRI", "MAWAR ADELLIA BINTI MOHD FIKRINIMAH",
    "MOHAMMAD AYDEENSHAH ISYHRAAF BIN AFENDI TONA", "MUHAMMAD AZHAD SHARZNAS BIN MOHD SHARIL", "MUHAMMAD IFFAT ANDRIAS BIN MOHD SHAFIQ",
    "MUHAMMAD KASYAF ARIEF BIN AMIN RASYIDI", "MUHAMMAD KHALISH ARYAN BIN ABDULLAH", "NABILA YARA BINTI NIZAM ZUL ELMI",
    "NUR AFIFAH AZZAHRA BINTI BINARD", "NUR AFIYAH AAIRA BINTI ABDULLAH", "NUR AULIYA MAISARAH BINTI MOHD AFFINDY",
    "NUR FATEHA BINTI YASIN", "NUR PUTRI ALISYA BINTI MUHAMMAD SYAFIE", "QALISHA MIQAYLA BINTI MOHD RAFIE",
    "RAISYA AZZAHRA BINTI BUSTANI", "RAISYA IMANI BINTI RAHIMI", "RAYQA BINTI ISHAK", "RIZQ ZARIF BIN RAZUIL",
    "SANAN KHAN BIN SHAHID KHAN", "SOFIYA AMARA BINTI ABDUL RAHMAN", "SYAFIYAH BINTI JAMALEY", "UWAIS ALQORNI BIN ABDULLAH"
  ],
  "1 Bestari": [
    "AIDAN AQIL", "AISYAH KHAIRUNNISA BINTI MOHD KHAIRY", "ALSHAYATINA BINTI ABDULLAH", "AMSYAR YAZID BIN BAKRI",
    "ARRYAN DZHAFRY BIN ELMER ZACHARY", "AWANG JAFIZAL DANISH BIN AG JAMADIL", "FARIS SUFIAN BIN ABDULLAH",
    "FATIN NUR KHAYLA BINTI MOHD. ZUL HANAFIAH", "HANA NAJLA BINTI MOHAMMAD MAHATHIR", "HEMI AFRAKAYLA SYAEZA BINTI MOHD SHARIZAN",
    "INAS MIRZA BINTI NAZRAEN", "JANNATUL BATRIESYAH BINTI NIRZUAN SHAH", "MOHAMMAD AIDIEL BIN ANDIAN GOH",
    "MUHAMMAD ARYAN BIN ARIFF AMIRUL", "MUHAMMAD AZIM BIN ABDUL HALIM", "MUHAMMAD AZZHAD DARWISY BIN MOHD ARIZAN",
    "MUHAMMAD FAQIH RAIQAL BIN MOHD FAIZAL", "MUHAMMAD PUTRA RAFAEL BIN JAMAL", "MUHAMMAD QAYYIM IFFAT BIN ABDULLAH",
    "MUHAMMAD QHAYS AMSYAR BIN REMIE", "MUHAMMAD SHARIFUL ATID BIN HUSIN", "NUR AAIRA AAFIYAH BINTI ABDULLAH",
    "NUR AIFA BINTI AFIAN", "NUR DAHLIA HAFIYA BINTI ABDULLAH", "NUR HANA HUMAIRA BINTI DARAHMAN",
    "NUR HANANAH AAFIYAH BINTI MOHD HAZARIE ALWIE LEE", "NUR HUMAIRAH FATRISYA BINTI MOHD AZWAN", "PUTRI KHALISYA BINTI ABDULLAH",
    "PUTRI NUR AIRA BATRISYA BINTI MOHAMAD AKHRAM", "SITI KHADIJAH BINTI JAVIR", "SITI NUR HIDAYAH BINTI ABDULLAH",
    "SYAH ISKANDAR BIN JAHAR", "MOHAMMAD NAZRUL BIN ABDULLAH"
  ],
  "2 Amanah": [
    "AISY ANAQI BIN MOHD SAIDAH", "ARASHEL LEONG JIA YING", "AZFAR ABQARI BIN AWANG FEDLY", "BIBI RAIHANA BINTI RUDY",
    "INTAN ERLIYANA BINTI ERWAN", "MUAZ RIZQ ABADI BIN SAIFUL ABADI", "MUHAMMAD ADIB BIN SARIWAN", "MUHAMMAD AQIF KASYAF BIN AZIZAL",
    "MUHAMMAD ASHRAF BIN DARAHMAN", "MUHAMMAD FAIZ AIZAT BIN YUSRI FAZLEY", "MUHAMMAD FIRASH QALISH BIN ABDULLAH",
    "MUHAMMAD FUDHAIL BIN MOHD KHAIRUL AIZAT", "MUHAMMAD HAMIZ HARRAZ BIN AMIRULIZWAN", "MUHAMMAD MUAZ BIN MUSA",
    "MUHAMMAD QAYYEM QUZYAIRI BIN AZIZUL", "MUHAMMAD RAFIQIE BIN RIZAL", "MUHAMMAD UZAYR DANIAL BIN SUHAIMI",
    "MUHAMMAD ZEESHAN RAYEEF BIN AG ASRULIZAM", "NUR ALIA AARA BINTI ABDULLAH", "NUR HAWA HUMAIRAH BINTI MAZRUL",
    "NURUL QALEA NAFEEYA BINTI MOHAMAD REDZUAN SHAH", "PUTRI DAYANA DELISHA BINTI AZAHARIZA IDZUAN",
    "PUTRI NUR SYAQEELA SOFEA BINTI MOHAMAD NOR YAZIN", "SHIRAZ RAIQAL BIN JAMAL ABDILLAH", "YUSUF BIN AFIZAN",
    "AINEZ SALILIE SAFRINAH BINTI RAZLAN", "MOHAMAD JAILANI BIN ABDULLAH"
  ],
  "2 Bestari": [
    "AFIKREDUANDY BIN AFFENDY", "ANUM ARISYA BINTI ABDULLAH", "DANIEL SYAFRAN BIN MOHD SOFIAN", "DHIA IMANI ADRA BINTI MOHD FADZHEL",
    "FAHIM AFHAM BIN SUEFIAN", "MD JUL HAKIMI", "MIKAYLA AZZAHRA BINTI MOHD AVIENASH", "MOHAMAD AQASHA BIN ADRIAN GOH",
    "MOHAMAD ARYAN ZHAFRAN BIN MOHD SHUKRI", "MOHAMMAD KHALID PUTRA BIN ABDULLAH", "MUHAMAD AMIL BIN ABDULLAH",
    "MUHAMAD HARITH NAUFAL BIN MUHAMAD AZRUL", "MUHAMMAD ADAM AARIZ BIN MUHD. ARZIZ AFIZY", "MUHAMMAD AKMAL QAUTHAR BIN ROSMEH",
    "MUHAMMAD ARRASH FIQRIE BIN MOHD SOBRI", "MUHAMMAD HAFIZ AQEEL BIN SOPIAN", "MUHAMMAD KARL NEYDIM BIN MOHAMAD SHARIL",
    "MUHAMMAD RIZQI BIN ZAMRI", "NUR AAIRA UMAIRAH BINTI MOHD ARIFF", "NUR IZARA DANIAH BINTI RAJIM",
    "RAIF MAGOMED BIN MUHAMMAD FIRDAUS", "SHARIFA NUR AYSAH BINTI HUSIN", "SYIFAA BINTI JAMALEY", "ADIRA BINTI JAPRI",
    "MUHAMMAD IRSYAD WAZIEF BIN JIMI"
  ],
  "3 Amanah": [
    "AMMENUWELL JHONSEN JOHNLY", "AWANG KUZAIRY BIN AG. AZMI", "FADZUREEN ADELLISYAH BINTI FADILLAH AFEANDDY",
    "HEMI NUR INARA KAYYISHA BINTI HEMI AZRIN", "LEONA ROYSTONE", "MAHIRUDDIN BIN ABDULLAH", "MIKAYLA ULAYYA BINTI ABDULLAH",
    "MOHAMMAD NAFIS RIDZUAN BIN ABDULLAH", "MOHAMMAD RAYHAN WAFIEY BIN MOHD RENOZHA", "MUHAMMAD AIDAN ARIFF AMIRUL BIN ABDULLAH",
    "MUHAMMAD AIMAN BIN ABDULLAH", "MUHAMMAD AQRYLL AZHAEL BIN AIZAL", "MUHAMMAD ELMAN HAFIY BIN MOHD. ZUL HANAFIAH",
    "MUHAMMAD FATIH FATHULLAH BIN MOHD FIRDAUS", "MUHAMMAD RIZQIN IFWAT BIN RAZALI", "NAZRI BIN AFIAN",
    "NUR AISYAH BINTI MOHAMMAD HAIRUL", "NUR HANNIE HAZIYAH BINTI HANAFI", "NUR KHAYLA IRDINA BINTI ABDULLAH",
    "NUR SYUHRAH BINTI ZAINI", "NUR UFAIRAH ALEEYA BINTI MOHD. HAIRI", "NURHAWA AMANDA SUKRI BINTI ABDULLAH",
    "NURUL AYIM BATRISYAH BINTI ABDUL HALIM", "RAISHA ALISHA BINTI ABDULLAH", "SAFIYYAHTUL MARYA BINTI MOHD FIKRI",
    "SYAFEA RIZSYA BINTI MOHD SYAFAWIE", "SYARIFAH JAUHARA BINTI ABDULLAH", "WAHYUDIN JIHAD BIN JUMARDI", "MUHAMMAD TAUFIQ BIN TOBIAS"
  ],
  "3 Bestari": [
    "ADEVA RIANNE BINTI BRIAN", "AHMAD TIRMIZI BIN AMLI", "AIDAN NUR SYAM BIN ABDUL RAHMAN", "AKIF ALFIAN BIN ABDULLAH",
    "BALQIS HUMAIRAH BINTI MAZLAN", "DANIEL ASYRANI BIN ABDULLAH", "FARIZ KHAIRI BIN SUHARMAN", "FRIDAUS FELIX BIN FRANCHIS",
    "ISABELLE OLIVIA BINTI ABDULLAH", "MOHAMMAD ALNAJAR BIN ABDULLAH", "MOHAMMAD AMIRUL ZAQWAN BIN MOHD ALFIAN",
    "MUHAMMAD ALEEF FIRAS BIN MOHAMMAD MAHATHIR", "MUHAMMAD AQIL MIRZA BIN JAVIR", "MUHAMMAD HANZALAH BIN ABDULLAH",
    "MUHAMMAD IBB RAMADHAN BIN AZIZAN", "MUHAMMAD UWAISH SYAWAL BIN MOHAMMAD SABRI", "NUR AISYAH MAISARAH BINTI ABDULLAH",
    "NUR RAHADHATUL AISY BINTI SAMSUDDIN", "NURIZZARA BINTI AZHAR", "NURQUEAIRA BINTI SOBREE", "PUTRI ANIS ELISA BINTI EFINDY",
    "QHALIQ QASYAH BIN AWANG SYAHRIZAD", "QHAYRA QAISARA BINTI REZUAN", "SITI SALEHA BINTI ABDULLAH", "ZAIF AUFA ADITYA BIN MOHD FAEIZ"
  ]
};

function getGender(name: string) {
  const femaleKeywords = [
    "BINTI", "BTE", "NUR", "SITI", "PUTRI", "INTAN", "BIBI", "AINEZ", "YING",
    "HANA", "INAS", "SHARIFA", "SYIFAA", "ADIRA", "ANUM", "DHIA", "MIKAYLA",
    "IZARA", "SYARIFAH", "SAFIYYAHTUL", "RAISHA", "SYAFEA", "BALQIS", "ISABELLE",
    "ADEVA", "LEONA", "FADZUREEN"
  ];
  if (femaleKeywords.some(keyword => name.includes(keyword))) {
    return "Perempuan";
  }
  return "Lelaki";
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const seedData = async () => {
    if (!confirm('Adakah anda pasti mahu memasukkan data murid contoh?')) return;
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      const studentsRef = collection(db, "students");

      for (const [className, students] of Object.entries(classesToSeed)) {
        for (const name of students) {
          const newDocRef = doc(studentsRef);
          batch.set(newDocRef, {
            name: name.toUpperCase(),
            class: className,
            gender: getGender(name),
            archived: false
          });
        }
      }

      await batch.commit();
      alert('Data murid berjaya dimasukkan!');
    } catch (error) {
      console.error(error);
      alert('Gagal memasukkan data.');
    }
    setIsSeeding(false);
  };

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
                onClick={seedData}
                disabled={isSeeding}
                className="hidden md:flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                <Users size={14} />
                {isSeeding ? 'Memproses...' : 'Seed Data'}
              </button>
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
