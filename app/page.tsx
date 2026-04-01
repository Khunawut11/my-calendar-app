"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Sparkles, CalendarDays, UserPlus, Trash2, LayoutDashboard, RotateCcw, Share2, CircleDashed, Trophy, ArrowRightCircle, Loader2, PaintBucket } from 'lucide-react';
import LZString from 'lz-string'; // 🚀 เพิ่มตัวบีบอัดข้อมูล!

export default function UltimateCalendarApp() {
  const [isMounted, setIsMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isViewerMode, setIsViewerMode] = useState(false);
  const [isSharing, setIsSharing] = useState(false); 

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

  // --- 💾 1. Load Data (รองรับทั้งแบบบีบอัดใหม่ และแบบเก่า) ---
  useEffect(() => {
    setIsMounted(true);
    const urlParams = new URLSearchParams(window.location.search);
    const shareData = urlParams.get('v');
    const compressedData = urlParams.get('c'); // 🚀 เช็กว่าเป็นลิงก์แบบบีบอัดไหม

    if (compressedData) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(compressedData);
        if (decompressed) {
            const decoded = JSON.parse(decompressed);
            setMembers(decoded.m || []);
            setScheduleData(decoded.s || {});
            setIsViewerMode(true); 
        }
      } catch (e) { console.error("Invalid Compressed Link"); }
    } else if (shareData) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(shareData)));
        setMembers(decoded.m || []);
        setScheduleData(decoded.s || {});
        setIsViewerMode(true); 
      } catch (e) { console.error("Invalid Legacy Link"); }
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

  // --- 🔗 3. Share Link (บีบอัดแบบขั้นสุด!) ---
  const generateShareLink = async () => {
    setIsSharing(true);
    try {
      const payload = JSON.stringify({ m: members, s: scheduleData });
      // 🚀 บีบอัดข้อมูลด้วย LZString ก่อนส่ง
      const compressed = LZString.compressToEncodedURIComponent(payload);
      const longUrl = `${window.location.origin}?c=${compressed}`; 

      const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
      
      if (response.ok) {
        const shortUrl = await response.text();
        navigator.clipboard.writeText(shortUrl);
        alert(`🔗 Short Link Copied!\n${shortUrl}\nShare this link with your friends!`);
      } else {
        navigator.clipboard.writeText(longUrl);
        alert('🔗 Link Copied (Compressed Long version)!\nShare this link with your friends.');
      }
    } catch (error) {
      const payload = JSON.stringify({ m: members, s: scheduleData });
      const compressed = LZString.compressToEncodedURIComponent(payload);
      navigator.clipboard.writeText(`${window.location.origin}?c=${compressed}`);
      alert('🔗 Link Copied (Compressed Long version)!\nShare this link with your friends.');
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

  // 🚀 Auto-Fill Month
  const fillEntireMonth = () => {
    if (isViewerMode) return;
    const monthName = format(currentDate, 'MMMM');
    const statusText = statusMode === 'notsure' ? 'CLEAR' : statusMode.toUpperCase();
    if(!confirm(`Mark ALL days in ${monthName} as ${statusText} for ${selectedMember.name}?`)) return;

    const daysInCurrentMonth = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
    setScheduleData((prev: any) => {
      const newData = { ...prev };
      daysInCurrentMonth.forEach(d => {
        const dKey = format(d, 'yyyy-MM-dd');
        const newDateData = { ...(newData[dKey] || {}) };
        if (statusMode === 'notsure') delete newDateData[selectedMember.id]; 
        else newDateData[selectedMember.id] = statusMode; 
        newData[dKey] = newDateData;
      });
      return newData;
    });
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // --- 📊 6. Yearly Vibe ---
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

      let color = 'bg-slate-50 text-slate-400 border-slate-100'; 
      if (totalPaintedDays > 0) {
        const totalSlots = totalPaintedDays * members.length;
        const availRatio = availableCount / totalSlots;
        const busyRatio = busyCount / totalSlots;
        if (busyRatio >= 0.4) color = 'bg-rose-500 text-white border-rose-600 shadow-md scale-[1.02]'; 
        else if (busyRatio > 0.1) color = 'bg-rose-200 text-rose-800 border-rose-300'; 
        else if (availRatio >= 0.7) color = 'bg-emerald-500 text-white border-emerald-600 shadow-md scale-[1.02]'; 
        else if (availRatio >= 0.3) color = 'bg-emerald-300 text-emerald-900 border-emerald-400'; 
        else color = 'bg-amber-100 text-amber-700 border-amber-200'; 
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
        let rangeStr = format(startD, 'MMM') === format(endD, 'MMM') ? `${format(startD, 'd')} - ${format(endD, 'd MMM yyyy')}` : `${format(startD, 'd MMM')} - ${format(endD, 'd MMM yyyy')}`;
        ranges.push({ range: rangeStr, score: minAvailableInTrip, startDate: startD });
      }
    }
    return ranges.sort((a, b) => b.score !== a.score ? b.score - a.score : a.startDate.getTime() - b.startDate.getTime());
  }, [scheduleData, tripDays, currentDate]);

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });

  if (!isMounted) return <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center text-slate-400 font-bold text-xl tracking-widest">LOADING PLANNER...</div>;

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-2 md:p-8 font-sans text-slate-800 select-none">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {!isViewerMode && (
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border border-white/50 relative">
              <div className="flex gap-2 absolute top-5 right-5 md:top-6 md:right-6">
                <button onClick={generateShareLink} disabled={isSharing} className="text-emerald-500 hover:text-white hover:bg-emerald-500 transition-colors p-2 bg-emerald-50 rounded-full disabled:opacity-50">
                  {isSharing ? <Loader2 size={16} className="animate-spin md:w-[18px] md:h-[18px]" /> : <Share2 size={16} className="md:w-[18px] md:h-[18px]" />}
                </button>
                <button onClick={clearAllData} className="text-slate-300 hover:text-rose-500 transition-colors p-2 bg-slate-50 hover:bg-rose-50 rounded-full">
                  <RotateCcw size={16} className="md:w-[18px] md:h-[18px]" />
                </button>
              </div>
              <h1 className="text-xl md:text-2xl font-black mb-6 md:mb-8 flex items-center gap-2 md:gap-3 text-emerald-600 mt-2 md:mt-0">
                <CalendarDays className="text-slate-900 w-5 h-5 md:w-6 md:h-6" /> Admin
              </h1>
              <div className="mb-6 md:mb-8">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 md:mb-4">Manage Members</h3>
                <div className="flex gap-2 mb-3 md:mb-4">
                  <input type="text" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="Name..." className="flex-1 bg-slate-50 border-none rounded-xl px-3 py-2 md:px-4 text-sm focus:ring-2 ring-emerald-400 outline-none w-full" />
                  <button onClick={addMember} className="bg-slate-900 text-white p-2 rounded-xl hover:bg-emerald-500 transition shrink-0"><UserPlus size={18}/></button>
                </div>
                <div className="space-y-1 max-h-40 md:max-h-48 overflow-y-auto pr-1 md:pr-2 custom-scrollbar">
                  {members.map(m => (
                    <div key={m.id} className={`group flex items-center justify-between p-2 rounded-xl transition cursor-pointer ${selectedMember.id === m.id ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                      <button onClick={() => setSelectedMember(m)} className={`flex-1 text-left font-bold text-sm truncate ${selectedMember.id === m.id ? 'text-emerald-600' : 'text-slate-500'}`}>{m.name}</button>
                      <button onClick={(e) => { e.stopPropagation(); removeMember(m.id); }} className="text-rose-300 hover:text-rose-600 transition p-1 shrink-0"><Trash2 size={14}/></button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mb-6 md:mb-8 p-3 md:p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <h3 className="font-black text-[10px] text-emerald-600 uppercase mb-2 md:mb-3">Trip Duration ({tripDays} Days)</h3>
                <input type="range" min="2" max="7" value={tripDays} onChange={(e)=>setTripDays(parseInt(e.target.value))} className="w-full accent-emerald-600 cursor-pointer" />
              </div>
              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-3">Set Status</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2">
                  <button onClick={()=>setStatusMode('available')} className={`flex items-center justify-center lg:justify-start gap-2 p-2 md:p-3 rounded-xl text-xs md:text-sm transition font-bold ${statusMode==='available'?'bg-emerald-500 text-white shadow-lg':'bg-slate-50 text-slate-500'}`}>
                    <CheckCircle2 size={16} /> Free
                  </button>
                  <button onClick={()=>setStatusMode('busy')} className={`flex items-center justify-center lg:justify-start gap-2 p-2 md:p-3 rounded-xl text-xs md:text-sm transition font-bold ${statusMode==='busy'?'bg-rose-500 text-white shadow-lg':'bg-slate-50 text-slate-500'}`}>
                    <XCircle size={16} /> Busy
                  </button>
                  <button onClick={()=>setStatusMode('notsure')} className={`flex items-center justify-center lg:justify-start gap-2 p-2 md:p-3 rounded-xl text-xs md:text-sm transition font-bold ${statusMode==='notsure'?'bg-white border-2 border-slate-300 text-slate-800 shadow-sm':'bg-slate-50 text-slate-500'}`}>
                    <CircleDashed size={16} /> Clear
                  </button>
                </div>
                <div className="mt-3">
                  <button onClick={fillEntireMonth} className="w-full flex items-center justify-center gap-2 p-2 md:p-3 rounded-xl text-xs md:text-sm transition font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-md active:scale-95">
                    <PaintBucket size={16} /> Fill {format(currentDate, 'MMM')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={isViewerMode ? "lg:col-span-12 space-y-4 md:space-y-6 max-w-5xl mx-auto w-full" : "lg:col-span-9 space-y-4 md:space-y-6"}>
          {isViewerMode && <div className="bg-emerald-100 text-emerald-800 p-3 md:p-4 rounded-xl md:rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm border border-emerald-200 text-sm md:text-base text-center"><Share2 size={18} /> Read-Only Mode</div>}
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch">
            <div className="flex-1 bg-slate-900 p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] text-white shadow-2xl flex flex-col h-56 md:h-64 border border-slate-700">
              <h2 className="text-emerald-400 font-bold text-[10px] md:text-xs uppercase tracking-[0.3em] mb-3 md:mb-4 flex items-center gap-2"><Sparkles size={14} /> Top Options in {format(currentDate, 'yyyy')}</h2>
              <div className="overflow-y-auto pr-1 md:pr-2 space-y-2 custom-scrollbar">
                {allValidRanges.length > 0 ? allValidRanges.map((r, idx) => (
                  <div key={idx} onClick={() => setCurrentDate(r.startDate)} className={`flex justify-between items-center cursor-pointer group transition-all duration-300 rounded-xl md:rounded-2xl px-3 md:px-4 py-2 md:py-3 ${idx === 0 ? 'bg-white/10 scale-[1.02] border border-white/20' : 'hover:bg-white/5 border-b border-white/5'}`}>
                    <div className="flex items-center gap-2 md:gap-3">
                      {idx === 0 ? <Trophy size={16} className="text-yellow-400" /> : <ArrowRightCircle size={14} className="text-slate-600 group-hover:text-emerald-400" />}
                      <span className={`text-base md:text-xl font-black ${idx === 0 ? 'text-yellow-400' : 'text-slate-200 group-hover:text-white'}`}>{r.range}</span>
                    </div>
                    <span className="text-[8px] md:text-[10px] font-black uppercase px-2 md:px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full">{r.score}/{members.length} Free</span>
                  </div>
                )) : <div className="text-slate-500 text-xs text-center mt-4 italic">No available periods found...</div>}
              </div>
            </div>
            <div className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-lg border border-white flex flex-col justify-between">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 md:mb-4 flex items-center gap-2"><LayoutDashboard size={14}/> Yearly Density</h3>
               <div className="grid grid-cols-6 md:grid-cols-4 gap-1.5 md:gap-2">
                 {monthsOverview.map((m, i) => (
                   <div key={i} onClick={() => setCurrentDate(m.date)} className={`w-9 h-9 md:w-12 md:h-12 rounded-lg md:rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border hover:ring-2 hover:ring-emerald-400 ${m.color} ${format(m.date, 'MM') === format(currentDate, 'MM') ? 'ring-2 ring-slate-900 shadow-md' : ''}`}>
                     <span className="text-[7px] md:text-[9px] font-black uppercase opacity-90">{m.name}</span>
                   </div>
                 ))}
               </div>
            </div>
          </div>
          <div className="bg-white p-4 sm:p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] shadow-2xl shadow-slate-200 border border-white">
            <div className="flex items-center justify-between mb-6 md:mb-12">
              <div className="flex items-baseline gap-2 md:gap-4">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">{format(currentDate, 'MMM')} <span className="hidden sm:inline">{format(currentDate, 'MMMM').substring(3)}</span></h2>
                <span className="text-2xl sm:text-3xl md:text-5xl font-thin text-slate-300">{format(currentDate, 'yyyy')}</span>
              </div>
              <div className="flex gap-1 md:gap-3 bg-slate-50 p-1 md:p-2 rounded-xl md:rounded-2xl">
                <button onClick={()=>setCurrentDate(subMonths(currentDate, 1))} className="p-2 md:p-3 hover:bg-white rounded-lg md:rounded-2xl transition shadow-sm"><ChevronLeft size={20}/></button>
                <button onClick={()=>setCurrentDate(addMonths(currentDate, 1))} className="p-2 md:p-3 hover:bg-white rounded-lg md:rounded-2xl transition shadow-sm"><ChevronRight size={20}/></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-4">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-center text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-4">{d}</div>)}
              {Array.from({ length: getDay(startOfMonth(currentDate)) }).map((_, i) => <div key={i} className="h-16 sm:h-24 md:h-32 lg:h-40 pointer-events-none" />)}
              {daysInMonth.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayData = scheduleData[dateKey] || {};
                const availableCount = Object.values(dayData).filter(s => s === 'available').length;
                const busyCount = Object.values(dayData).filter(s => s === 'busy').length;
                const isEveryone = availableCount === members.length && members.length > 0;
                let cellBg = isEveryone ? 'bg-gradient-to-br from-yellow-300 to-amber-500 border-yellow-400' : availableCount > 0 ? 'bg-emerald-50 border-emerald-100' : busyCount > 0 ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-50';
                return (
                  <div key={dateKey} onMouseDown={() => { if(!isViewerMode) { setIsDragging(true); applyStatus(dateKey); } }} onMouseEnter={() => { if(!isViewerMode && isDragging) applyStatus(dateKey); }} className={`h-16 sm:h-24 md:h-32 lg:h-40 p-1 sm:p-2 md:p-4 rounded-xl md:rounded-[2rem] transition-all border-2 relative overflow-hidden flex flex-col justify-start md:justify-between group ${isViewerMode ? 'cursor-default' : 'cursor-pointer'} ${cellBg}`}>
                    <span className={`text-sm sm:text-lg md:text-2xl font-black ${isEveryone ? 'text-white' : availableCount > 0 ? 'text-emerald-700' : busyCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>{format(day, 'd')}</span>
                    <div className="flex flex-wrap justify-center md:justify-start gap-0.5 md:gap-1 mt-1 md:mt-0">
                      {members.map(m => dayData[m.id] && <div key={m.id} className={`w-3.5 h-3.5 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-md md:rounded-lg flex items-center justify-center text-[5px] sm:text-[8px] font-black text-white shadow-sm ${dayData[m.id] === 'available' ? 'bg-emerald-500' : 'bg-rose-500'}`}>{m.short}</div>)}
                    </div>
                    {isEveryone && <Sparkles className="absolute top-1 right-1 text-white animate-pulse w-3 h-3 md:w-4 md:h-4" />}
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