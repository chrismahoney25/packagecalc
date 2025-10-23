'use client';

import { Visit } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface VisitFormProps {
  visits: Visit[];
  onVisitsChange: (visits: Visit[]) => void;
  errors?: Record<string, { date?: string; travelFee?: string; consultingFee?: string }>;
}

export default function VisitForm({ visits, onVisitsChange, errors = {} }: VisitFormProps) {
  const addBlankVisit = () => {
    const newVisit: Visit = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: '',
    travelFee: 0,
      consultingFee: 0,
    };
    onVisitsChange([...visits, newVisit]);
  };

  const removeVisit = (id: string) => {
    onVisitsChange(visits.filter(visit => visit.id !== id));
  };

  const updateVisit = (id: string, field: keyof Visit, value: string | number) => {
    const updatedVisits = visits.map(visit => 
      visit.id === id ? { ...visit, [field]: value } : visit
    );
    onVisitsChange(updatedVisits);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {visits.map((visit, idx) => (
          <div key={visit.id} className="bg-white border border-gray-200 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-slate-800">Visit {idx + 1}</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeVisit(visit.id)}
                className="text-red-600 hover:text-red-700 hover:border-red-300"
                aria-label={`Remove visit ${idx + 1}`}
                title={`Remove visit ${idx + 1}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
          </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <Input
                      type="date"
                      value={visit.date}
                      onChange={(e) => updateVisit(visit.id, 'date', e.target.value)}
                  aria-invalid={!!errors[visit.id]?.date}
                  className={errors[visit.id]?.date ? 'border-rose-300 focus:border-rose-600 focus:ring-rose-200' : undefined}
                    />
                {errors[visit.id]?.date && (
                  <div className="mt-1 text-xs text-rose-600">{errors[visit.id]?.date}</div>
                )}
                  </div>
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Travel Fee ($)</label>
                <Input
                      type="number"
                      min="0"
                      step="0.01"
                  placeholder="0"
                  value={visit.travelFee === 0 ? '' : visit.travelFee}
                      onChange={(e) => updateVisit(visit.id, 'travelFee', parseFloat(e.target.value) || 0)}
                  aria-invalid={!!errors[visit.id]?.travelFee}
                  className={errors[visit.id]?.travelFee ? 'border-rose-300 focus:border-rose-600 focus:ring-rose-200' : undefined}
                    />
                {errors[visit.id]?.travelFee && (
                  <div className="mt-1 text-xs text-rose-600">{errors[visit.id]?.travelFee}</div>
                )}
                  </div>
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Consulting Fee ($)</label>
                <Input
                      type="number"
                      min="0"
                      step="0.01"
                  placeholder="0"
                  value={visit.consultingFee === 0 ? '' : visit.consultingFee}
                      onChange={(e) => updateVisit(visit.id, 'consultingFee', parseFloat(e.target.value) || 0)}
                  aria-invalid={!!errors[visit.id]?.consultingFee}
                  className={errors[visit.id]?.consultingFee ? 'border-rose-300 focus:border-rose-600 focus:ring-rose-200' : undefined}
                    />
                {errors[visit.id]?.consultingFee && (
                  <div className="mt-1 text-xs text-rose-600">{errors[visit.id]?.consultingFee}</div>
                )}
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Total: ${(visit.travelFee + visit.consultingFee).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          
      <div className="flex justify-center">
        <button
          type="button"
          onClick={addBlankVisit}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          aria-label="Add visit"
          title="Add visit"
        >
          <span className="text-lg leading-none">+</span>
          <span className="text-sm font-medium">Add Visit</span>
        </button>
        </div>
    </div>
  );
}