"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { submitVolunteerForm } from "@/lib/utils";
import { CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface ShiftData {
  [key: string]: string[];
}

const DAYS = ["Friday", "Saturday", "Sunday", "Monday"];
const DAY_DATES = ["November 7th", "November 8th", "November 9th", "November 10th"];
const SHIFTS = ["Day Time", "Over Night"];

export function VolunteerForm() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });
  const [shiftData, setShiftData] = useState<ShiftData>({
    Friday: [],
    Saturday: [],
    Sunday: [],
    Monday: [],
  });
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current && currentQuestion < 4) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [currentQuestion]);

  const handleNext = () => {
    if (currentQuestion < 4) {
      setCurrentQuestion(currentQuestion + 1);
    } else if (currentQuestion === 4 && currentDayIndex < DAYS.length - 1) {
      setCurrentDayIndex(currentDayIndex + 1);
    } else if (currentQuestion === 4 && currentDayIndex === DAYS.length - 1) {
      setCurrentQuestion(5);
    }
  };

  const handleBack = () => {
    if (currentQuestion === 5) {
      setCurrentDayIndex(DAYS.length - 1);
      setCurrentQuestion(4);
    } else if (currentQuestion === 4 && currentDayIndex > 0) {
      setCurrentDayIndex(currentDayIndex - 1);
    } else if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleShiftToggle = (day: string, shift: string) => {
    setShiftData((prev) => {
      const dayShifts = prev[day] || [];
      const isSelected = dayShifts.includes(shift);
      if (isSelected) {
        return {
          ...prev,
          [day]: dayShifts.filter((s) => s !== shift),
        };
      } else {
        return {
          ...prev,
          [day]: [...dayShifts, shift],
        };
      }
    });
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await submitVolunteerForm({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email,
        shifts: shiftData,
      });
      toast.success("Thank you!", {
        description: "Your volunteer information has been submitted successfully.",
      });
      setCurrentQuestion(6);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to submit. Please try again.";
      toast.error("Submission Failed", {
        description: errorMessage,
      });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    if (currentQuestion === 0) return formData.firstName.trim().length > 0;
    if (currentQuestion === 1) return formData.lastName.trim().length > 0;
    if (currentQuestion === 2) return formData.phone.trim().length > 0;
    if (currentQuestion === 3) return formData.email.trim().length > 0 && formData.email.includes("@");
    return true;
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col relative overflow-hidden">
      {/* Progress bar */}
      <motion.div
        className="fixed top-0 left-0 h-1 bg-indigo-600 z-50"
        initial={{ width: "0%" }}
        animate={{
          width: `${((currentQuestion + (currentQuestion === 4 ? currentDayIndex / DAYS.length : 0)) / 6) * 100}%`,
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Logo/Title */}
      {currentQuestion < 6 && (
        <div className="fixed top-6 left-6 z-40">
          <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            Volunteer Sign Up
          </h2>
        </div>
      )}

      {/* Question counter */}
      {currentQuestion < 6 && (
        <div className="fixed top-20 right-6 text-sm text-muted-foreground z-40">
          {currentQuestion + 1} / 6
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-8 py-20 pb-32 relative z-10">
        <div className="w-full max-w-3xl">
          <AnimatePresence mode="wait">
            {/* Question 0: First Name */}
            {currentQuestion === 0 && (
              <motion.div
                key="q0"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div className="space-y-6">
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight">
                    What&apos;s your first name?<span className="text-rose-600 dark:text-rose-400 inline-block ml-1">*</span>
                  </h1>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); if (canProceed()) handleNext(); }}>
                  <Input
                    ref={inputRef}
                    name="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Type your answer here..."
                    autoComplete="given-name"
                    className="text-2xl h-14 px-4 rounded-lg border-2 border-muted-foreground/10 focus-visible:border-indigo-600 focus-visible:ring-0 transition-colors bg-background/50"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canProceed()) handleNext();
                    }}
                  />
                </form>
              </motion.div>
            )}

            {/* Question 1: Last Name */}
            {currentQuestion === 1 && (
              <motion.div
                key="q1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div className="space-y-6">
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight">
                    And your last name?<span className="text-rose-600 dark:text-rose-400 inline-block ml-1">*</span>
                  </h1>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); if (canProceed()) handleNext(); }}>
                  <Input
                    ref={inputRef}
                    name="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Type your answer here..."
                    autoComplete="family-name"
                    className="text-2xl h-14 px-4 rounded-lg border-2 border-muted-foreground/10 focus-visible:border-indigo-600 focus-visible:ring-0 transition-colors bg-background/50"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canProceed()) handleNext();
                    }}
                  />
                </form>
              </motion.div>
            )}

            {/* Question 2: Phone */}
            {currentQuestion === 2 && (
              <motion.div
                key="q2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div className="space-y-6">
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight">
                    What&apos;s your phone number?<span className="text-rose-600 dark:text-rose-400 inline-block ml-1">*</span>
                  </h1>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); if (canProceed()) handleNext(); }}>
                  <Input
                    ref={inputRef}
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    type="tel"
                    placeholder="Type your answer here..."
                    autoComplete="tel"
                    className="text-2xl h-14 px-4 rounded-lg border-2 border-muted-foreground/10 focus-visible:border-indigo-600 focus-visible:ring-0 transition-colors bg-background/50"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canProceed()) handleNext();
                    }}
                  />
                </form>
              </motion.div>
            )}

            {/* Question 3: Email */}
            {currentQuestion === 3 && (
              <motion.div
                key="q3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div className="space-y-6">
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground">
                    Your email address?<span className="text-rose-600 dark:text-rose-400 ml-1">*</span>
                  </h1>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); if (canProceed()) handleNext(); }}>
                  <Input
                    ref={inputRef}
                    name="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    className="text-2xl h-14 px-4 rounded-lg border-2 border-muted-foreground/10 focus-visible:border-indigo-600 focus-visible:ring-0 transition-colors bg-background/50"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canProceed()) handleNext();
                    }}
                  />
                </form>
              </motion.div>
            )}

            {/* Question 4: Availability per day */}
            {currentQuestion === 4 && (
              <motion.div
                key={`q4-${currentDayIndex}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground">
                    {DAYS[currentDayIndex]}, {DAY_DATES[currentDayIndex]}
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Select all shifts you&apos;re available (or skip if unavailable)
                  </p>
                </div>
                <div className="space-y-4">
                  {SHIFTS.map((shift) => (
                    <motion.div
                      key={shift}
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center space-x-4 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-background/50 hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer transition-all"
                      onClick={() => handleShiftToggle(DAYS[currentDayIndex], shift)}
                    >
                      <Checkbox
                        checked={shiftData[DAYS[currentDayIndex]]?.includes(shift) || false}
                        onCheckedChange={() => handleShiftToggle(DAYS[currentDayIndex], shift)}
                        className="w-6 h-6 border-2 border-gray-400 dark:border-gray-500 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      />
                      <span className="text-xl font-medium">{shift}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Question 5: Review */}
            {currentQuestion === 5 && (
              <motion.div
                key="q5"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground">
                    Almost done! 🎉
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Review your information
                  </p>
                </div>
                <div className="space-y-6 text-lg">
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm">Name</p>
                    <p className="text-xl">{formData.firstName} {formData.lastName}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm">Contact</p>
                    <p>{formData.email}</p>
                    <p>{formData.phone}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm">Availability</p>
                    {DAYS.map((day) => (
                      <div key={day}>
                        {shiftData[day]?.length > 0 && (
                          <p>
                            <span className="font-medium">{day}:</span> {shiftData[day].join(", ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 rounded-lg">
                    {error}
                  </div>
                )}
              </motion.div>
            )}

            {/* Success screen */}
            {currentQuestion === 6 && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center space-y-8"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5 }}
                  className="flex justify-center"
                >
                  <CheckCircle className="w-24 h-24 text-green-600 dark:text-green-400" />
                </motion.div>
                <div className="space-y-4">
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground">
                    Thank you! 🙏
                  </h1>
                  <p className="text-xl text-muted-foreground">
                    Your volunteer information has been submitted successfully.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation buttons */}
      {currentQuestion < 6 && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 p-6 flex justify-between items-center bg-linear-to-t from-background/80 to-transparent backdrop-blur-sm z-50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {currentQuestion > 0 ? (
            <Button
              onClick={handleBack}
              variant="ghost"
              size="lg"
              className="text-base"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {currentQuestion < 5 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-base px-8 shadow-lg"
            >
              OK <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-base px-8 shadow-lg"
            >
              {isLoading ? "Submitting..." : "Submit"}
            </Button>
          )}
        </motion.div>
      )}

      {/* Keyboard hint */}
      {currentQuestion < 4 && canProceed() && (
        <motion.div
          className="fixed bottom-24 right-6 text-sm text-muted-foreground flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter ↵</kbd>
        </motion.div>
      )}
    </div>
  );
}
