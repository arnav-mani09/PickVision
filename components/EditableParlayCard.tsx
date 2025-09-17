import React from 'react';
import type { EditableParlayLeg } from '../types';
import { Card } from './ui/Card';
import { Select } from './ui/Select'; // Assuming Select component exists and is styled

interface EditableParlayCardProps {
  legs: EditableParlayLeg[];
  onUpdateLegCondition: (legId: string, newCondition: string) => void;
  title: string;
}

export const EditableParlayCard: React.FC<EditableParlayCardProps> = ({ legs, onUpdateLegCondition, title }) => {
  if (!legs || legs.length === 0) {
    return (
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-3 text-purple-400">{title}</h3>
          <p className="text-gray-400">No parlay legs to display or edit.</p>
        </div>
      </Card>
    );
  }

  const overUnderOptions = [
    { value: 'Over', label: 'Over' },
    { value: 'Under', label: 'Under' },
  ];

  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-purple-400">{title}</h3>
        <div className="space-y-4">
          {legs.map((leg) => (
            <div key={leg.id} className="p-4 bg-gray-800 rounded-md shadow grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
              <div className="md:col-span-2">
                <p className="font-medium text-gray-200">{leg.playerTeam}</p>
                <p className="text-sm text-gray-400">{leg.stat} {leg.value && !leg.isEditableOverUnder ? leg.condition + ' ' + leg.value : leg.isEditableOverUnder ? leg.value : ''}</p>
              </div>
              
              <div className="md:col-span-2">
                {leg.isEditableOverUnder ? (
                  <Select
                    aria-label={`Condition for ${leg.playerTeam} ${leg.stat}`}
                    options={overUnderOptions}
                    value={leg.condition}
                    onChange={(e) => onUpdateLegCondition(leg.id, e.target.value)}
                    className="w-full md:w-auto bg-gray-800 border-gray-700"
                  />
                ) : (
                  <p className="text-gray-300 font-medium text-right md:text-left">{leg.condition} {leg.isEditableOverUnder ? '' : leg.value}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-4">
            Review the extracted parlay details. For "Over/Under" bets, you can adjust the condition using the dropdown. Other bet types are displayed as extracted.
        </p>
      </div>
    </Card>
  );
};