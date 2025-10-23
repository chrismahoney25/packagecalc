'use client';

import { useEffect, useMemo, useState } from 'react';
import { PaymentPlan, Visit } from '@/types';
import { generateCashFlow, calculateTotalValue, getLatestVisitDate, findMinimumMonthlyPayment } from '@/utils/paymentCalculations';
import { parseISO } from 'date-fns';

interface PlanTunerProps {
  visits: Visit[];
  basePlan: PaymentPlan | null;
  onPreviewPlan: (plan: PaymentPlan | null) => void;
}

export default function PlanTuner({ visits, basePlan, onPreviewPlan }: PlanTunerProps) {
  const totalValue = useMemo(() => calculateTotalValue(visits), [visits]);

  const firstVisitDate = useMemo(() => (visits[0]?.date ?? ''), [visits]);
  const lastVisitDate = useMemo(() => getLatestVisitDate(visits), [visits]);

  const monthsBetween = useMemo(() => {
    if (!firstVisitDate || !lastVisitDate) return 1;
    const first = parseISO(firstVisitDate);
    const last = parseISO(lastVisitDate);
    const diffMs = last.getTime() - first.getTime();
    const months = Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30.44));
    return Math.max(1, months);
  }, [firstVisitDate, lastVisitDate]);

  // Duration slider: allow within [1, monthsBetween]
  const [duration, setDuration] = useState<number>(basePlan?.duration ?? monthsBetween);

  // Deposit input; monthly derived from deposit and duration
  const [deposit, setDeposit] = useState<number>(basePlan?.deposit ?? 0);
  const monthlyPayment = useMemo(
    () => findMinimumMonthlyPayment(visits, totalValue, duration, deposit),
    [visits, totalValue, duration, deposit]
  );
  const maxDeposit = useMemo(() => totalValue, [totalValue]);

  // Build preview plan and validate against 20% owed
  const previewPlan: PaymentPlan | null = useMemo(() => {
    if (visits.length === 0 || !lastVisitDate) return null;
    const effDeposit = Math.min(Math.max(0, deposit), totalValue);
    const monthly = monthlyPayment;
    const maxOutstanding = totalValue * 0.2;
    const plan: PaymentPlan = {
      id: 'tuned',
      deposit: effDeposit,
      monthlyPayment: monthly,
      duration,
      totalValue,
      visits,
      endDate: lastVisitDate,
      isValid: true,
      maxOutstanding,
    };
    const cf = generateCashFlow(plan);
    const maxOwed = cf.reduce((acc, c) => Math.max(acc, Math.max(0, -c.balance)), 0);
    if (maxOwed > maxOutstanding) {
      return { ...plan, isValid: false };
    }
    return plan;
  }, [visits, lastVisitDate, totalValue, monthlyPayment, duration, deposit]);

  useEffect(() => {
    onPreviewPlan(previewPlan);
  }, [previewPlan, onPreviewPlan]);

  if (visits.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">Add visits to tune a plan</div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Tune Plan</h3>

      <div className="grid gap-4">
        <div className="bg-white p-4 rounded border">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-gray-600">Deposit ($)</label>
            <div className="text-sm font-medium">${deposit.toFixed(2)}</div>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, Math.floor(maxDeposit))}
            step={1}
            value={Math.min(deposit, maxDeposit)}
            onChange={(e) => setDeposit(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="mt-1 text-xs text-gray-500">Adjust upfront deposit; monthly is derived</div>
        </div>

        <div className="bg-white p-4 rounded border">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-gray-600">Plan Duration (months)</label>
            <div className="text-sm font-medium">{duration} mo</div>
          </div>
          <input
            type="range"
            min={1}
            max={monthsBetween}
            step={1}
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value, 10))}
            className="w-full"
          />
          <div className="mt-1 text-xs text-gray-500">Between 1 and {monthsBetween} months (span of visits)</div>
        </div>
      </div>

      {previewPlan && (
        <div className={`p-3 rounded border ${previewPlan.isValid ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div><span className="text-gray-600">Deposit:</span> <span className="font-semibold">${previewPlan.deposit.toFixed(2)}</span></div>
            <div><span className="text-gray-600">Monthly (derived):</span> <span className="font-semibold">${previewPlan.monthlyPayment.toFixed(2)}</span></div>
            <div><span className="text-gray-600">Duration:</span> <span className="font-semibold">{previewPlan.duration} mo</span></div>
            <div><span className="text-gray-600">Max Outstanding:</span> <span className="font-semibold">${previewPlan.maxOutstanding.toFixed(2)}</span></div>
            <div><span className="text-gray-600">Status:</span> <span className={previewPlan.isValid ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>{previewPlan.isValid ? 'Valid' : 'Exceeds 20% limit'}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}


