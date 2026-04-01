"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Sparkles, CalendarDays, UserPlus, Trash2, LayoutDashboard, RotateCcw, Share2, CircleDashed, Trophy, ArrowRightCircle, Loader2 } from 'lucide-react';

export default function UltimateCalendarApp() {
  const [isMounted, setIsMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isViewerMode, setIsViewerMode] = useState(false);
  const [isSharing, setIsSharing] = useState(false); // ⏳ สถานะตอนกำลังย่อลิงก์

  const [members, setMembers] = useState([
    { id: 1, name: 'John Doe', short: 'JO' },
    { id: 2, name: 'Alice', short: 'AL' }
  ]);
  const [newMemberName, setNewMemberName] = useState('');
  const [selectedMember, setSelectedMember] = useState(members[0]);
  const [statusMode, setStatusMode] = useState('available'); 
  const [tripDays, setTripDays] = useState(3);
  const [scheduleData, setScheduleData] = useState<any>({});
  const [isDragging, setIsDragging] = useState(false);

  // --- 💾 1. Load Data ---
  useEffect(() => {
    setIsMounted(true);
    const urlParams = new URLSearchParams(window.location.search);
    const shareData = urlParams.get('v');

    if (shareData) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(shareData)));
        setMembers(decoded.m || []);
        setScheduleData(decoded.s || {});
        setIsViewerMode(true); 
      } catch (e) {
        console.error("Invalid Link");
      }
    } else {
      const savedSchedule = localStorage.getItem('tripSchedule');
      const savedMembers = localStorage.getItem('tripMembers');
      if (savedSchedule) setScheduleData(JSON.parse(savedSchedule));
      if (savedMembers) {
        const parsedMembers = JSON.parse(savedMembers);
        setMembers(parsedMembers);
        setSelectedMember(parsedMembers[0]); 
      }
    }
  }, []);

  // --- 💾 2. Auto-Save ---
  useEffect(() => {
    if (isMounted && !isViewerMode) {
      localStorage.setItem('tripSchedule', JSON.stringify(scheduleData));
      localStorage.setItem('tripMembers', JSON.stringify(members));
    }
  }, [scheduleData, members, isMounted, isViewerMode]);

  // --- 🔗 3. Generate Short Share Link (TinyURL API) ---
  const generateShareLink = async () => {
    setIsSharing(true);
    try {
      const payload = JSON.stringify({ m: members, s: scheduleData });
      const encoded = btoa(encodeURIComponent(payload)); 
      const longUrl = `${window.location.origin}?v=${encoded}`; 

      // เรียกใช้ TinyURL เพื่อย่อลิงก์
      const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
      
      if (response.ok) {
        const shortUrl = await response.text();
        navigator.clipboard.writeText(shortUrl);
        alert(`🔗 Short Link Copied!\n${shortUrl}\nShare this short link with your friends!`);
      } else {
        // ถ้า API มีปัญหา ให้ใช้ลิงก์ยาวแทน
        navigator.clipboard.writeText(longUrl);
        alert('🔗 Link Copied (Long version)!\nShare this link with your friends.');
      }
    } catch (error) {
      const payload = JSON.stringify({ m: members, s: scheduleData });
      const encoded = btoa(encodeURIComponent(payload)); 
      navigator.clipboard.writeText(`${window.location.origin}?v=${encoded}`);
      alert('🔗 Link Copied (Long version)!\nShare this link with your friends.');
    } finally {
      setIsSharing(false);
    }
  };

  const clearAllData = () => {
    if(confirm('Are you sure you want to clear all calendar data?')) {
      setScheduleData({});
      localStorage.removeItem('tripSchedule');
    }
  };

  // --- 👥 4. Member Management ---
  const addMember = () => {
    if (!newMemberName.trim()) return;
    const newM = { id: Date.now(), name: newMemberName, short: newMemberName.substring(0, 2).toUpperCase() };
    setMembers([...members, newM]);
    setNewMemberName('');
  };

  const removeMember = (id: number) => {
    if (members.length <= 1) return;
    const updated = members.filter(m => m.id !== id);
    setMembers(updated);
    if (selectedMember.id === id) setSelectedMember(updated[0]);
  };

  // --- 🖌️ 5. Paint System ---
  const applyStatus = (dateKey: string) => {
    if (isViewerMode) return; 
    setScheduleData((prev: any) => {
      const newDateData = { ...(prev[dateKey] || {}) };
      if (statusMode === 'notsure') {
        delete newDateData[selectedMember.id]; 
      } else {
        newDateData[selectedMember.id] = statusMode; 
      }
      return { ...prev, [dateKey]: newDateData };
    });
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // --- 📊 6. Yearly Vibe (Dynamic Colors) ---
  const monthsOverview = useMemo(() => {
    const yearStart = startOfYear(currentDate);
    const months = eachMonthOfInterval({ start: yearStart, end: addMonths(yearStart, 11) });
    
    return months.map(m => {
      const days = eachDayOfInterval({ start: startOfMonth(m), end: endOfMonth(m) });
      let availableCount = 0;
      let busyCount = 0;
      let totalPaintedDays = 0;

      days.forEach(d => {
        const dKey = format(d, 'yyyy-MM-dd');
        const dayData = scheduleData[dKey] || {};
        const avail = Object.values(dayData).filter(s => s === 'available').length;
        const busy = Object.values(dayData).filter(s => s === 'busy').length;
        
        availableCount += avail;
        busyCount += busy;
        if (avail > 0 || busy > 0) totalPaintedDays++;
      });

      let color = 'bg-slate-50 text-slate-400 border-slate-100'; // สีเริ่มต้น (ไม่มีข้อมูล)

      if (totalPaintedDays > 0) {
        const totalSlots = totalPaintedDays * members.length;
        const availRatio = availableCount / totalSlots;
        const busyRatio = busyCount / totalSlots;

        // แยกสีตามความหนาแน่นของความว่าง/ไม่ว่าง
        if (busyRatio >= 0.4) {
           color = 'bg-rose-500 text-white border-rose-600 shadow-md scale-105'; // ไม่ว่างเยอะมาก (แดงเข้ม)
        } else if (busyRatio > 0.1) {
           color = 'bg-rose-200 text-rose-800 border-rose-300'; // เริ่มมีคนไม่ว่าง (แดงอ่อน)
        } else if (availRatio >= 0.7) {
           color = 'bg-emerald-500 text-white border-emerald-600 shadow-md scale-105'; // ว่างกันเพียบ (เขียวเข้ม)
        } else if (availRatio >= 0.3) {
           color = 'bg-emerald-300 text-emerald-900 border-emerald-400'; // ว่างปานกลาง (เขียวอ่อน)
        } else {
           color = 'bg-amber-100 text-amber-700 border-amber-200'; // ครึ่งๆ กลางๆ (เหลือง)
        }
      }

      return { name: format(m, 'MMM'), color, date: m };
    });
  }, [scheduleData, members, currentDate]);

  // --- 🌍 7. Global Smart Ranking ---
  const allValidRanges = useMemo(() => {
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);
    const daysToScan = eachDayOfInterval({ start: yearStart, end: yearEnd });

    const ranges = [];
    for (let i = 0; i <= daysToScan.length - tripDays; i++) {
      let minAvailableInTrip = 999;
      for (let j = 0; j < tripDays; j++) {
        const dKey = format(daysToScan[i + j], 'yyyy-MM-dd');
        const count = Object.values(scheduleData[dKey] || {}).filter(s => s === 'available').length;
        if (count < minAvailableInTrip) minAvailableInTrip = count;
      }
      
      if (minAvailableInTrip > 0) {
        const startD = daysToScan[i];
        const endD = daysToScan[i + tripDays - 1];
        
        let rangeStr = '';
        if (format(startD, 'MMM') === format(endD, 'MMM')) {
           rangeStr = `${format(startD, 'd')} - ${format(endD, 'd MMM yyyy')}`;
        } else {
           rangeStr = `${format(startD, 'd MMM')} - ${format(endD, 'd MMM yyyy')}`;
        }

        ranges.push({ range: rangeStr, score: minAvailableInTrip, startDate: startD });
      }
    }
    
    return ranges.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.startDate.getTime() - b.startDate.getTime();
    });
  }, [scheduleData, tripDays, currentDate]);

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });

  if (!isMounted) return <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center text-slate-400 font-bold text-xl tracking-widest">LOADING PLANNER...</div>;

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-8 font-sans text-slate-800 select-none">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ================= SIDEBAR ================= */}
        {!isViewerMode && (
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-white/50 relative">
              
              <div className="flex gap-2 absolute top-6 right-6">
                {/* 🔄 ปุ่มแชร์โหลดดิ้ง */}
                <button onClick={generateShareLink} disabled={isSharing} className="text-emerald-500 hover:text-white hover:bg-emerald-500 transition-colors p-2 bg-emerald-50 rounded-full disabled:opacity-50">
                  {isSharing ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
                </button>
                <button onClick={clearAllData} className="text-slate-300 hover:text-rose-500 transition-colors p-2 bg-slate-50 hover:bg-rose-50 rounded-full">
                  <RotateCcw size={18} />
                </button>
              </div>

              <h1 className="text-2xl font-black mb-8 flex items-center gap-3 text-emerald-600">
                <CalendarDays className="text-slate-900" /> Admin
              </h1>

              <div className="mb-8">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Manage Members</h3>
                <div className="flex gap-2 mb-4">
                  <input 
                    type="text" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="Member Name..."
                    className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 ring-emerald-400 outline-none"
                  />
                  <button onClick={addMember} className="bg-slate-900 text-white p-2 rounded-xl hover:bg-emerald-500 transition"><UserPlus size={18}/></button>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {members.map(m => (
                    <div key={m.id} className={`group flex items-center justify-between p-2 rounded-xl transition cursor-pointer ${selectedMember.id === m.id ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                      <button onClick={() => setSelectedMember(m)} className={`flex-1 text-left font-bold text-sm ${selectedMember.id === m.id ? 'text-emerald-600' : 'text-slate-500'}`}>{m.name}</button>
                      <button onClick={(e) => { e.stopPropagation(); removeMember(m.id); }} className="opacity-0 group-hover:opacity-100 text-rose-300 hover:text-rose-600 transition p-1"><Trash2 size={14}/></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <h3 className="font-black text-[10px] text-emerald-600 uppercase mb-3">Trip Duration ({tripDays} Days)</h3>
                <input type="range" min="2" max="7" value={tripDays} onChange={(e)=>setTripDays(parseInt(e.target.value))} className="w-full accent-emerald-600 cursor-pointer" />
              </div>

              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Set Status</h3>
                <div className="grid grid-cols-1 gap-2">
                  <button onClick={()=>setStatusMode('available')} className={`flex items-center gap-3 p-3 rounded-xl text-sm transition font-bold ${statusMode==='available'?'bg-emerald-500 text-white shadow-lg':'bg-slate-50 text-slate-500 hover:bg-emerald-50'}`}>
                    <CheckCircle2 size={18} /> Available (Green)
                  </button>
                  <button onClick={()=>setStatusMode('busy')} className={`flex items-center gap-3 p-3 rounded-xl text-sm transition font-bold ${statusMode==='busy'?'bg-rose-500 text-white shadow-lg':'bg-slate-50 text-slate-500 hover:bg-rose-50'}`}>
                    <XCircle size={18} /> Busy (Red)
                  </button>
                  <button onClick={()=>setStatusMode('notsure')} className={`flex items-center gap-3 p-3 rounded-xl text-sm transition font-bold ${statusMode==='notsure'?'bg-white border-2 border-slate-300 text-slate-800 shadow-sm':'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                    <CircleDashed size={18} /> Clear / Not Sure
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= MAIN CONTENT ================= */}
        <div className={isViewerMode ? "lg:col-span-12 space-y-6 max-w-5xl mx-auto w-full" : "lg:col-span-9 space-y-6"}>
          
          {isViewerMode && (
            <div className="bg-emerald-100 text-emerald-800 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm border border-emerald-200">
              <Share2 size={20} /> You are viewing this calendar in Read-Only mode.
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-6 items-stretch">
            
            <div className="flex-1 bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-2xl flex flex-col h-64 border border-slate-700">
              <h2 className="text-emerald-400 font-bold text-xs uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <Sparkles size={14} /> Top Options in {format(currentDate, 'yyyy')}
              </h2>
              <div className="overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {allValidRanges.length > 0 ? (
                  allValidRanges.map((r, idx) => {
                    const isTopMatch = idx === 0;
                    const isEveryone = r.score === members.length;
                    return (
                      <div key={idx} onClick={() => setCurrentDate(r.startDate)} 
                        className={`flex justify-between items-center cursor-pointer group transition-all duration-300 rounded-2xl px-4 py-3 ${isTopMatch ? 'bg-white/10 scale-[1.02] border border-white/20' : 'hover:bg-white/5 border-b border-white/5'}`}>
                        <div className="flex items-center gap-3">
                          {isTopMatch ? <Trophy size={18} className="text-yellow-400" /> : <ArrowRightCircle size={16} className="text-slate-600 group-hover:text-emerald-400 transition" />}
                          <span className={`text-lg md:text-xl font-black tracking-tight ${isTopMatch ? 'text-yellow-400' : 'text-slate-200 group-hover:text-white'}`}>{r.range}</span>
                        </div>
                        <span className={`text-[9px] md:text-[10px] font-black uppercase px-3 py-1.5 rounded-full whitespace-nowrap ${isEveryone ? 'bg-yellow-400 text-yellow-900 shadow-[0_0_15px_rgba(250,204,21,0.4)]' : (isTopMatch ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-emerald-500/20 text-emerald-400')}`}>
                          {r.score}/{members.length} Free
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-slate-500 text-sm italic mt-4 text-center">No available periods for {tripDays} consecutive days in {format(currentDate, 'yyyy')}...</div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-white flex flex-col justify-between">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><LayoutDashboard size={14}/> Yearly Density</h3>
               <div className="grid grid-cols-4 gap-2">
                 {monthsOverview.map((m, i) => {
                   const isCurrentMonth = format(m.date, 'MM') === format(currentDate, 'MM');
                   return (
                     <div key={i} onClick={() => setCurrentDate(m.date)} 
                       className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border hover:ring-2 hover:ring-emerald-400
                         ${m.color} ${isCurrentMonth ? 'ring-2 ring-slate-900 shadow-md' : ''}`}>
                       <span className="text-[9px] font-black uppercase opacity-90">{m.name}</span>
                     </div>
                   );
                 })}
               </div>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl shadow-slate-200 border border-white">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-baseline gap-4">
                <h2 className="text-5xl font-black text-slate-900 tracking-tighter">{format(currentDate, 'MMMM')}</h2>
                <span className="text-5xl font-thin text-slate-200">{format(currentDate, 'yyyy')}</span>
              </div>
              <div className="flex gap-3 bg-slate-50 p-2 rounded-2xl">
                <button onClick={()=>setCurrentDate(subMonths(currentDate, 1))} className="p-3 hover:bg-white rounded-2xl transition shadow-sm"><ChevronLeft size={28}/></button>
                <button onClick={()=>setCurrentDate(addMonths(currentDate, 1))} className="p-3 hover:bg-white rounded-2xl transition shadow-sm"><ChevronRight size={28}/></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4 pointer-events-none">{d}</div>
              ))}
              {Array.from({ length: getDay(startOfMonth(currentDate)) }).map((_, i) => (
                <div key={`empty-${i}`} className="h-32 md:h-40 pointer-events-none" />
              ))}
              {daysInMonth.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayData = scheduleData[dateKey] || {};
                
                const availableCount = Object.values(dayData).filter(s => s === 'available').length;
                const busyCount = Object.values(dayData).filter(s => s === 'busy').length;
                const isEveryone = availableCount === members.length && members.length > 0;
                
                let cellBg = 'bg-white border-slate-50 hover:border-slate-200';
                if (isEveryone) cellBg = 'bg-gradient-to-br from-yellow-300 to-amber-500 border-yellow-400 shadow-[0_0_30px_rgba(251,191,36,0.5)] scale-105 z-10';
                else if (availableCount > 0) cellBg = 'bg-emerald-50 border-emerald-100';
                else if (busyCount > 0) cellBg = 'bg-rose-50 border-rose-100';

                return (
                  <div key={dateKey} onMouseDown={() => { if(!isViewerMode) { setIsDragging(true); applyStatus(dateKey); } }} onMouseEnter={() => { if(!isViewerMode && isDragging) applyStatus(dateKey); }}
                    className={`h-32 md:h-40 p-5 rounded-[2rem] transition-all duration-300 border-2 relative overflow-hidden flex flex-col justify-between group
                      ${isViewerMode ? 'cursor-default' : 'cursor-pointer'} ${cellBg}`}>
                    <span className={`text-2xl font-black pointer-events-none ${isEveryone ? 'text-white' : (availableCount > 0 ? 'text-emerald-700' : busyCount > 0 ? 'text-rose-400' : 'text-slate-300')}`}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex flex-wrap gap-1 pointer-events-none">
                      {members.map(m => {
                        const status = dayData[m.id];
                        if (!status) return null;
                        const isAvail = status === 'available';
                        return (
                          <div key={m.id} className={`w-6 h-6 rounded-lg backdrop-blur-md flex items-center justify-center text-[8px] font-black border text-white shadow-sm
                            ${isAvail ? 'bg-emerald-500 border-emerald-400' : 'bg-rose-500 border-rose-400'}`}>{m.short}</div>
                        );
                      })}
                    </div>
                    {isEveryone && <Sparkles className="absolute top-4 right-4 text-white animate-pulse pointer-events-none" size={16} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}