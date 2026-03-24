"use client";

import { useAuth } from "@/hooks/useAuth";
import {
  useBookingWizard,
  RoomType,
  WizardStep,
} from "@/hooks/useBookingWizard";
import StepIndicator from "./StepIndicator";
import StepDates from "./steps/StepDates";
import StepRooms from "./steps/StepRooms";
import StepExperiences from "./steps/StepExperiences";
import StepReview from "./steps/StepReview";
import StepCheckout from "./steps/StepCheckout";
import StepMagicFamily from "./steps/StepMagicFamily";

interface BookingWizardProps {
  initialData?: {
    roomType?: RoomType;
    checkIn?: string;
    checkOut?: string;
  };
}

export default function BookingWizard({ initialData }: BookingWizardProps) {
  const { user } = useAuth();
  const wizard = useBookingWizard(initialData);

  // Steps below current are "completed" and can be navigated back to
  const completedSteps = new Set<WizardStep>(
    ([1, 2, 3, 4, 5, 6] as WizardStep[]).filter((s) => s < wizard.step),
  );

  // Total available rooms for the availability tip on Step 1
  const totalAvailableRooms = wizard.availability
    ? wizard.availability
        .filter((r) => r.available)
        .reduce((sum, r) => sum + r.availableRooms, 0)
    : undefined;

  return (
    <div className="max-w-4xl mx-auto">
      <StepIndicator
        currentStep={wizard.step}
        onGoToStep={wizard.goToStep}
        completedSteps={completedSteps}
      />

      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
        {wizard.step === 1 && (
          <StepDates
            checkInDate={wizard.checkInDate}
            checkOutDate={wizard.checkOutDate}
            nights={wizard.nights}
            groupSize={wizard.groupSize}
            availLoading={wizard.availLoading}
            availableCount={totalAvailableRooms}
            onSetCheckIn={wizard.setCheckInDate}
            onSetCheckOut={wizard.setCheckOutDate}
            onSetGroupSize={wizard.setGroupSize}
            onNext={wizard.nextStep}
          />
        )}

        {wizard.step === 2 && (
          <StepRooms
            selectedRoomType={wizard.roomType}
            groupSize={wizard.groupSize}
            availability={wizard.availability}
            availLoading={wizard.availLoading}
            nights={wizard.nights}
            onSelectRoom={wizard.setRoomType}
            onNext={wizard.nextStep}
            onBack={wizard.prevStep}
          />
        )}

        {wizard.step === 3 && (
          <StepExperiences
            activityLevel={wizard.activityLevel}
            tourBudget={wizard.tourBudget}
            interests={wizard.interests}
            isLoading={wizard.isLoading}
            onSetActivityLevel={wizard.setActivityLevel}
            onSetTourBudget={wizard.setTourBudget}
            onToggleInterest={wizard.toggleInterest}
            onGeneratePackage={wizard.generatePackage}
            onSkip={wizard.generateRoomOnlyPackage}
            onBack={wizard.prevStep}
          />
        )}

        {wizard.step === 4 && wizard.packageResult && (
          <StepReview
            packageResult={wizard.packageResult}
            roomType={wizard.roomType}
            checkInDate={wizard.checkInDate}
            checkOutDate={wizard.checkOutDate}
            nights={wizard.nights}
            selectedRoom={wizard.selectedRoom}
            bundleSelected={wizard.bundleSelected}
            onSetBundleSelected={wizard.setBundleSelected}
            promoCode={wizard.promoCode}
            promoResult={wizard.promoResult}
            promoLoading={wizard.promoLoading}
            showPromo={wizard.showPromo}
            onSetPromoCode={wizard.setPromoCode}
            onValidatePromo={wizard.validatePromo}
            onClearPromo={wizard.clearPromo}
            onSetShowPromo={wizard.setShowPromo}
            onNext={wizard.nextStep}
            onBack={wizard.prevStep}
          />
        )}

        {wizard.step === 5 && wizard.packageResult && (
          <StepMagicFamily
            packageResult={wizard.packageResult}
            checkInDate={wizard.checkInDate}
            checkOutDate={wizard.checkOutDate}
            nights={wizard.nights}
            bundleSelected={wizard.bundleSelected}
            promoResult={wizard.promoResult}
            guestDetails={wizard.guestDetails}
            onSetGuestDetails={wizard.setGuestDetails}
            onAuthComplete={wizard.proceedToCheckout}
            onGuestCheckout={wizard.proceedAsGuest}
            onBack={wizard.prevStep}
          />
        )}

        {wizard.step === 6 && wizard.packageResult && (
          <StepCheckout
            packageResult={wizard.packageResult}
            promoResult={wizard.promoResult}
            nights={wizard.nights}
            bundleSelected={wizard.bundleSelected}
            guestMode={wizard.guestMode}
            guestDetails={wizard.guestDetails}
            paymentOptions={wizard.paymentOptions}
            paymentMode={wizard.paymentMode}
            squareSdkReady={wizard.squareSdkReady}
            hasSquare={wizard.hasSquare}
            onSetGuestDetails={wizard.setGuestDetails}
            onHandlePay={wizard.handlePay}
            onPaymentSuccess={wizard.handlePaymentSuccess}
            onFallbackToStripe={wizard.fallbackToStripe}
            onSetSquareSdkReady={wizard.setSquareSdkReady}
            onSetPaymentMode={wizard.setPaymentMode}
            onBack={wizard.prevStep}
            user={user}
          />
        )}
      </div>
    </div>
  );
}
