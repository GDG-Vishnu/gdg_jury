"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface EvaluationCardProps {
  title: string;
  value?: number;
  onChange?: (value: number) => void;
  maxScore?: number;
  borderColor?: string;
}

export default function EvaluationCard({
  title,
  value = 0,
  onChange,
  maxScore = 20,
  borderColor = "border-black",
}: EvaluationCardProps) {
  const [score, setScore] = useState<number>(value);

  useEffect(() => {
    setScore(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const numValue = parseInt(inputValue) || 0;

    if (inputValue && (numValue < 0 || numValue > maxScore)) {
      toast.error(`Score must be between 0 and ${maxScore}!`);
      return;
    }

    if (inputValue && isNaN(numValue)) {
      toast.error("Please enter a valid number!");
      return;
    }

    const newValue = Math.min(Math.max(0, numValue), maxScore);
    setScore(newValue);
    onChange?.(newValue);
  };

  return (
    <div
      className={`bg-white p-3 sm:p-4 rounded-2xl border-2 ${borderColor} shadow-sm w-full min-h-[120px] sm:h-32 flex flex-col justify-between hover:shadow-lg transition-shadow duration-200`}
    >
      <div className="space-y-2 sm:space-y-3">
        {/* Title */}
        <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight line-clamp-2">
          {title}
        </h3>

        {/* Input and Score Display */}
        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <input
              type="number"
              min="0"
              max={maxScore}
              value={score}
              onChange={handleInputChange}
              className="appearance-none relative block w-full px-2 py-2 sm:py-1 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-black focus:z-10 text-sm transition-all duration-200"
              placeholder="Score"
            />
          </div>
          <span className="text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">
            /{maxScore}
          </span>
        </div>
      </div>
    </div>
  );
}
