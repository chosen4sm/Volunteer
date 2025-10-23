"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { submitVolunteerForm } from "@/lib/utils";
import { getVolunteerByEmail, getVolunteerByPhone, updateVolunteer } from "@/lib/db";
import { CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface ShiftData {
  [key: string]: string[];
}

const DAYS = ["Friday", "Saturday", "Sunday", "Monday", "Tuesday"];
const DAY_DATES = ["November 7th", "November 8th", "November 9th", "November 10th", "November 11th"];
const SHIFTS = ["12am-6am", "6am-12pm", "12pm-6pm", "6pm-12am"];
const TEAMS = ["IV", "PMP", "Construction", "Decor"];

export function VolunteerForm() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [team, setTeam] = useState<string>("");
  const [shiftData, setShiftData] = useState<ShiftData>({
    Friday: [],
    Saturday: [],
    Sunday: [],
    Monday: [],
    Tuesday: [],
  });
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [existingVolunteerId, setExistingVolunteerId] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [showExistingMessage, setShowExistingMessage] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current && currentQuestion < 4 && currentQuestion !== 3) {
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleaned = value.replace(/\D/g, "");
    let formatted = "";
    
    if (cleaned.length === 0) {
      formatted = "";
    } else if (cleaned.length <= 3) {
      formatted = cleaned;
    } else if (cleaned.length <= 6) {
      formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else {
      formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
    
    setFormData({ ...formData, phone: formatted });
  };

  const isShiftDisabled = (day: string, shift: string) => {
    const dayShifts = shiftData[day] || [];
    const isSelected = dayShifts.includes(shift);
    
    if (isSelected) return false;
    
    const dayIndex = DAYS.indexOf(day);
    const shiftIndex = SHIFTS.indexOf(shift);
    
    const twoShiftsBack = shiftIndex >= 2 ? SHIFTS[shiftIndex - 2] : null;
    const oneShiftBack = shiftIndex > 0 ? SHIFTS[shiftIndex - 1] : null;
    const oneShiftForward = shiftIndex < SHIFTS.length - 1 ? SHIFTS[shiftIndex + 1] : null;
    const twoShiftsForward = shiftIndex <= SHIFTS.length - 3 ? SHIFTS[shiftIndex + 2] : null;
    
    if (twoShiftsBack && oneShiftBack && dayShifts.includes(twoShiftsBack) && dayShifts.includes(oneShiftBack)) {
      return true;
    }
    
    if (oneShiftForward && twoShiftsForward && dayShifts.includes(oneShiftForward) && dayShifts.includes(twoShiftsForward)) {
      return true;
    }
    
    if (shiftIndex === 0 && dayIndex > 0) {
      const prevDay = DAYS[dayIndex - 1];
      const lastShift = SHIFTS[SHIFTS.length - 1];
      const secondLastShift = SHIFTS[SHIFTS.length - 2];
      if (shiftData[prevDay]?.includes(lastShift) && shiftData[prevDay]?.includes(secondLastShift)) {
        return true;
      }
    }
    
    if (shiftIndex === 1 && dayIndex > 0) {
      const prevDay = DAYS[dayIndex - 1];
      const lastShift = SHIFTS[SHIFTS.length - 1];
      const firstShift = SHIFTS[0];
      if (shiftData[prevDay]?.includes(lastShift) && dayShifts.includes(firstShift)) {
        return true;
      }
    }
    
    if (shiftIndex === SHIFTS.length - 1 && dayIndex < DAYS.length - 1) {
      const nextDay = DAYS[dayIndex + 1];
      const firstShift = SHIFTS[0];
      const secondShift = SHIFTS[1];
      if (shiftData[nextDay]?.includes(firstShift) && shiftData[nextDay]?.includes(secondShift)) {
        return true;
      }
    }
    
    if (shiftIndex === SHIFTS.length - 2 && dayIndex < DAYS.length - 1) {
      const nextDay = DAYS[dayIndex + 1];
      const lastShift = SHIFTS[SHIFTS.length - 1];
      const firstShift = SHIFTS[0];
      if (dayShifts.includes(lastShift) && shiftData[nextDay]?.includes(firstShift)) {
        return true;
      }
    }
    
    return false;
  };

  const handleShiftToggle = (day: string, shift: string) => {
    const dayShifts = shiftData[day] || [];
    const isSelected = dayShifts.includes(shift);
    
    if (isSelected) {
      setShiftData({
        ...shiftData,
        [day]: dayShifts.filter((s) => s !== shift),
      });
    } else {
      if (isShiftDisabled(day, shift)) {
        toast.error("Maximum 2 consecutive shifts", {
          description: "You need a break after working 2 consecutive shifts.",
        });
        return;
      }
      setShiftData({
        ...shiftData,
        [day]: [...dayShifts, shift],
      });
    }
  };

  const checkExistingVolunteer = async () => {
    const email = formData.email;
    const phone = formData.phone;
    
    if ((!phone || phone.length < 10) && (!email || !email.includes("@"))) return;
    
    setIsCheckingEmail(true);
    try {
      let existing = null;
      
      if (phone && phone.length >= 10) {
        existing = await getVolunteerByPhone(phone);
      }
      
      if (!existing && email && email.includes("@")) {
        existing = await getVolunteerByEmail(email);
      }
      
      if (existing) {
        setExistingVolunteerId(existing.id);
        setFormData({
          name: existing.name,
          phone: existing.phone,
          email: existing.email,
        });
        setTeam(existing.team || "");
        setShiftData(existing.shifts || {
          Friday: [],
          Saturday: [],
          Sunday: [],
          Monday: [],
          Tuesday: [],
        });
        setShowExistingMessage(true);
        toast.info("Welcome back!", {
          description: "We found your information. You can update your availability.",
        });
      } else {
        setExistingVolunteerId(null);
        setShowExistingMessage(false);
      }
    } catch (error) {
      console.error("Error checking volunteer:", error);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (existingVolunteerId) {
        await updateVolunteer(existingVolunteerId, {
          name: formData.name,
          phone: formData.phone,
          team: team,
          shifts: shiftData,
        });
        toast.success("Updated!", {
          description: "Your availability has been updated successfully.",
        });
      } else {
        await submitVolunteerForm({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          team: team,
          shifts: shiftData,
        });
        toast.success("Thank you!", {
          description: "Your volunteer information has been submitted successfully.",
        });
      }
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
    if (currentQuestion === 0) return formData.name.trim().length > 0;
    if (currentQuestion === 1) return formData.phone.trim().length > 0;
    if (currentQuestion === 2) return formData.email.trim().length > 0 && formData.email.includes("@");
    if (currentQuestion === 3) return team.length > 0;
    return true;
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col relative overflow-hidden">
      {/* Progress bar */}
      <motion.div
        className="fixed top-0 left-0 h-1 bg-primary z-50"
        initial={{ width: "0%" }}
        animate={{
          width: `${((currentQuestion + (currentQuestion === 4 ? currentDayIndex / DAYS.length : 0)) / 6) * 100}%`,
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Logo/Title */}
      {currentQuestion < 6 && (
        <div className="fixed top-6 left-6 z-40">
          <h2 className="text-xl font-bold text-primary">
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
            {/* Question 0: Full Name */}
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
                    What&apos;s your full name?<span className="text-destructive inline-block ml-1">*</span>
                  </h1>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); if (canProceed()) handleNext(); }}>
                  <Input
                    ref={inputRef}
                    name="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Type your answer here..."
                    autoComplete="name"
                    className="text-2xl h-14 px-4 rounded-lg border-2 border-muted-foreground/10 focus-visible:border-primary focus-visible:ring-0 transition-colors bg-background/50"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canProceed()) handleNext();
                    }}
                  />
                </form>
              </motion.div>
            )}

            {/* Question 1: Phone */}
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
                    What&apos;s your phone number?<span className="text-destructive inline-block ml-1">*</span>
                  </h1>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); if (canProceed()) handleNext(); }}>
                  <Input
                    ref={inputRef}
                    name="phone"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    type="tel"
                    placeholder="Type your answer here..."
                    autoComplete="tel"
                    className="text-2xl h-14 px-4 rounded-lg border-2 border-muted-foreground/10 focus-visible:border-primary focus-visible:ring-0 transition-colors bg-background/50"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canProceed()) handleNext();
                    }}
                  />
                </form>
              </motion.div>
            )}

            {/* Question 2: Email */}
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
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground">
                    Your email address?<span className="text-destructive ml-1">*</span>
                  </h1>
                  {showExistingMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-chart-1/10 text-chart-1 rounded-lg text-base"
                    >
                      ✓ We found your information! You can continue to update your availability.
                    </motion.div>
                  )}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); if (canProceed() && !isCheckingEmail) { checkExistingVolunteer(); handleNext(); } }}>
                  <Input
                    ref={inputRef}
                    name="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    disabled={isCheckingEmail}
                    className="text-2xl h-14 px-4 rounded-lg border-2 border-muted-foreground/10 focus-visible:border-primary focus-visible:ring-0 transition-colors bg-background/50"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canProceed() && !isCheckingEmail) {
                        checkExistingVolunteer();
                        handleNext();
                      }
                    }}
                  />
                </form>
              </motion.div>
            )}

            {/* Question 3: Team */}
            {currentQuestion === 3 && (
              <motion.div
                key="q3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground">
                    What team are you part of?<span className="text-destructive inline-block ml-1">*</span>
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Select one
                  </p>
                </div>
                <div className="space-y-4">
                  {TEAMS.map((teamOption) => (
                    <motion.div
                      key={teamOption}
                      whileHover={{ scale: 1.02 }}
                      className={`flex items-center space-x-4 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                        team === teamOption
                          ? "border-primary bg-accent"
                          : "border-border bg-background/50 hover:border-primary hover:bg-accent"
                      }`}
                      onClick={() => setTeam(teamOption)}
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        team === teamOption
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      }`}>
                        {team === teamOption && (
                          <div className="w-3 h-3 rounded-full bg-primary-foreground" />
                        )}
                      </div>
                      <span className="text-xl font-medium">{teamOption}</span>
                    </motion.div>
                  ))}
                </div>
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
                  {SHIFTS.map((shift) => {
                    const disabled = isShiftDisabled(DAYS[currentDayIndex], shift);
                    return (
                      <motion.div
                        key={shift}
                        whileHover={disabled ? {} : { scale: 1.02 }}
                        className={`flex items-center space-x-4 p-5 rounded-xl border-2 transition-all ${
                          disabled
                            ? "border-muted bg-muted/30 cursor-not-allowed opacity-50"
                            : "border-border bg-background/50 hover:border-primary hover:bg-accent cursor-pointer"
                        }`}
                        onClick={() => handleShiftToggle(DAYS[currentDayIndex], shift)}
                      >
                        <Checkbox
                          checked={shiftData[DAYS[currentDayIndex]]?.includes(shift) || false}
                          disabled={disabled}
                          className="w-6 h-6 border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary pointer-events-none"
                        />
                        <span className="text-xl font-medium">{shift}</span>
                      </motion.div>
                    );
                  })}
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
                    <p className="text-xl">{formData.name}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm">Contact</p>
                    <p>{formData.email}</p>
                    <p>{formData.phone}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm">Team</p>
                    <p>{team}</p>
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
                  <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
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
                  <CheckCircle className="w-24 h-24 text-chart-1" />
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
              onClick={() => {
                if (currentQuestion === 2 && canProceed()) {
                  checkExistingVolunteer();
                }
                handleNext();
              }}
              disabled={!canProceed() || isCheckingEmail}
              size="lg"
              className="bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground text-base px-8 shadow-lg"
            >
              {isCheckingEmail ? "Checking..." : "OK"} <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              size="lg"
              className="bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground text-base px-8 shadow-lg"
            >
              {isLoading ? "Submitting..." : "Submit"}
            </Button>
          )}
        </motion.div>
      )}

      {/* Keyboard hint */}
      {currentQuestion < 3 && canProceed() && currentQuestion !== 3 && (
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
