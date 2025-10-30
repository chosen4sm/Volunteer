"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { submitVolunteerForm, normalizePhone, formatPhone } from "@/lib/utils";
import { getVolunteerByEmail, getVolunteerByPhone, updateVolunteer } from "@/lib/db";
import { getFormConfig, type FormConfig } from "@/lib/config";
import { CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface ShiftData {
  [key: string]: string[];
}

interface FormAnswers {
  [key: string]: string | string[];
}

export function VolunteerForm() {
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formAnswers, setFormAnswers] = useState<FormAnswers>({});
  const [shiftData, setShiftData] = useState<ShiftData>({});
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [existingVolunteerId, setExistingVolunteerId] = useState<string | null>(null);
  const [showExistingMessage, setShowExistingMessage] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await getFormConfig();
        setFormConfig(config);
        
        // Initialize shift data
        const shifts: ShiftData = {};
        config.days.forEach((day) => {
          shifts[day] = [];
        });
        setShiftData(shifts);
      } catch (error) {
        console.error("Error fetching form config:", error);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (inputRef.current && currentQuestionIndex < (formConfig?.questions.length || 0)) {
      const currentQuestion = formConfig?.questions[currentQuestionIndex];
      if (currentQuestion && ["text", "tel", "email"].includes(currentQuestion.type)) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    }
  }, [currentQuestionIndex, formConfig]);

  // Detect autofill
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const onAnimationStart = (e: AnimationEvent) => {
      if (e.animationName === 'onAutoFillStart') {
        setIsAutoFilling(true);
      }
    };

    const onAnimationEnd = (e: AnimationEvent) => {
      if (e.animationName === 'onAutoFillCancel') {
        setIsAutoFilling(false);
      }
    };

    input.addEventListener('animationstart', onAnimationStart as EventListener);
    input.addEventListener('animationend', onAnimationEnd as EventListener);

    return () => {
      input.removeEventListener('animationstart', onAnimationStart as EventListener);
      input.removeEventListener('animationend', onAnimationEnd as EventListener);
    };
  }, [inputRef, currentQuestionIndex]);

  if (!formConfig) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading form...</div>
      </div>
    );
  }

  const currentQuestion = formConfig.questions[currentQuestionIndex];
  const shiftsQuestionIndex = formConfig.questions.findIndex(q => q.type === "shifts");
  const totalQuestions = formConfig.questions.length + (shiftsQuestionIndex >= 0 ? formConfig.days.length - 1 : 0) + 1; // -1 because shifts question expands into days, +1 for review
  const isShiftsQuestion = currentQuestion?.type === "shifts";
  
  // Calculate current progress step accounting for expanded shifts
  const getCurrentStep = () => {
    if (shiftsQuestionIndex >= 0 && currentQuestionIndex > shiftsQuestionIndex) {
      // After shifts: add all the days we went through
      return currentQuestionIndex + formConfig.days.length - 1;
    } else if (isShiftsQuestion) {
      // During shifts: add current day index
      return currentQuestionIndex + currentDayIndex;
    }
    // Before shifts or no shifts question
    return currentQuestionIndex;
  };

  const handleNext = () => {
    if (!currentQuestion?.required || validateCurrentAnswer()) {
      if (isShiftsQuestion && currentDayIndex < formConfig.days.length - 1) {
        setCurrentDayIndex(currentDayIndex + 1);
      } else if (isShiftsQuestion && currentDayIndex === formConfig.days.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else if (currentQuestionIndex < formConfig.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setCurrentDayIndex(0);
      } else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    } else {
      toast.error("Please fill in all required fields");
    }
  };

  const handleBack = () => {
    if (isShiftsQuestion && currentDayIndex > 0) {
      setCurrentDayIndex(currentDayIndex - 1);
    } else if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      if (isShiftsQuestion) {
        setCurrentDayIndex(formConfig.days.length - 1);
      }
    }
  };

  const validateCurrentAnswer = (): boolean => {
    if (!currentQuestion) return true;
    if (!currentQuestion.required) return true;

    const answer = formAnswers[currentQuestion.id];
    if (!answer || (typeof answer === "string" && !answer.trim())) return false;
    if (Array.isArray(answer) && answer.length === 0 && currentQuestion.type !== "shifts") return false;
    
    return true;
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Find the questions by type instead of hardcoded IDs
      const nameQuestion = formConfig.questions.find(q => q.type === "text");
      const phoneQuestion = formConfig.questions.find(q => q.type === "tel");
      const emailQuestion = formConfig.questions.find(q => q.type === "email");

      const name = (nameQuestion ? formAnswers[nameQuestion.id] : formAnswers.name) as string;
      const phone = (phoneQuestion ? formAnswers[phoneQuestion.id] : formAnswers.phone) as string;
      const email = (emailQuestion ? formAnswers[emailQuestion.id] : formAnswers.email) as string;

      if (!name || !name.trim()) {
        throw new Error("Name is required");
      }
      if (!phone || !phone.trim()) {
        throw new Error("Phone number is required");
      }
      if (!email || !email.trim()) {
        throw new Error("Email is required");
      }

      // Build submit data dynamically from form answers
      const submitData: { [key: string]: string | string[] | Record<string, string[]> | undefined } = {
        name: name.trim(),
        phone: normalizePhone(phone.trim()),
        email: email.trim(),
        shifts: shiftData,
      };

      // Map form question IDs to submission field names and filter undefined values
      formConfig.questions.forEach((question) => {
        // Skip already-handled fields
        if (question.type === "text" || question.type === "tel" || question.type === "email" || question.type === "shifts") {
          return;
        }

        const answer = formAnswers[question.id];
        
        // Skip empty answers
        if (!answer || (Array.isArray(answer) && answer.length === 0)) {
          return;
        }

        // Map by question label patterns
        if (question.label.toLowerCase().includes("preference")) {
          // This is the experiences/preferences question
          submitData.experiences = Array.isArray(answer) ? answer : [answer];
        } else if (question.label.toLowerCase().includes("skill")) {
          // Special skills - store as array or first value
          submitData.specialSkill = Array.isArray(answer) ? answer[0] : answer;
        } else if (question.label.toLowerCase().includes("age")) {
          submitData.ageRange = Array.isArray(answer) ? answer : [answer];
        } else if (question.label.toLowerCase().includes("jamat")) {
          submitData.jamatKhane = Array.isArray(answer) ? answer : [answer];
        } else {
          // For any other fields, store them as-is if they're not undefined
          if (answer !== undefined && answer !== null) {
            submitData[question.id] = answer;
          }
        }
      });

      // Ensure experiences array is always present
      if (!submitData.experiences) {
        submitData.experiences = [];
      }

      if (existingVolunteerId) {
        await updateVolunteer(existingVolunteerId, submitData as Parameters<typeof updateVolunteer>[1]);
        toast.success("Updated!", {
          description: "Your availability has been updated successfully.",
        });
      } else {
        await submitVolunteerForm(submitData as Parameters<typeof submitVolunteerForm>[0]);
        toast.success("Thank you!", {
          description: "Your volunteer information has been submitted successfully.",
        });
      }
      setCurrentQuestionIndex(formConfig.questions.length + 1);
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

  const checkExistingVolunteer = async (phone: string) => {
    const emailQuestion = formConfig.questions.find(q => q.type === "email");
    const email = emailQuestion ? (formAnswers[emailQuestion.id] as string) : "";

    if ((!phone || phone.length < 10) && (!email || !email.includes("@"))) return;

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
        
        const updatedAnswers: Record<string, string | string[]> = { ...formAnswers };
        const existingData = existing as unknown as Record<string, unknown>;
        
        // Simple mapping - iterate through all questions and map by type and label
        formConfig.questions.forEach((question) => {
          if (question.type === "text") {
            updatedAnswers[question.id] = existing.name;
          } else if (question.type === "tel") {
            updatedAnswers[question.id] = formatPhone(existing.phone);
          } else if (question.type === "email") {
            updatedAnswers[question.id] = existing.email;
          } else if (question.label.toLowerCase().includes("preference")) {
            updatedAnswers[question.id] = existing.experiences || [];
          } else if (question.label.toLowerCase().includes("jamat")) {
            // Load Jamat Khane from any stored field
            const jamatValue = existingData.jamatKhane || existingData[question.id];
            if (jamatValue) {
              updatedAnswers[question.id] = Array.isArray(jamatValue) ? jamatValue : [jamatValue];
            }
          } else if (question.label.toLowerCase().includes("skill")) {
            const skillValue = existingData.specialSkill || existingData.skills || existingData[question.id];
            if (skillValue) {
              updatedAnswers[question.id] = Array.isArray(skillValue) ? skillValue : [skillValue];
            }
          } else if (question.label.toLowerCase().includes("age")) {
            const ageValue = existingData.ageRange || existingData[question.id];
            if (ageValue) {
              updatedAnswers[question.id] = Array.isArray(ageValue) ? ageValue : [ageValue];
            }
          }
        });

        setFormAnswers(updatedAnswers);
        setShiftData(existing.shifts || {});
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
    }
  };

  const handleAnswerChange = (value: string | string[]) => {
    if (!currentQuestion) return;
    
    let finalValue = value;
    
    // Only format phone if NOT currently autofilling
    if (currentQuestion.type === "tel" && typeof value === "string" && !isAutoFilling) {
      finalValue = formatPhone(value);
    }
    
    setFormAnswers({
      ...formAnswers,
      [currentQuestion.id]: finalValue,
    });

    if (currentQuestion.type === "tel" && typeof finalValue === "string") {
      const normalized = normalizePhone(finalValue);
      if (normalized.length >= 10) {
        checkExistingVolunteer(finalValue);
      }
    }
  };

  const isShiftDisabled = (shift: string): boolean => {
    const day = formConfig.days[currentDayIndex];
    const dayShifts = shiftData[day] || [];
    const isSelected = dayShifts.includes(shift);
    
    // If already selected, allow toggling off
    if (isSelected) return false;
    
    const dayIndex = currentDayIndex;
    const shiftIndex = formConfig.shifts.indexOf(shift);
    
    // Check for 2 consecutive shifts already selected
    const twoShiftsBack = shiftIndex >= 2 ? formConfig.shifts[shiftIndex - 2] : null;
    const oneShiftBack = shiftIndex > 0 ? formConfig.shifts[shiftIndex - 1] : null;
    const oneShiftForward = shiftIndex < formConfig.shifts.length - 1 ? formConfig.shifts[shiftIndex + 1] : null;
    const twoShiftsForward = shiftIndex <= formConfig.shifts.length - 3 ? formConfig.shifts[shiftIndex + 2] : null;
    
    // Block if 2 consecutive shifts before would be taken
    if (twoShiftsBack && oneShiftBack && dayShifts.includes(twoShiftsBack) && dayShifts.includes(oneShiftBack)) {
      return true;
    }
    
    // Block if 2 consecutive shifts after would be taken
    if (oneShiftForward && twoShiftsForward && dayShifts.includes(oneShiftForward) && dayShifts.includes(twoShiftsForward)) {
      return true;
    }
    
    // Check for consecutive shifts across day boundaries
    if (shiftIndex === 0 && dayIndex > 0) {
      const prevDay = formConfig.days[dayIndex - 1];
      const lastShift = formConfig.shifts[formConfig.shifts.length - 1];
      const secondLastShift = formConfig.shifts[formConfig.shifts.length - 2];
      if (shiftData[prevDay]?.includes(lastShift) && shiftData[prevDay]?.includes(secondLastShift)) {
        return true;
      }
    }
    
    if (shiftIndex === 1 && dayIndex > 0) {
      const prevDay = formConfig.days[dayIndex - 1];
      const lastShift = formConfig.shifts[formConfig.shifts.length - 1];
      const firstShift = formConfig.shifts[0];
      if (shiftData[prevDay]?.includes(lastShift) && dayShifts.includes(firstShift)) {
        return true;
      }
    }
    
    if (shiftIndex === formConfig.shifts.length - 1 && dayIndex < formConfig.days.length - 1) {
      const nextDay = formConfig.days[dayIndex + 1];
      const firstShift = formConfig.shifts[0];
      const secondShift = formConfig.shifts[1];
      if (shiftData[nextDay]?.includes(firstShift) && shiftData[nextDay]?.includes(secondShift)) {
        return true;
      }
    }
    
    if (shiftIndex === formConfig.shifts.length - 2 && dayIndex < formConfig.days.length - 1) {
      const nextDay = formConfig.days[dayIndex + 1];
      const lastShift = formConfig.shifts[formConfig.shifts.length - 1];
      const firstShift = formConfig.shifts[0];
      if (dayShifts.includes(lastShift) && shiftData[nextDay]?.includes(firstShift)) {
        return true;
      }
    }
    
    return false;
  };

  const handleShiftToggle = (shift: string) => {
    const day = formConfig.days[currentDayIndex];
    const dayShifts = shiftData[day] || [];

    if (dayShifts.includes(shift)) {
      setShiftData({
        ...shiftData,
        [day]: dayShifts.filter((s) => s !== shift),
      });
    } else {
      if (isShiftDisabled(shift)) {
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

  return (
    <div className="min-h-screen gradient-bg flex flex-col relative overflow-hidden">
      {/* Progress bar */}
      <motion.div
        className="fixed top-0 left-0 h-1 bg-primary z-50"
        initial={{ width: "0%" }}
        animate={{
          width: `${(getCurrentStep() / totalQuestions) * 100}%`,
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Logo/Title */}
      {currentQuestionIndex < formConfig.questions.length && (
        <div className="fixed top-6 left-6 z-40">
          <h2 className="text-xl font-bold text-primary">Mulakat Site Setup Sign-in</h2>
        </div>
      )}

      {/* Question counter */}
      {currentQuestionIndex < formConfig.questions.length && (
        <div className="fixed top-20 right-6 text-sm text-muted-foreground z-40">
          {currentQuestionIndex + 1} / {totalQuestions - 1}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-8 py-20 pb-32 relative z-10">
        <div className="w-full max-w-3xl">
          <AnimatePresence mode="wait">
            {/* Regular questions */}
            {!isShiftsQuestion && currentQuestionIndex < formConfig.questions.length && currentQuestion && (
              <motion.div
                key={`q${currentQuestionIndex}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div className="space-y-6">
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight">
                    {currentQuestion.label}
                    {currentQuestion.required && <span className="text-destructive inline-block ml-1">*</span>}
                  </h1>
                </div>

                {showExistingMessage && currentQuestion.type === "tel" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-chart-1/10 text-chart-1 rounded-lg text-base"
                  >
                    ✓ We found your information! You can continue to update your availability.
                  </motion.div>
                )}

                {/* Text, Tel, Email inputs */}
                {["text", "tel", "email"].includes(currentQuestion.type) && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleNext();
                    }}
                  >
                    {/* Hidden fields to help browser autofill detect all fields */}
                    {currentQuestion.type !== "text" && (
                      <input 
                        type="text" 
                        name="name" 
                        autoComplete="name" 
                        tabIndex={-1}
                        style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}
                        onChange={(e) => {
                          const nameQuestion = formConfig.questions.find(q => q.type === "text");
                          if (nameQuestion && e.target.value) {
                            setFormAnswers(prev => ({ ...prev, [nameQuestion.id]: e.target.value }));
                          }
                        }}
                      />
                    )}
                    {currentQuestion.type !== "tel" && (
                      <input 
                        type="tel" 
                        name="tel" 
                        autoComplete="tel-national" 
                        tabIndex={-1}
                        style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}
                        onChange={(e) => {
                          const phoneQuestion = formConfig.questions.find(q => q.type === "tel");
                          if (phoneQuestion && e.target.value) {
                            setIsAutoFilling(true);
                            setFormAnswers(prev => ({ ...prev, [phoneQuestion.id]: e.target.value }));
                            setTimeout(() => setIsAutoFilling(false), 500);
                          }
                        }}
                      />
                    )}
                    {currentQuestion.type !== "email" && (
                      <input 
                        type="email" 
                        name="email" 
                        autoComplete="email" 
                        tabIndex={-1}
                        style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}
                        onChange={(e) => {
                          const emailQuestion = formConfig.questions.find(q => q.type === "email");
                          if (emailQuestion && e.target.value) {
                            setFormAnswers(prev => ({ ...prev, [emailQuestion.id]: e.target.value }));
                          }
                        }}
                      />
                    )}
                    <Input
                      ref={inputRef}
                      type={currentQuestion.type === "tel" ? "tel" : currentQuestion.type === "email" ? "email" : "text"}
                      name={currentQuestion.type === "email" ? "email" : currentQuestion.type === "tel" ? "tel" : "name"}
                      id={currentQuestion.id}
                      value={currentQuestion.type === "tel" ? (isAutoFilling ? (formAnswers[currentQuestion.id] as string) || "" : formatPhone((formAnswers[currentQuestion.id] as string) || "")) : (formAnswers[currentQuestion.id] as string) || ""}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      onInput={(e) => {
                        // Detect autofill on input
                        const input = e.target as HTMLInputElement;
                        if (input.matches(':-webkit-autofill') || input.matches(':autofill')) {
                          setIsAutoFilling(true);
                        }
                      }}
                      onBlur={(e) => {
                        // Format phone number when field loses focus (for autofill completion)
                        if (currentQuestion.type === "tel" && e.target.value) {
                          setIsAutoFilling(false);
                          const cleaned = normalizePhone(e.target.value);
                          const formatted = formatPhone(cleaned);
                          setFormAnswers({
                            ...formAnswers,
                            [currentQuestion.id]: formatted,
                          });
                        }
                      }}
                      placeholder={currentQuestion.placeholder || "Type your answer here..."}
                      autoComplete={
                        currentQuestion.type === "email" 
                          ? "email" 
                          : currentQuestion.type === "tel" 
                          ? "tel-national" 
                          : currentQuestion.label.toLowerCase().includes("full") || currentQuestion.label.toLowerCase().includes("name")
                          ? "name"
                          : "off"
                      }
                      className="text-2xl h-14 px-4 rounded-lg border-2 border-muted-foreground/10 focus-visible:border-primary focus-visible:ring-0 transition-colors bg-background/50"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && validateCurrentAnswer()) {
                          handleNext();
                        }
                      }}
                    />
                  </form>
                )}

                {/* Select */}
                {currentQuestion.type === "select" && currentQuestion.options && (
                  <div className="space-y-4">
                    {(() => {
                      const options = currentQuestion.options;
                      
                      // Sort options alphabetically, but move "none of the above" to bottom
                      let sortedOptions = [...options].sort((a, b) => a.label.localeCompare(b.label));
                      const noneOption = sortedOptions.find(opt => 
                        opt.id.toLowerCase().includes("none") || 
                        opt.label.toLowerCase().includes("none of the above")
                      );
                      if (noneOption) {
                        sortedOptions = sortedOptions.filter(opt => opt.id !== noneOption.id);
                        sortedOptions.push(noneOption);
                      }
                      
                      // Use large buttons if ≤5 options
                      const useButtons = sortedOptions.length <= 5;
                      
                      return useButtons ? (
                        // Large buttons (for ≤5 options)
                        <div className="space-y-4">
                          {sortedOptions.map((opt) => (
                            <motion.div
                              key={opt.id}
                              whileHover={{ scale: 1.02 }}
                              className={`flex items-center space-x-4 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                                (formAnswers[currentQuestion.id] as string) === opt.id
                                  ? "border-primary bg-accent"
                                  : "border-border bg-background/50 hover:border-primary hover:bg-accent"
                              }`}
                              onClick={() => handleAnswerChange(opt.id)}
                            >
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                (formAnswers[currentQuestion.id] as string) === opt.id
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground"
                              }`}>
                                {(formAnswers[currentQuestion.id] as string) === opt.id && (
                                  <div className="w-3 h-3 rounded-full bg-primary-foreground" />
                                )}
                              </div>
                              <span className="text-xl font-medium">{opt.label}</span>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        // Dropdown for >5 options
                        <Select value={(formAnswers[currentQuestion.id] as string) || ""} onValueChange={handleAnswerChange}>
                          <SelectTrigger size="lg" className="border-2">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            {sortedOptions.map((opt) => (
                              <SelectItem key={opt.id} value={opt.id}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    })()}
                  </div>
                )}

                {/* Checkbox Multi */}
                {currentQuestion.type === "checkbox-multi" && (
                  <div className="space-y-4">
                    {(currentQuestion.optionsFrom === "experiences" || currentQuestion.options)
                      ? (() => {
                          const options = currentQuestion.options 
                            ? currentQuestion.options 
                            : formConfig.experiences;
                          
                          // Sort options alphabetically, but move "none of the above" to bottom
                          let sortedOptions = [...options].sort((a, b) => a.label.localeCompare(b.label));
                          const noneOption = sortedOptions.find(opt => 
                            opt.id.toLowerCase().includes("none") || 
                            opt.label.toLowerCase().includes("none of the above")
                          );
                          if (noneOption) {
                            sortedOptions = sortedOptions.filter(opt => opt.id !== noneOption.id);
                            sortedOptions.push(noneOption);
                          }
                          
                          return sortedOptions.map((opt) => (
                            <motion.div
                              key={opt.id}
                              whileHover={{ scale: 1.02 }}
                              className={`flex items-center space-x-4 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                                (formAnswers[currentQuestion.id] as string[])?.includes(opt.id)
                                  ? "border-primary bg-accent"
                                  : "border-border bg-background/50 hover:border-primary hover:bg-accent"
                              }`}
                              onClick={() => {
                                const current = (formAnswers[currentQuestion.id] as string[]) || [];
                                if (current.includes(opt.id)) {
                                  handleAnswerChange(current.filter((e) => e !== opt.id));
                                } else {
                                  handleAnswerChange([...current, opt.id]);
                                }
                              }}
                            >
                              <Checkbox
                                checked={(formAnswers[currentQuestion.id] as string[])?.includes(opt.id) || false}
                                className="w-6 h-6 border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary pointer-events-none"
                              />
                              <span className="text-xl font-medium">{opt.label}</span>
                            </motion.div>
                          ));
                        })()
                      : null}
                  </div>
                )}
              </motion.div>
            )}

            {/* Shifts question */}
            {isShiftsQuestion && (
              <motion.div
                key={`shifts-${currentDayIndex}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground">
                    {formConfig.days[currentDayIndex]}, {formConfig.dayDates[currentDayIndex]}
                  </h1>
                  <p className="text-lg text-muted-foreground">Select all shifts you&apos;re available (or skip if unavailable)</p>
                </div>
                <div className="space-y-4">
                  {formConfig.shifts.map((shift) => {
                    const disabled = isShiftDisabled(shift);
                    return (
                      <motion.div
                        key={shift}
                        whileHover={disabled ? {} : { scale: 1.02 }}
                        className={`flex items-center space-x-4 p-5 rounded-xl border-2 transition-all ${
                          disabled
                            ? "border-muted bg-muted/30 cursor-not-allowed opacity-50"
                            : "border-border bg-background/50 hover:border-primary hover:bg-accent cursor-pointer"
                        } ${
                          shiftData[formConfig.days[currentDayIndex]]?.includes(shift)
                            ? "border-primary bg-accent opacity-100"
                            : ""
                        }`}
                        onClick={() => !disabled && handleShiftToggle(shift)}
                      >
                        <Checkbox
                          checked={shiftData[formConfig.days[currentDayIndex]]?.includes(shift) || false}
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

            {/* Review screen */}
            {currentQuestionIndex === formConfig.questions.length && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground">Almost done! 🎉</h1>
                  <p className="text-lg text-muted-foreground">Review your information</p>
                </div>
                <div className="space-y-6 text-lg">
                  {formConfig.questions.map((q) => {
                    const answer = formAnswers[q.id];
                    if (!answer || (Array.isArray(answer) && answer.length === 0)) return null;

                    let displayValue: string | string[] = answer;
                    
                    // Get the options to use for mapping
                    const options = q.options || (q.optionsFrom === "experiences" ? formConfig.experiences : null);
                    
                    if (options && Array.isArray(answer)) {
                      // Map array of IDs to labels
                      displayValue = options
                        .filter((opt) => answer.includes(opt.id))
                        .map((opt) => opt.label)
                        .join(", ");
                    } else if (options && typeof answer === "string") {
                      // Map single ID to label
                      const selected = options.find((opt) => opt.id === answer);
                      displayValue = selected?.label || answer;
                    }

                    return (
                      <div key={q.id} className="space-y-2">
                        <p className="text-muted-foreground text-sm capitalize">{q.label}</p>
                        <p className="text-xl">{displayValue}</p>
                      </div>
                    );
                  })}

                  {Object.keys(shiftData).some((day) => shiftData[day].length > 0) && (
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-sm">Availability</p>
                      {formConfig.days.map((day) => {
                        if (!shiftData[day] || shiftData[day].length === 0) return null;
                        return (
                          <p key={day}>
                            <span className="font-medium">{day}:</span> {shiftData[day].join(", ")}
                          </p>
                        );
                      })}
                    </div>
                  )}
                </div>
                {error && <div className="p-4 bg-destructive/10 text-destructive rounded-lg">{error}</div>}
              </motion.div>
            )}

            {/* Success screen */}
            {currentQuestionIndex > formConfig.questions.length && (
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
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground">Thank you! 🙏</h1>
                  <p className="text-xl text-muted-foreground">Your volunteer information has been submitted successfully.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation buttons */}
      {currentQuestionIndex <= formConfig.questions.length && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 p-6 flex justify-between items-center bg-linear-to-t from-background/80 to-transparent backdrop-blur-sm z-50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {currentQuestionIndex > 0 ? (
            <Button onClick={handleBack} variant="ghost" size="lg" className="text-base">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {currentQuestionIndex < formConfig.questions.length ? (
            <Button
              onClick={() => {
                handleNext();
              }}
              disabled={currentQuestion?.required && !validateCurrentAnswer()}
              size="lg"
              className="bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground text-base px-8 shadow-lg"
            >
              OK <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !formAnswers[formConfig.questions.find(q => q.type === "text")?.id || ""] || !formAnswers[formConfig.questions.find(q => q.type === "tel")?.id || ""] || !formAnswers[formConfig.questions.find(q => q.type === "email")?.id || ""]}
              size="lg"
              className="bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground text-base px-8 shadow-lg"
            >
              {isLoading ? "Submitting..." : "Submit"}
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}
