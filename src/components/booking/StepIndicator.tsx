"use client";

import { WizardStep } from "@/hooks/useBookingWizard";

const STEPS: { num: WizardStep; label: string }[] = [
  { num: 1, label: "Dates" },
  { num: 2, label: "Room" },
  { num: 3, label: "Experiences" },
  { num: 4, label: "Review" },
  { num: 5, label: "Your Magic" },
  { num: 6, label: "Checkout" },
];

interface StepIndicatorProps {
  currentStep: WizardStep;
  onGoToStep: (step: WizardStep) => void;
  completedSteps: Set<WizardStep>;
}

export default function StepIndicator({
  currentStep,
  onGoToStep,
  completedSteps,
}: StepIndicatorProps) {
  return (
    <div className="w-full flex items-center mb-8">
      {STEPS.map((step, index) => {
        const isActive = step.num === currentStep;
        const isCompleted = completedSteps.has(step.num);
        const isClickable = isCompleted;

        return (
          <div key={step.num} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <button
                onClick={() => isClickable && onGoToStep(step.num)}
                disabled={!isClickable}
                aria-label={`Step ${step.num}: ${step.label}`}
                className={[
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all border-2",
                  isActive
                    ? "bg-teal-600 border-teal-600 text-white shadow-lg scale-110"
                    : isCompleted
                      ? "bg-white border-teal-500 text-teal-600 cursor-pointer hover:bg-teal-50"
                      : "bg-white border-gray-200 text-gray-400 cursor-default",
                ].join(" ")}
              >
                {isCompleted && !isActive ? "✓" : step.num}
              </button>
              <span
                className={[
                  "text-xs mt-1.5 font-medium hidden sm:block whitespace-nowrap",
                  isActive
                    ? "text-teal-700"
                    : isCompleted
                      ? "text-teal-500"
                      : "text-gray-400",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={[
                  "flex-1 h-1 mx-2 rounded-full transition-all",
                  isCompleted ? "bg-teal-400" : "bg-gray-200",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
