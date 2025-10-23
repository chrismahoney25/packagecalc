'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from 'recharts';
import { PaymentPlan, Visit } from '@/types';
import VisitForm from '@/components/VisitForm';
import { Button } from '@/components/ui/Button';
import CashFlowChart from '@/components/CashFlowChart';
import { calculateTotalValue, findMinimumDeposit, findMonthlyPayment } from '@/utils/paymentCalculations';

export default function Home() {
  const createBlankVisit = (): Visit => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: '',
    travelFee: 0,
    consultingFee: 0,
  });
  const [visits, setVisits] = useState<Visit[]>(() => [createBlankVisit(), createBlankVisit()]);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(1);
  const [selectedDeposit, setSelectedDeposit] = useState<number>(0);
  const [currentPlan, setCurrentPlan] = useState<PaymentPlan | null>(null);
  const [isVisitsCollapsed, setIsVisitsCollapsed] = useState(false);
  const [errors, setErrors] = useState<Record<string, { date?: string; travelFee?: string; consultingFee?: string }>>({});
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const designerRef = useRef<HTMLDivElement | null>(null);
  const totalValue = useMemo(() => calculateTotalValue(visits), [visits]);

  const maxDuration = useMemo(() => {
    if (visits.length === 0) return 1;
    const validVisits = visits.filter(v => v.date);
    if (validVisits.length === 0) return 1;

    const sorted = [...validVisits].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const firstDate = new Date(sorted[0].date);
    const lastDate = new Date(sorted[sorted.length - 1].date);
    const monthsDiff = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    return Math.max(1, monthsDiff);
  }, [visits]);

  const updateCurrentPlan = useMemo(() => {
    if (!showOptions || visits.length === 0) return null;

    const normalized = visits.map(v => ({
      ...v,
      travelFee: Number.isFinite(v.travelFee) ? v.travelFee : 0,
      consultingFee: Number.isFinite(v.consultingFee) ? v.consultingFee : 0,
    }));

    const { deposit: minDeposit } = findMinimumDeposit(normalized, totalValue, selectedDuration);
    const actualDeposit = Math.max(selectedDeposit, minDeposit);
    const adjustedMonthlyPayment = findMonthlyPayment(totalValue, selectedDuration, actualDeposit);

    const plan: PaymentPlan = {
      id: `interactive-${selectedDuration}m`,
      deposit: actualDeposit,
      monthlyPayment: adjustedMonthlyPayment,
      duration: selectedDuration,
      totalValue,
      visits: normalized,
      endDate: '',
      isValid: true,
      maxOutstanding: totalValue * 0.2,
    };

    return plan;
  }, [visits, totalValue, selectedDuration, selectedDeposit, showOptions]);

  useEffect(() => {
    setCurrentPlan(updateCurrentPlan);
  }, [updateCurrentPlan]);

  useEffect(() => {
    if (showOptions && updateCurrentPlan) {
      const { deposit: minDeposit } = findMinimumDeposit(
        visits.map(v => ({
          ...v,
          travelFee: Number.isFinite(v.travelFee) ? v.travelFee : 0,
          consultingFee: Number.isFinite(v.consultingFee) ? v.consultingFee : 0,
        })),
        totalValue,
        selectedDuration
      );
      if (selectedDeposit < minDeposit) {
        setSelectedDeposit(minDeposit);
      }
    }
  }, [selectedDuration, showOptions, totalValue, visits, selectedDeposit]);

  const totalTravel = useMemo(() => visits.reduce((sum, v) => sum + (Number.isFinite(v.travelFee) ? v.travelFee : 0), 0), [visits]);
  const totalConsulting = useMemo(() => visits.reduce((sum, v) => sum + (Number.isFinite(v.consultingFee) ? v.consultingFee : 0), 0), [visits]);
  const onsiteCount = useMemo(() => visits.filter(v => (Number.isFinite(v.travelFee) ? v.travelFee : 0) > 0).length, [visits]);
  const virtualCount = useMemo(() => visits.filter(v => (Number.isFinite(v.travelFee) ? v.travelFee : 0) === 0).length, [visits]);

  const distribution = useMemo(() => {
    if (visits.length === 0) return { front: 0, mid: 0, back: 0, label: 'balanced' as const };
    const withIndex = visits.map((v, i) => ({ v, i }));
    // Sort by date when present; keep blanks at end preserving index
    const sorted = [...withIndex].sort((a, b) => {
      const da = a.v.date ? Date.parse(a.v.date) : Infinity;
      const db = b.v.date ? Date.parse(b.v.date) : Infinity;
      return da - db || a.i - b.i;
    });
    const n = sorted.length;
    const third = Math.max(1, Math.floor(n / 3));
    const frontEnd = third;
    const midEnd = Math.min(n, third * 2);
    const amount = (vv: typeof sorted[number]) => {
      const t = Number.isFinite(vv.v.travelFee) ? vv.v.travelFee : 0;
      const c = Number.isFinite(vv.v.consultingFee) ? vv.v.consultingFee : 0;
      return t + c;
    };
    const frontSum = sorted.slice(0, frontEnd).reduce((s, x) => s + amount(x), 0);
    const midSum = sorted.slice(frontEnd, midEnd).reduce((s, x) => s + amount(x), 0);
    const backSum = sorted.slice(midEnd).reduce((s, x) => s + amount(x), 0);
    const total = Math.max(1, frontSum + midSum + backSum);
    const pf = frontSum / total;
    const pm = midSum / total;
    const pb = backSum / total;
    let label: 'front heavy' | 'mid heavy' | 'back heavy' | 'balanced' = 'balanced';
    const max = Math.max(pf, pm, pb);
    if (max > 0.5) {
      if (pf === max) label = 'front heavy';
      else if (pm === max) label = 'mid heavy';
      else label = 'back heavy';
    }
    return { front: pf, mid: pm, back: pb, label };
  }, [visits]);

  const onShowOptions = () => {
    // Validate visits: require date and at least one of the fees > 0
    const nextErrors: Record<string, { date?: string; travelFee?: string; consultingFee?: string }> = {};
    visits.forEach((v) => {
      const e: { date?: string; travelFee?: string; consultingFee?: string } = {};
      if (!v.date) e.date = 'Please select a date';
      const travel = Number.isFinite(v.travelFee) ? v.travelFee : 0;
      const consult = Number.isFinite(v.consultingFee) ? v.consultingFee : 0;
      if (travel <= 0 && consult <= 0) {
        e.travelFee = 'Enter a positive amount';
        e.consultingFee = 'Enter a positive amount';
      }
      if (Object.keys(e).length > 0) nextErrors[v.id] = e;
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setShowOptions(false);
      setCurrentPlan(null);
      setIsVisitsCollapsed(false);
      return;
    }

    // Initialize with max duration and minimum deposit
    setSelectedDuration(maxDuration);
    const normalized = visits.map(v => ({
      ...v,
      travelFee: Number.isFinite(v.travelFee) ? v.travelFee : 0,
      consultingFee: Number.isFinite(v.consultingFee) ? v.consultingFee : 0,
    }));
    const { deposit: minDeposit } = findMinimumDeposit(normalized, totalValue, maxDuration);
    setSelectedDeposit(minDeposit);
    setShowOptions(true);
    setIsVisitsCollapsed(true);

    // Scroll to payment plan designer
    setTimeout(() => {
      designerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="card p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Coaching Package Calculator</h1>
            <p className="text-sm text-gray-500 mt-1">Designing the right plan for you and your clients</p>
      </div>

          {/* Visits Accordion Header/Summary */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {showOptions ? 'Package summary' : 'Coaching visits'}
            </h2>
            </div>

          {/* Collapsible Body */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isVisitsCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1200px] opacity-100'
            }`}
          >
            <div className="mt-4">
              <VisitForm
                  visits={visits}
                onVisitsChange={(v) => {
                  setVisits(v);
                  setShowOptions(false);
                  setCurrentPlan(null);
                  setIsVisitsCollapsed(false);
                  setErrors({});
                }}
                errors={errors}
                />

              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">Total value: <span className="font-semibold text-gray-900">${totalValue.toFixed(2)}</span></div>
            <Button disabled={visits.length === 0} onClick={onShowOptions}>
              Design payment plan
            </Button>
              </div>
            </div>
          </div>

          {/* Collapsed Summary Row */}
          {isVisitsCollapsed && (
            <div ref={summaryRef} className="mt-3 card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 w-full">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-900">Package summary</div>
                    <button
                      type="button"
                      onClick={() => setIsVisitsCollapsed(false)}
                      className="h-9 px-3 rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 text-sm shrink-0"
                    >
                      Edit visits
                    </button>
            </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Total block */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-200/50">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Total Value</div>
                      </div>
                      <div className="text-2xl font-bold text-slate-900 mb-3">${totalValue.toFixed(2)}</div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-1 px-2 bg-white/60 rounded-lg">
                          <span className="text-xs text-slate-600">Travel</span>
                          <span className="text-xs font-semibold text-slate-800">${totalTravel.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between py-1 px-2 bg-white/60 rounded-lg">
                          <span className="text-xs text-slate-600">Consulting</span>
                          <span className="text-xs font-semibold text-slate-800">${totalConsulting.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Visits block */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-200/50">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-slate-700 rounded-full"></div>
                        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Visits</div>
                      </div>
                      <div className="text-2xl font-bold text-slate-900 mb-3">{visits.length}</div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-1 px-2 bg-white/60 rounded-lg">
                          <span className="text-xs text-slate-600">Virtual</span>
                          <span className="text-xs font-semibold text-slate-800">{virtualCount}</span>
                        </div>
                        <div className="flex items-center justify-between py-1 px-2 bg-white/60 rounded-lg">
                          <span className="text-xs text-slate-600">Onsite</span>
                          <span className="text-xs font-semibold text-slate-800">{onsiteCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Duration block */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-200/50">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-slate-800 rounded-full"></div>
                        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Duration</div>
                      </div>
                      <div className="text-2xl font-bold text-slate-900 mb-3">
                        {(() => {
                          const dates = visits.map(v => v.date).filter(Boolean).map(d => Date.parse(d as string)).sort((a,b)=>a-b);
                          if (dates.length === 0) return 0;
                          const first = dates[0];
                          const last = dates[dates.length - 1];
                          const days = Math.max(1, Math.round((last - first) / (1000*60*60*24)) + 1);
                          const months = Math.max(1, Math.ceil(days / 30.44));
                          return `${months} mo`;
                        })()}
                      </div>
                      <div className="space-y-2">
                        {(() => {
                          const dates = visits.map(v => v.date).filter(Boolean).map(d => new Date(d as string)).sort((a,b)=>a.getTime()-b.getTime());
                          if (dates.length === 0) return null;
                          const days = Math.max(1, Math.round((dates[dates.length-1].getTime() - dates[0].getTime()) / (1000*60*60*24)) + 1);
                          const startLbl = dates[0].toLocaleString('en-US', { month: 'short', year: 'numeric' });
                          const endLbl = dates[dates.length-1].toLocaleString('en-US', { month: 'short', year: 'numeric' });
                          return (
                            <>
                              <div className="flex items-center justify-between py-1 px-2 bg-white/60 rounded-lg">
                                <span className="text-xs text-slate-600">Days</span>
                                <span className="text-xs font-semibold text-slate-800">{days}</span>
                              </div>
                              <div className="flex items-center justify-between py-1 px-2 bg-white/60 rounded-lg">
                                <span className="text-xs text-slate-600">{startLbl} – {endLbl}</span>
                                <span className="text-xs font-semibold text-slate-800"></span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Duration and monthly spend bar chart */}
            <div className="mt-6 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-5 border border-slate-200/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                  <div className="text-sm font-semibold text-slate-800">Monthly spend distribution</div>
                </div>
              </div>
                {(() => {
                  // Build monthly buckets from first to last visit
                  const valid = visits.filter(v => !!v.date);
                  if (valid.length === 0) return (
                    <div className="h-32 flex items-center justify-center text-slate-500 bg-white/60 rounded-lg">
                      <div className="text-center">
                        <div className="text-sm">No visits scheduled</div>
                        <div className="text-xs mt-1">Add visit dates to see monthly distribution</div>
                      </div>
                    </div>
                  );
                  const sorted = [...valid].sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
                  const start = new Date(sorted[0].date);
                  const end = new Date(sorted[sorted.length-1].date);
                  const buckets: { key: string; label: string; amount: number }[] = [];
                  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
                  const endBound = new Date(end.getFullYear(), end.getMonth(), 1);
                  while (cursor <= endBound) {
                    const k = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}`;
                    buckets.push({ key: k, label: cursor.toLocaleString('en-US', { month: 'short' }), amount: 0 });
                    cursor.setMonth(cursor.getMonth()+1);
                  }
                  for (const v of valid) {
                    const d = new Date(v.date);
                    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
                    const idx = buckets.findIndex(b => b.key === k);
                    const amt = (Number.isFinite(v.travelFee)?v.travelFee:0) + (Number.isFinite(v.consultingFee)?v.consultingFee:0);
                    if (idx >= 0) buckets[idx].amount += amt;
                  }
                  const data = buckets.map(b => ({ month: b.label, amount: Math.round(b.amount) }));
                  const max = Math.max(1, ...data.map(d => d.amount));
                return (
                  <div className="h-32 w-full bg-white/60 rounded-lg p-2">
                      <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data} margin={{ top: 20, right: 12, left: 12, bottom: 8 }}>
                        <XAxis
                          dataKey="month"
                          stroke="#64748b"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          fontSize={11}
                          fontWeight={500}
                        />
                          <YAxis hide domain={[0, max]} />
                          <Tooltip
                            formatter={(v: number) => [`$${Number(v).toFixed(0)}`, 'Monthly spend']}
                            cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                            contentStyle={{
                              borderRadius: 12,
                              borderColor: '#e2e8f0',
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              backdropFilter: 'blur(8px)',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              fontSize: 12,
                              fontWeight: 500
                            }}
                          />
                        <Bar
                          dataKey="amount"
                          fill="url(#barGradient)"
                          radius={[6,6,2,2]}
                          minPointSize={3}
                          barSize={18}
                        >
                            <LabelList position="top" content={(props) => {
                              const p = props as { x?: number; y?: number; width?: number; value?: number };
                              const x = (p.x ?? 0) + (p.width ?? 0) / 2;
                            const y = (p.y ?? 0) - 8;
                              const v = p.value != null ? Number(p.value) : 0;
                              if (v === 0) return null;
                              return (
                                <text x={x} y={y} textAnchor="middle" fill="#475569" fontSize={10} fontWeight={600}>
                                  ${v.toFixed(0)}
                                </text>
                              );
                            }} />
                          </Bar>
                          <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                              <stop offset="100%" stopColor="#3730a3" stopOpacity={0.7} />
                            </linearGradient>
                          </defs>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
                  </div>

              {/* Projection chart now shown below the selected option instead */}
                  </div>
          )}

          {showOptions && (
            <div ref={designerRef} className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Payment plan designer</h2>

              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-6 border border-slate-200/50">
                {/* Controls Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Duration Dropdown */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Payment duration
                    </label>
                    <select
                      value={selectedDuration}
                      onChange={(e) => setSelectedDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    >
                      {Array.from({ length: maxDuration }, (_, i) => i + 1).map((duration) => (
                        <option key={duration} value={duration}>
                          {duration} month{duration !== 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Down Payment Slider */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Down payment: ${selectedDeposit.toFixed(0)}
                    </label>
                    <input
                      type="range"
                      min={currentPlan ? Math.ceil(findMinimumDeposit(visits.map(v => ({
                        ...v,
                        travelFee: Number.isFinite(v.travelFee) ? v.travelFee : 0,
                        consultingFee: Number.isFinite(v.consultingFee) ? v.consultingFee : 0,
                      })), totalValue, selectedDuration).deposit / 5) * 5 : 0}
                      max={Math.ceil(totalValue / 5) * 5}
                      step={5}
                      value={selectedDeposit}
                      onChange={(e) => setSelectedDeposit(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-slate-600 mt-1">
                      <span>Min: ${currentPlan ? Math.ceil(findMinimumDeposit(visits.map(v => ({
                        ...v,
                        travelFee: Number.isFinite(v.travelFee) ? v.travelFee : 0,
                        consultingFee: Number.isFinite(v.consultingFee) ? v.consultingFee : 0,
                      })), totalValue, selectedDuration).deposit / 5) * 5 : '0'}</span>
                      <span>Max: ${Math.ceil(totalValue / 5) * 5}</span>
                    </div>
                  </div>
                </div>

                {/* Summary Display */}
                {currentPlan && (
                  <div className="bg-white rounded-xl p-4 border border-slate-200 mb-6">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-sm text-slate-600">Duration</div>
                        <div className="text-xl font-bold text-slate-900">{currentPlan.duration} month{currentPlan.duration !== 1 ? 's' : ''}</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600">Down payment</div>
                        <div className="text-xl font-bold text-slate-900">${currentPlan.deposit.toFixed(0)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600">Monthly payment</div>
                        <div className="text-xl font-bold text-slate-900">${currentPlan.monthlyPayment.toFixed(0)}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cash Flow Chart */}
                {currentPlan && (
                  <div className="bg-white/60 rounded-lg p-2">
                    <CashFlowChart paymentPlan={currentPlan} compact />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
