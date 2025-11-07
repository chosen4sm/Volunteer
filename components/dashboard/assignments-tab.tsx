"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Users, UserPlus, AlertTriangle, Copy, MapPin, Clock, Check, ChevronDown, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  createAssignment,
  deleteAssignment,
  updateAssignment,
  type Volunteer,
  type Location,
  type Task,
  type Assignment,
} from "@/lib/db";
import { getFormConfig, DEFAULT_FORM_CONFIG, type FormConfig } from "@/lib/config";
import { TimePicker } from "@/components/ui/time-picker";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { formatTime } from "@/lib/utils";
import { useBatchEmailSender } from "@/lib/use-batch-email-sender";
import { EmailProgressDialog } from "@/components/ui/email-progress-dialog";

interface AssignmentsTabProps {
  volunteers: Volunteer[];
  locations: Location[];
  tasks: Task[];
  assignments: Assignment[];
  onDataChange: () => void;
  isReadOnly?: boolean;
}

export function AssignmentsTab({
  volunteers,
  locations,
  tasks,
  assignments,
  onDataChange,
  isReadOnly = false,
}: AssignmentsTabProps) {
  const [formConfig, setFormConfig] = useState<FormConfig>(DEFAULT_FORM_CONFIG);
  const [filterDay, setFilterDay] = useState<string[]>([]);
  const [filterShift, setFilterShift] = useState<string[]>([]);
  const [filterCount, setFilterCount] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterExperience, setFilterExperience] = useState<string[]>([]);
  const [filterAgeRange, setFilterAgeRange] = useState<string[]>([]);
  const [filterJamatKhane, setFilterJamatKhane] = useState<string[]>([]);
  const [filterSkill, setFilterSkill] = useState<string[]>([]);
  const [filterRole, setFilterRole] = useState<string[]>([]);
  const [filterAssignmentStatus, setFilterAssignmentStatus] = useState<string>("");
  const [filterUnassignedDay, setFilterUnassignedDay] = useState<string>("");
  const [filterAssignmentCount, setFilterAssignmentCount] = useState<string>("");
  const [filterAssignmentOperator, setFilterAssignmentOperator] = useState<string>("equal");

  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [editAssignmentDialogOpen, setEditAssignmentDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [assignVolunteerId, setAssignVolunteerId] = useState("");
  const [assignLocationId, setAssignLocationId] = useState("");
  const [assignTaskId, setAssignTaskId] = useState("");
  const [assignTaskIds, setAssignTaskIds] = useState<string[]>([]);
  const [assignShift, setAssignShift] = useState("");
  const [assignDay, setAssignDay] = useState("");
  const [assignStartTime, setAssignStartTime] = useState("");
  const [assignEndTime, setAssignEndTime] = useState("");
  const [assignDescription, setAssignDescription] = useState("");
  const [sendEmailNotifications, setSendEmailNotifications] = useState(true);
  const [sendWhatsAppMessage, setSendWhatsAppMessage] = useState(true);
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);
  const [emailProgressOpen, setEmailProgressOpen] = useState(false);
  const [pendingWhatsAppData, setPendingWhatsAppData] = useState<{
    volunteers: string[];
    taskIds: string[];
    locationId: string;
    day: string;
    shift: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  
  const { isSending, progress, currentBatch, totalBatches, sendEmails, reset: resetEmailProgress } = useBatchEmailSender();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await getFormConfig();
        setFormConfig(config);
      } catch (error) {
        console.error("Error fetching form config:", error);
      }
    };
    fetchConfig();
  }, []);

  const DAYS = formConfig.days;
  const SHIFTS = formConfig.shifts;

  const getTotalShifts = (volunteer: Volunteer) => {
    const shiftData = volunteer.shifts || {};
    return Object.values(shiftData).reduce((acc, shifts) => acc + shifts.length, 0);
  };

  const filteredVolunteers = (() => {
    let filtered = volunteers.filter((volunteer) => {
      const matchesSearch = searchQuery
        ? `${volunteer.name} ${volunteer.email} ${volunteer.phone}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        : true;

      const shiftData = volunteer.shifts || {};
      
      const matchesDay = filterDay.length > 0 
        ? filterDay.some(day => {
            const dayShifts = shiftData[day] || [];
            return dayShifts.length > 0;
          })
        : true;
        
      const matchesShift = filterShift.length > 0
        ? filterShift.some(shift => {
            return Object.values(shiftData).some(dayShifts => dayShifts.includes(shift));
          })
        : true;
        
      const matchesExperience = filterExperience.length > 0
        ? filterExperience.some(exp => (volunteer.experiences || []).includes(exp))
        : true;
        
      const matchesAgeRange = filterAgeRange.length > 0
        ? filterAgeRange.some(age => (volunteer.ageRange || []).includes(age))
        : true;
        
      const matchesJamatKhane = filterJamatKhane.length > 0
        ? filterJamatKhane.some(jk => (volunteer.jamatKhane || []).includes(jk))
        : true;
        
      const matchesSkill = filterSkill.length > 0
        ? filterSkill.includes(volunteer.specialSkill || "")
        : true;
        
      const matchesRole = filterRole.length > 0
        ? filterRole.includes(volunteer.role || "")
        : true;
      
      // Assignment status filter
      const volunteerAssignments = assignments.filter(a => a.volunteerId === volunteer.id);
      let matchesAssignmentStatus = true;
      
      if (filterAssignmentStatus === "no-assignments") {
        matchesAssignmentStatus = volunteerAssignments.length === 0;
      } else if (filterAssignmentStatus === "has-assignments") {
        matchesAssignmentStatus = volunteerAssignments.length > 0;
      }
      
      // Unassigned on specific day filter
      let matchesUnassignedDay = true;
      if (filterUnassignedDay) {
        const dayAssignments = volunteerAssignments.filter(a => a.day === filterUnassignedDay);
        matchesUnassignedDay = dayAssignments.length === 0;
      }
      
      // Assignment count filter
      let matchesAssignmentCount = true;
      if (filterAssignmentCount) {
        const targetCount = parseInt(filterAssignmentCount);
        const actualCount = volunteerAssignments.length;
        
        switch (filterAssignmentOperator) {
          case "equal":
            matchesAssignmentCount = actualCount === targetCount;
            break;
          case "less":
            matchesAssignmentCount = actualCount < targetCount;
            break;
          case "lessOrEqual":
            matchesAssignmentCount = actualCount <= targetCount;
            break;
          case "greater":
            matchesAssignmentCount = actualCount > targetCount;
            break;
          case "greaterOrEqual":
            matchesAssignmentCount = actualCount >= targetCount;
            break;
        }
      }

      return matchesSearch && matchesDay && matchesShift && matchesExperience && matchesAgeRange && matchesJamatKhane && matchesSkill && matchesRole && matchesAssignmentStatus && matchesUnassignedDay && matchesAssignmentCount;
    });

    const count = parseInt(filterCount);
    if (count && count > 0) {
      filtered = filtered.slice(0, count);
    }

    return filtered;
  })();

  const displayVolunteers = filteredVolunteers;

  const handleCreateAssignment = async () => {
    if (!assignVolunteerId) {
      toast.error("Missing volunteer", {
        description: "Please select a volunteer to assign",
      });
      return;
    }
    if (!assignTaskId) {
      toast.error("Missing task", {
        description: "Please select a task to assign",
      });
      return;
    }
    try {
      const assignmentData: Partial<Assignment> = {
        volunteerId: assignVolunteerId,
        taskId: assignTaskId,
        shift: assignShift || undefined,
        day: assignDay || undefined,
        startTime: assignStartTime || undefined,
        endTime: assignEndTime || undefined,
        description: assignDescription || undefined,
      };
      if (assignLocationId) {
        assignmentData.locationId = assignLocationId;
      }
      await createAssignment(assignmentData as Omit<Assignment, "id" | "createdAt">);
      toast.success("Volunteer assigned to task");

      const volunteer = volunteers.find((v) => v.id === assignVolunteerId);
      const task = tasks.find((t) => t.id === assignTaskId);
      
      if (volunteer?.email && volunteer?.uniqueCode && task) {
        const allVolunteerAssignments = [];
        
        const existingAssignments = assignments.filter(a => a.volunteerId === assignVolunteerId);
        for (const existingAssignment of existingAssignments) {
          const existingTask = tasks.find((t) => t.id === existingAssignment.taskId);
          if (!existingTask) continue;
          const existingLocation = existingAssignment.locationId
            ? locations.find((l) => l.id === existingAssignment.locationId)
            : existingTask.locationId
            ? locations.find((l) => l.id === existingTask.locationId)
            : undefined;
          
          allVolunteerAssignments.push({
            taskName: existingTask.name,
            locationName: existingLocation?.name,
            day: existingAssignment.day,
            shift: existingAssignment.shift,
            startTime: existingAssignment.startTime,
            endTime: existingAssignment.endTime,
            description: existingAssignment.description,
          });
        }

        const location = assignLocationId
          ? locations.find((l) => l.id === assignLocationId)
          : task.locationId
          ? locations.find((l) => l.id === task.locationId)
          : undefined;

        allVolunteerAssignments.push({
          taskName: task.name,
          locationName: location?.name,
          day: assignDay || undefined,
          shift: assignShift || undefined,
          startTime: assignStartTime || undefined,
          endTime: assignEndTime || undefined,
          description: assignDescription || undefined,
        });

        setEmailProgressOpen(true);
        try {
          const result = await sendEmails([{
            to: volunteer.email,
            volunteerName: volunteer.name,
            assignments: allVolunteerAssignments,
            uniqueCode: volunteer.uniqueCode,
          }]);

          if (result.sent > 0) {
            toast.success("Email notification sent");
          } else {
            toast.error("Failed to send email notification");
          }
        } catch (emailError) {
          console.error("Error sending email:", emailError);
          toast.error("Failed to send email notification");
        }
      }

      setAssignmentDialogOpen(false);
      setAssignVolunteerId("");
      setAssignLocationId("");
      setAssignTaskId("");
      setAssignShift("");
      setAssignDay("");
      setAssignStartTime("");
      setAssignEndTime("");
      setAssignDescription("");
      onDataChange();
    } catch (error) {
      console.error("Error creating assignment:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error("Failed to create assignment", {
        description: errorMessage,
      });
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDeleteAssignment = async (id: string) => {
    if (!confirm("Are you sure you want to remove this assignment?")) return;
    try {
      await deleteAssignment(id);
      toast.success("Assignment removed");
      onDataChange();
    } catch (error) {
      console.error("Error deleting assignment:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error("Failed to remove assignment", {
        description: errorMessage,
      });
    }
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setAssignLocationId(assignment.locationId || "");
    setAssignTaskId(assignment.taskId);
    setAssignShift(assignment.shift || "");
    setAssignDay(assignment.day || "");
    setAssignStartTime(assignment.startTime || "");
    setAssignEndTime(assignment.endTime || "");
    setAssignDescription(assignment.description || "");
    setEditAssignmentDialogOpen(true);
  };

  const handleUpdateAssignment = async () => {
    if (!editingAssignment) return;
    if (!assignTaskId) {
      toast.error("Missing task", {
        description: "Please select a task",
      });
      return;
    }
    try {
      const updateData: Partial<Assignment> = {
        taskId: assignTaskId,
        shift: assignShift || undefined,
        day: assignDay || undefined,
        startTime: assignStartTime || undefined,
        endTime: assignEndTime || undefined,
        description: assignDescription || undefined,
      };
      if (assignLocationId) {
        updateData.locationId = assignLocationId;
      } else {
        updateData.locationId = undefined;
      }
      
      await updateAssignment(editingAssignment.id, updateData);
      toast.success("Assignment updated successfully");
      
      setEditAssignmentDialogOpen(false);
      setEditingAssignment(null);
      setAssignLocationId("");
      setAssignTaskId("");
      setAssignShift("");
      setAssignDay("");
      setAssignStartTime("");
      setAssignEndTime("");
      setAssignDescription("");
      onDataChange();
    } catch (error) {
      console.error("Error updating assignment:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error("Failed to update assignment", {
        description: errorMessage,
      });
    }
  };

  const handleBulkAssignment = async () => {
    if (selectedVolunteers.length === 0) {
      toast.error("No volunteers selected", {
        description: "Please select at least one volunteer to assign",
      });
      return;
    }
    if (assignTaskIds.length === 0) {
      toast.error("No tasks selected", {
        description: "Please select at least one task to assign",
      });
      return;
    }
    try {
      const promises = [];
      for (const volunteerId of selectedVolunteers) {
        for (const taskId of assignTaskIds) {
          const assignmentData: Partial<Assignment> = {
            volunteerId,
            taskId,
            shift: assignShift || undefined,
            day: assignDay || undefined,
            startTime: assignStartTime || undefined,
            endTime: assignEndTime || undefined,
            description: assignDescription || undefined,
            status: "pending",
          };
          if (assignLocationId) {
            assignmentData.locationId = assignLocationId;
          }
          promises.push(createAssignment(assignmentData as Omit<Assignment, "id" | "createdAt">));
        }
      }
      await Promise.all(promises);
      const totalAssignments = selectedVolunteers.length * assignTaskIds.length;
      toast.success(`Created ${totalAssignments} assignment(s)`, {
        description: `${selectedVolunteers.length} volunteer(s) × ${assignTaskIds.length} task(s)`,
      });

      if (sendEmailNotifications) {
        const emailAssignments = [];
        for (const volunteerId of selectedVolunteers) {
          const volunteer = volunteers.find((v) => v.id === volunteerId);
          if (!volunteer || !volunteer.email || !volunteer.uniqueCode) continue;

          const allVolunteerAssignments = [];
          
          const existingAssignments = assignments.filter(a => a.volunteerId === volunteerId);
          for (const existingAssignment of existingAssignments) {
            const task = tasks.find((t) => t.id === existingAssignment.taskId);
            if (!task) continue;
            const location = existingAssignment.locationId
              ? locations.find((l) => l.id === existingAssignment.locationId)
              : task.locationId
              ? locations.find((l) => l.id === task.locationId)
              : undefined;
            
            allVolunteerAssignments.push({
              taskName: task.name,
              locationName: location?.name,
              day: existingAssignment.day,
              shift: existingAssignment.shift,
              startTime: existingAssignment.startTime,
              endTime: existingAssignment.endTime,
              description: existingAssignment.description,
            });
          }

          for (const taskId of assignTaskIds) {
            const task = tasks.find((t) => t.id === taskId);
            if (!task) continue;

            const location = assignLocationId
              ? locations.find((l) => l.id === assignLocationId)
              : task.locationId
              ? locations.find((l) => l.id === task.locationId)
              : undefined;

            allVolunteerAssignments.push({
              taskName: task.name,
              locationName: location?.name,
              day: assignDay || undefined,
              shift: assignShift || undefined,
              startTime: assignStartTime || undefined,
              endTime: assignEndTime || undefined,
              description: assignDescription || undefined,
            });
          }

          emailAssignments.push({
            to: volunteer.email,
            volunteerName: volunteer.name,
            assignments: allVolunteerAssignments,
            uniqueCode: volunteer.uniqueCode,
          });
        }

        if (emailAssignments.length > 0) {
          if (sendWhatsAppMessage) {
            setPendingWhatsAppData({
              volunteers: [...selectedVolunteers],
              taskIds: [...assignTaskIds],
              locationId: assignLocationId,
              day: assignDay,
              shift: assignShift,
              startTime: assignStartTime,
              endTime: assignEndTime,
            });
          }
          
          setEmailProgressOpen(true);
          try {
            const result = await sendEmails(emailAssignments);
            
            if (result.sent > 0) {
              toast.success(`Sent ${result.sent} email notification(s)`, {
                description: result.failed > 0 ? `${result.failed} failed to send` : undefined,
              });
            } else {
              toast.error("Failed to send email notifications", {
                description: `All ${result.failed} emails failed to send`,
              });
            }
          } catch (emailError) {
            console.error("Error sending emails:", emailError);
            const errorMessage = emailError instanceof Error ? emailError.message : "Network error";
            toast.error("Failed to send email notifications", {
              description: errorMessage,
            });
          }
        }
      }

      setSelectedVolunteers([]);
      setAssignLocationId("");
      setAssignTaskIds([]);
      setAssignShift("");
      setAssignDay("");
      setAssignStartTime("");
      setAssignEndTime("");
      setAssignDescription("");
      onDataChange();
    } catch (error) {
      console.error("Error creating bulk assignments:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error("Failed to create assignments", {
        description: errorMessage,
      });
    }
  };

  const handleGenerateWhatsApp = () => {
    if (!pendingWhatsAppData) return;
    
    const taskNames = pendingWhatsAppData.taskIds
      .map((taskId) => {
        const task = tasks.find((t) => t.id === taskId);
        return task?.name;
      })
      .filter(Boolean)
      .join(", ");

    const location = pendingWhatsAppData.locationId
      ? locations.find((l) => l.id === pendingWhatsAppData.locationId)
      : undefined;

    const scheduleText = (() => {
      if (pendingWhatsAppData.startTime || pendingWhatsAppData.endTime) {
        const timeStr = [pendingWhatsAppData.startTime, pendingWhatsAppData.endTime]
          .filter(Boolean)
          .map(t => formatTime(t))
          .join(" - ");
        if (pendingWhatsAppData.day) {
          return `${pendingWhatsAppData.day} ${timeStr}`;
        }
        return timeStr;
      }
      if (pendingWhatsAppData.day && pendingWhatsAppData.shift) {
        return `${pendingWhatsAppData.day} - ${pendingWhatsAppData.shift}`;
      }
      return pendingWhatsAppData.day || pendingWhatsAppData.shift || "TBD";
    })();

    const volunteersList = pendingWhatsAppData.volunteers
      .map((id) => {
        const volunteer = volunteers.find((v) => v.id === id);
        return volunteer ? `${volunteer.name} - ${volunteer.phone}` : null;
      })
      .filter(Boolean)
      .join("\n");

    let message = `You have been assigned to a duty @ ${location?.name || ""}\n\n`;
    message += `*${taskNames}*\n`;
    message += `${scheduleText}\n\n`;
    message += `${volunteersList}\n\n`;
    message += `Check your email for details.`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

    window.open(whatsappUrl, "_blank");
    toast.success("Opening WhatsApp", {
      description: `Prepared message for ${pendingWhatsAppData.volunteers.length} volunteer(s)`,
    });
    
    setPendingWhatsAppData(null);
  };

  const toggleVolunteerSelection = (volunteerId: string) => {
    setSelectedVolunteers((prev) =>
      prev.includes(volunteerId) ? prev.filter((id) => id !== volunteerId) : [...prev, volunteerId]
    );
  };

  const selectAllFilteredVolunteers = () => {
    setSelectedVolunteers(filteredVolunteers.map((v) => v.id));
  };

  useEffect(() => {
    if (filterDay.length === 1) {
      setAssignDay(filterDay[0]);
    }
    if (filterShift.length === 1) {
      setAssignShift(filterShift[0]);
    }
  }, [filterDay, filterShift]);

  useEffect(() => {
    if (assignLocationId && !assignDescription) {
      const selectedLocation = locations.find(l => l.id === assignLocationId);
      if (selectedLocation?.description) {
        setAssignDescription(selectedLocation.description);
      }
    }
  }, [assignLocationId, locations, assignDescription]);

  const clearVolunteerSelection = () => {
    setSelectedVolunteers([]);
  };

  const replaceVolunteerWithAlternative = (currentVolunteerId: string, currentVolunteerName: string) => {
    const alternativeVolunteers = volunteers.filter((v) => {
      if (v.id === currentVolunteerId) return false;
      if (selectedVolunteers.includes(v.id)) return false;
      
      const matchesSearch = searchQuery
        ? `${v.name} ${v.email} ${v.phone}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        : true;
      if (!matchesSearch) return false;
      
      const shiftData = v.shifts || {};
      
      const matchesDay = filterDay.length > 0 
        ? filterDay.some(day => {
            const dayShifts = shiftData[day] || [];
            return dayShifts.length > 0;
          })
        : true;
        
      const matchesShift = filterShift.length > 0
        ? filterShift.some(shift => {
            return Object.values(shiftData).some(dayShifts => dayShifts.includes(shift));
          })
        : true;
        
      const matchesExperience = filterExperience.length > 0
        ? filterExperience.some(exp => (v.experiences || []).includes(exp))
        : true;
        
      const matchesAgeRange = filterAgeRange.length > 0
        ? filterAgeRange.some(age => (v.ageRange || []).includes(age))
        : true;
        
      const matchesJamatKhane = filterJamatKhane.length > 0
        ? filterJamatKhane.some(jk => (v.jamatKhane || []).includes(jk))
        : true;
        
      const matchesSkill = filterSkill.length > 0
        ? filterSkill.includes(v.specialSkill || "")
        : true;
        
      const matchesRole = filterRole.length > 0
        ? filterRole.includes(v.role || "")
        : true;
      
      // Assignment status filter
      const volunteerAssignments = assignments.filter(a => a.volunteerId === v.id);
      let matchesAssignmentStatus = true;
      
      if (filterAssignmentStatus === "no-assignments") {
        matchesAssignmentStatus = volunteerAssignments.length === 0;
      } else if (filterAssignmentStatus === "has-assignments") {
        matchesAssignmentStatus = volunteerAssignments.length > 0;
      }
      
      // Unassigned on specific day filter
      let matchesUnassignedDay = true;
      if (filterUnassignedDay) {
        const dayAssignments = volunteerAssignments.filter(a => a.day === filterUnassignedDay);
        matchesUnassignedDay = dayAssignments.length === 0;
      }
      
      // Assignment count filter
      let matchesAssignmentCount = true;
      if (filterAssignmentCount) {
        const targetCount = parseInt(filterAssignmentCount);
        const actualCount = volunteerAssignments.length;
        
        switch (filterAssignmentOperator) {
          case "equal":
            matchesAssignmentCount = actualCount === targetCount;
            break;
          case "less":
            matchesAssignmentCount = actualCount < targetCount;
            break;
          case "lessOrEqual":
            matchesAssignmentCount = actualCount <= targetCount;
            break;
          case "greater":
            matchesAssignmentCount = actualCount > targetCount;
            break;
          case "greaterOrEqual":
            matchesAssignmentCount = actualCount >= targetCount;
            break;
        }
      }
      
      if (!matchesDay || !matchesShift || !matchesExperience || !matchesAgeRange || !matchesJamatKhane || !matchesSkill || !matchesRole || !matchesAssignmentStatus || !matchesUnassignedDay || !matchesAssignmentCount) return false;
      
      // Check consecutive shifts only if we have a single day and shift selected
      if (filterDay.length === 1 && filterShift.length === 1) {
        const hasConflict = hasConsecutiveShifts(v, filterDay[0], filterShift[0]);
        if (hasConflict) return false;
      }
      
      return true;
    });

    if (alternativeVolunteers.length > 0) {
      const replacement = alternativeVolunteers[0];
      setSelectedVolunteers((prev) => [
        ...prev.filter((id) => id !== currentVolunteerId),
        replacement.id,
      ]);
      toast.success("Volunteer replaced", {
        description: `${currentVolunteerName} → ${replacement.name}`,
      });
    } else {
      setSelectedVolunteers((prev) => prev.filter((id) => id !== currentVolunteerId));
      toast.warning("No replacement found", {
        description: `No alternatives without consecutive shifts found. Removed ${currentVolunteerName} from selection.`,
      });
    }
  };

  const hasConsecutiveShifts = (volunteer: Volunteer, currentDay?: string, currentShift?: string) => {
    if (!currentDay || !currentShift) return null;

    const dayIndex = DAYS.indexOf(currentDay);
    const shiftIndex = SHIFTS.indexOf(currentShift);
    const volunteerAssignments = assignments.filter((a) => a.volunteerId === volunteer.id);
    
    const consecutiveShifts: string[] = [];

    if (shiftIndex > 0) {
      const prevShift = SHIFTS[shiftIndex - 1];
      const sameDayPrevAssignment = volunteerAssignments.find(
        (a) => a.day === currentDay && a.shift === prevShift
      );
      if (sameDayPrevAssignment) {
        consecutiveShifts.push(`${currentDay} ${prevShift} → ${currentDay} ${currentShift}`);
      }
    }

    if (shiftIndex < SHIFTS.length - 1) {
      const nextShift = SHIFTS[shiftIndex + 1];
      const sameDayNextAssignment = volunteerAssignments.find(
        (a) => a.day === currentDay && a.shift === nextShift
      );
      if (sameDayNextAssignment) {
        consecutiveShifts.push(`${currentDay} ${currentShift} → ${currentDay} ${nextShift}`);
      }
    }

    if (shiftIndex === 0 && dayIndex > 0) {
      const prevDay = DAYS[dayIndex - 1];
      const lastShift = SHIFTS[SHIFTS.length - 1];
      const prevDayLastAssignment = volunteerAssignments.find(
        (a) => a.day === prevDay && a.shift === lastShift
      );
      if (prevDayLastAssignment) {
        consecutiveShifts.push(`${prevDay} ${lastShift} → ${currentDay} ${currentShift}`);
      }
    }

    if (shiftIndex === SHIFTS.length - 1 && dayIndex < DAYS.length - 1) {
      const nextDay = DAYS[dayIndex + 1];
      const firstShift = SHIFTS[0];
      const nextDayFirstAssignment = volunteerAssignments.find(
        (a) => a.day === nextDay && a.shift === firstShift
      );
      if (nextDayFirstAssignment) {
        consecutiveShifts.push(`${currentDay} ${currentShift} → ${nextDay} ${firstShift}`);
      }
    }

    return consecutiveShifts.length > 0 ? consecutiveShifts : null;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const sendToWhatsApp = (volunteer: Volunteer, task: Task, location: Location | undefined, assignment: Assignment) => {
    const getScheduleText = () => {
      if (assignment.startTime || assignment.endTime) {
        const timeStr = [assignment.startTime, assignment.endTime]
          .filter(Boolean)
          .map(t => formatTime(t))
          .join(" - ");
        if (assignment.day) {
          return `${assignment.day} ${timeStr}`;
        }
        return timeStr;
      }
      if (assignment.day && assignment.shift) {
        return `${assignment.day} - ${assignment.shift}`;
      }
      return assignment.day || assignment.shift || "No schedule specified";
    };

    const scheduleText = getScheduleText();

    let message = `You have been assigned to a duty @ ${location?.name || ""}\n\n`;
    message += `*${task.name}*\n`;
    message += `${scheduleText}\n\n`;
    message += `${volunteer.name} - ${volunteer.phone}\n\n`;
    message += `Check your email for details.`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    window.open(whatsappUrl, "_blank");
    toast.success("Opening WhatsApp", {
      description: "Message is ready to send",
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const copyVolunteerLink = (volunteer: Volunteer) => {
    if (!volunteer.uniqueCode) {
      toast.error("No unique code found", {
        description: "This volunteer doesn't have a unique code yet",
      });
      return;
    }
    const link = `${window.location.origin}/volunteer/${volunteer.uniqueCode}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied!", {
      description: `Copied link for ${volunteer.name}`,
    });
  };

  const copyAllSelectedLinks = () => {
    const links = selectedVolunteers
      .map((id) => {
        const volunteer = volunteers.find((v) => v.id === id);
        if (volunteer?.uniqueCode) {
          return `${volunteer.name}: ${window.location.origin}/volunteer/${volunteer.uniqueCode}`;
        }
        return null;
      })
      .filter(Boolean)
      .join('\n');

    if (!links) {
      toast.error("No links to copy", {
        description: "Selected volunteers don't have unique codes",
      });
      return;
    }

    navigator.clipboard.writeText(links);
    toast.success("All links copied!", {
      description: `Copied ${selectedVolunteers.length} volunteer link(s)`,
    });
  };

  return (
    <>
      <EmailProgressDialog
        open={emailProgressOpen}
        onClose={() => {
          setEmailProgressOpen(false);
          resetEmailProgress();
          setPendingWhatsAppData(null);
        }}
        total={progress.total}
        sent={progress.sent}
        failed={progress.failed}
        isComplete={!isSending && emailProgressOpen}
        currentBatch={currentBatch}
        totalBatches={totalBatches}
        showWhatsAppOption={!!pendingWhatsAppData}
        onGenerateWhatsApp={handleGenerateWhatsApp}
      />
      
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4 bg-muted/30 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Filter & Select Volunteers</CardTitle>
                <CardDescription>Find and filter volunteers to assign tasks</CardDescription>
              </div>
            </div>
            {(searchQuery || filterDay.length > 0 || filterShift.length > 0 || filterCount || filterExperience.length > 0 || filterAgeRange.length > 0 || filterJamatKhane.length > 0 || filterSkill.length > 0 || filterRole.length > 0 || filterAssignmentStatus || filterUnassignedDay || filterAssignmentCount) && (
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setFilterDay([]);
                  setFilterShift([]);
                  setFilterCount("");
                  setFilterExperience([]);
                  setFilterAgeRange([]);
                  setFilterJamatKhane([]);
                  setFilterSkill([]);
                  setFilterRole([]);
                  setFilterAssignmentStatus("");
                  setFilterUnassignedDay("");
                  setFilterAssignmentCount("");
                  setFilterAssignmentOperator("equal");
                }}
                variant="outline"
                size="sm"
              >
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <Input
            placeholder="🔍 Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
          
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground px-1">Availability</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between bg-background">
                    <span className="truncate">
                      {filterDay.length > 0 ? `${filterDay.length} day(s)` : "📅 Day"}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2">
                  <div className="space-y-1">
                    {DAYS.map((day) => (
                      <div
                        key={day}
                        className="flex items-center space-x-2 hover:bg-accent rounded-sm p-2 cursor-pointer"
                        onClick={() => {
                          setFilterDay(prev => 
                            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                          );
                        }}
                      >
                        <Checkbox checked={filterDay.includes(day)} />
                        <label className="flex-1 cursor-pointer text-sm">{day}</label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between bg-background">
                    <span className="truncate">
                      {filterShift.length > 0 ? `${filterShift.length} shift(s)` : "⏰ Shift"}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2">
                  <div className="space-y-1">
                    {SHIFTS.map((shift) => (
                      <div
                        key={shift}
                        className="flex items-center space-x-2 hover:bg-accent rounded-sm p-2 cursor-pointer"
                        onClick={() => {
                          setFilterShift(prev => 
                            prev.includes(shift) ? prev.filter(s => s !== shift) : [...prev, shift]
                          );
                        }}
                      >
                        <Checkbox checked={filterShift.includes(shift)} />
                        <label className="flex-1 cursor-pointer text-sm">{shift}</label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              
              <Input
                type="number"
                min="1"
                placeholder="# Limit results"
                value={filterCount}
                onChange={(e) => setFilterCount(e.target.value)}
                className="bg-background w-full"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground px-1">Demographics & Skills</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between bg-background">
                    <span className="truncate">
                      {filterExperience.length > 0 ? `${filterExperience.length} exp` : "Experience"}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2">
                  <div className="space-y-1">
                    {formConfig.experiences.map((exp) => (
                      <div
                        key={exp.id}
                        className="flex items-center space-x-2 hover:bg-accent rounded-sm p-2 cursor-pointer"
                        onClick={() => {
                          setFilterExperience(prev => 
                            prev.includes(exp.id) ? prev.filter(e => e !== exp.id) : [...prev, exp.id]
                          );
                        }}
                      >
                        <Checkbox checked={filterExperience.includes(exp.id)} />
                        <label className="flex-1 cursor-pointer text-sm">{exp.label}</label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between bg-background">
                    <span className="truncate">
                      {filterAgeRange.length > 0 ? `${filterAgeRange.length} age(s)` : "Age Range"}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2">
                  <div className="space-y-1">
                    {(() => {
                      const ageQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("age"));
                      return ageQuestion?.options?.map((opt) => (
                        <div
                          key={opt.id}
                          className="flex items-center space-x-2 hover:bg-accent rounded-sm p-2 cursor-pointer"
                          onClick={() => {
                            setFilterAgeRange(prev => 
                              prev.includes(opt.id) ? prev.filter(a => a !== opt.id) : [...prev, opt.id]
                            );
                          }}
                        >
                          <Checkbox checked={filterAgeRange.includes(opt.id)} />
                          <label className="flex-1 cursor-pointer text-sm">{opt.label}</label>
                        </div>
                      ));
                    })()}
                  </div>
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between bg-background">
                    <span className="truncate">
                      {filterJamatKhane.length > 0 ? `${filterJamatKhane.length} JK(s)` : "Jamat Khane"}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2">
                  <div className="space-y-1">
                    {(() => {
                      const jamatQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("jamat"));
                      return jamatQuestion?.options?.map((opt) => (
                        <div
                          key={opt.id}
                          className="flex items-center space-x-2 hover:bg-accent rounded-sm p-2 cursor-pointer"
                          onClick={() => {
                            setFilterJamatKhane(prev => 
                              prev.includes(opt.id) ? prev.filter(j => j !== opt.id) : [...prev, opt.id]
                            );
                          }}
                        >
                          <Checkbox checked={filterJamatKhane.includes(opt.id)} />
                          <label className="flex-1 cursor-pointer text-sm">{opt.label}</label>
                        </div>
                      ));
                    })()}
                  </div>
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between bg-background">
                    <span className="truncate">
                      {filterSkill.length > 0 ? `${filterSkill.length} skill(s)` : "Special Skill"}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2">
                  <div className="space-y-1">
                    {(() => {
                      const skillQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("skill"));
                      return skillQuestion?.options?.map((opt) => (
                        <div
                          key={opt.id}
                          className="flex items-center space-x-2 hover:bg-accent rounded-sm p-2 cursor-pointer"
                          onClick={() => {
                            setFilterSkill(prev => 
                              prev.includes(opt.id) ? prev.filter(s => s !== opt.id) : [...prev, opt.id]
                            );
                          }}
                        >
                          <Checkbox checked={filterSkill.includes(opt.id)} />
                          <label className="flex-1 cursor-pointer text-sm">{opt.label}</label>
                        </div>
                      ));
                    })()}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground px-1">Role</div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-48 justify-between bg-background">
                  <span className="truncate">
                    {filterRole.length > 0 ? `${filterRole.length} role(s)` : "Filter by role"}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2">
                <div className="space-y-1">
                  {[
                    { value: "volunteer", label: "Volunteer" },
                    { value: "team-lead", label: "Team Lead" },
                    { value: "lead", label: "Core Team" }
                  ].map((role) => (
                    <div
                      key={role.value}
                      className="flex items-center space-x-2 hover:bg-accent rounded-sm p-2 cursor-pointer"
                      onClick={() => {
                        setFilterRole(prev => 
                          prev.includes(role.value) ? prev.filter(r => r !== role.value) : [...prev, role.value]
                        );
                      }}
                    >
                      <Checkbox checked={filterRole.includes(role.value)} />
                      <label className="flex-1 cursor-pointer text-sm">{role.label}</label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground px-1">Assignment Status</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Select value={filterAssignmentStatus || undefined} onValueChange={(val) => setFilterAssignmentStatus(val || "")}>
                <SelectTrigger className="bg-background w-full">
                  <SelectValue placeholder="All volunteers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-assignments">No assignments</SelectItem>
                  <SelectItem value="has-assignments">Has assignments</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterUnassignedDay || undefined} onValueChange={(val) => setFilterUnassignedDay(val || "")}>
                <SelectTrigger className="bg-background w-full">
                  <SelectValue placeholder="Unassigned on day..." />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day) => (
                    <SelectItem key={day} value={day}>Not assigned on {day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <Select value={filterAssignmentOperator} onValueChange={(val) => setFilterAssignmentOperator(val)}>
                <SelectTrigger className="bg-background w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equal">=</SelectItem>
                  <SelectItem value="less">&lt;</SelectItem>
                  <SelectItem value="lessOrEqual">≤</SelectItem>
                  <SelectItem value="greater">&gt;</SelectItem>
                  <SelectItem value="greaterOrEqual">≥</SelectItem>
                </SelectContent>
              </Select>
              
              <Input
                type="number"
                min="0"
                placeholder="# of assignments"
                value={filterAssignmentCount}
                onChange={(e) => setFilterAssignmentCount(e.target.value)}
                className="bg-background w-full col-span-2"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedVolunteers.length > 0
                ? `${selectedVolunteers.length} selected • ${filteredVolunteers.length} available`
                : filteredVolunteers.length !== volunteers.length
                ? `Showing ${filteredVolunteers.length} of ${volunteers.length}`
                : `${volunteers.length} total`}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={selectAllFilteredVolunteers}>
                Select All Filtered
              </Button>
            </div>
          </div>
          {filteredVolunteers.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-muted-foreground">No volunteers found</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {displayVolunteers.map((volunteer) => {
                const isSelected = selectedVolunteers.includes(volunteer.id);
                const shiftData = volunteer.shifts || {};
                const totalShifts = getTotalShifts(volunteer);
                const consecutiveShifts = filterDay.length === 1 && filterShift.length === 1 
                  ? hasConsecutiveShifts(volunteer, filterDay[0], filterShift[0])
                  : null;

                return (
                  <div
                    key={volunteer.id}
                    onClick={() => toggleVolunteerSelection(volunteer.id)}
                    className={`rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20" 
                        : "hover:border-primary/50 hover:shadow-sm"
                    }`}
                  >
                    <div className="p-3 flex gap-3">
                      <div className="flex items-center shrink-0 mt-0.5">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          isSelected 
                            ? "border-primary bg-primary" 
                            : "border-muted-foreground/30"
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold">{volunteer.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              <div className="truncate">{volunteer.email}</div>
                              <div>{volunteer.phone}</div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 items-end shrink-0">
                            {volunteer.role === "lead" && (
                              <Badge variant="default" className="h-5 text-xs">Core Team</Badge>
                            )}
                            {volunteer.role === "team-lead" && (
                              <Badge variant="secondary" className="h-5 text-xs">Team Lead</Badge>
                            )}
                            <Badge variant="secondary" className="h-5 text-xs">
                              {totalShifts} {totalShifts === 1 ? "shift" : "shifts"}
                            </Badge>
                            {(() => {
                              const volunteerAssignments = assignments.filter(a => a.volunteerId === volunteer.id);
                              if (volunteerAssignments.length > 0) {
                                const uniqueShifts = new Set(
                                  volunteerAssignments.map(a => {
                                    if (a.startTime || a.endTime) {
                                      const timeStr = [a.startTime, a.endTime].filter(Boolean).join("-");
                                      return `${a.day || "no-day"}_${timeStr}`;
                                    }
                                    return `${a.day || "no-day"}_${a.shift || "no-shift"}`;
                                  })
                                );
                                const shiftCount = uniqueShifts.size;
                                return (
                                  <Badge variant="default" className="h-5 text-xs">
                                    {shiftCount} assigned
                                  </Badge>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>

                        <div className="flex gap-1.5 flex-wrap mt-2">
                          {volunteer.ageRange?.map((ageId) => {
                            const ageQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("age"));
                            const ageLabel = ageQuestion?.options?.find(opt => opt.id === ageId)?.label || ageId;
                            return <Badge key={ageId} variant="secondary" className="text-xs h-5">👤 {ageLabel}</Badge>;
                          })}
                          {volunteer.experiences?.map((exp) => {
                            const expLabel = formConfig.experiences.find(e => e.id === exp)?.label;
                            return expLabel ? <Badge key={exp} variant="outline" className="text-xs h-5">⭐ {expLabel}</Badge> : null;
                          })}
                          {(() => {
                            if (!volunteer.specialSkill) return null;
                            const skillQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("skill"));
                            const skillLabel = skillQuestion?.options?.find(opt => opt.id === volunteer.specialSkill)?.label;
                            return skillLabel ? <Badge variant="default" className="text-xs h-5">🛠️ {skillLabel}</Badge> : null;
                          })()}
                          {(() => {
                            const jamatKhaneLabels = (volunteer.jamatKhane || []).map(jkId => {
                              const jamatQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("jamat"));
                              return jamatQuestion?.options?.find(opt => opt.id === jkId)?.label || jkId;
                            });
                            return jamatKhaneLabels.length > 0 ? <Badge variant="outline" className="text-xs h-5">🕌 {jamatKhaneLabels[0]}</Badge> : null;
                          })()}
                        </div>

                        {consecutiveShifts && (
                          <div className="mt-2 p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-yellow-700 mb-0.5">
                                  Consecutive Shifts Warning
                                </div>
                                {consecutiveShifts.map((shift, idx) => (
                                  <div key={idx} className="text-xs text-yellow-600/90">{shift}</div>
                                ))}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs mt-1.5 border-yellow-500/40 hover:bg-yellow-500/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    replaceVolunteerWithAlternative(volunteer.id, volunteer.name);
                                  }}
                                >
                                  Find Replacement
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {(() => {
                          const volunteerAssignments = assignments.filter(a => a.volunteerId === volunteer.id);
                          if (volunteerAssignments.length > 0) {
                            return (
                              <div className="mt-2.5 pt-2.5 border-t space-y-1">
                                <div className="text-xs font-medium text-muted-foreground mb-1.5">Current Assignments</div>
                                {volunteerAssignments.map((assignment) => {
                                  const task = tasks.find(t => t.id === assignment.taskId);
                                  const location = locations.find(l => l.id === (assignment.locationId || task?.locationId));
                                  const scheduleText = (() => {
                                    if (assignment.startTime || assignment.endTime) {
                                      const timeStr = [assignment.startTime, assignment.endTime]
                                        .filter(Boolean)
                                        .map(t => formatTime(t))
                                        .join(" - ");
                                      return assignment.day ? `${assignment.day} ${timeStr}` : timeStr;
                                    }
                                    if (assignment.day && assignment.shift) {
                                      return `${assignment.day} - ${assignment.shift}`;
                                    }
                                    return assignment.day || assignment.shift || "No schedule";
                                  })();
                                  return (
                                    <div key={assignment.id} className="flex items-start gap-1.5 text-xs group">
                                      <Clock className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium">{task?.name || "Unknown"}</div>
                                        <div className="text-muted-foreground">
                                          {scheduleText}
                                          {location && ` @ ${location.name}`}
                                        </div>
                                      </div>
                                      {!isReadOnly && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditAssignment(assignment);
                                          }}
                                        >
                                          <Pencil className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          }
                          
                          if (Object.keys(shiftData).length > 0) {
                            return (
                              <div className="mt-2.5 pt-2.5 border-t space-y-1">
                                <div className="text-xs font-medium text-muted-foreground mb-1.5">Availability</div>
                                {formConfig.days
                                  .filter((day) => shiftData[day]?.length > 0)
                                  .map((day) => (
                                    <div key={day} className="flex items-center gap-2 text-xs">
                                      <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                      <span className="font-medium text-muted-foreground min-w-[60px]">{day}</span>
                                      <span className="text-muted-foreground">{shiftData[day].join(", ")}</span>
                                    </div>
                                  ))}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedVolunteers.length > 0 && (
        <Card className="border-2 border-primary shadow-lg">
          <CardHeader className="pb-4 bg-primary/5 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Selected Volunteers ({selectedVolunteers.length})</CardTitle>
                  <CardDescription>Review selected volunteers and configure assignment</CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyAllSelectedLinks}>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy Links
                </Button>
                <Button size="sm" variant="outline" onClick={clearVolunteerSelection}>
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="max-h-[300px] overflow-y-auto space-y-2 mb-4 p-2 bg-muted/30 rounded-lg">
              {selectedVolunteers.map((volunteerId) => {
                const volunteer = volunteers.find((v) => v.id === volunteerId);
                if (!volunteer) return null;
                
                const totalShifts = getTotalShifts(volunteer);
                
                return (
                  <div
                    key={volunteer.id}
                    className="flex items-start gap-3 p-3 bg-background rounded-lg border border-primary/20"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold">{volunteer.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{volunteer.email}</div>
                        </div>
                        <div className="flex flex-col gap-1 items-end shrink-0">
                          {volunteer.role === "lead" && (
                            <Badge variant="default" className="h-5 text-xs">Core Team</Badge>
                          )}
                          {volunteer.role === "team-lead" && (
                            <Badge variant="secondary" className="h-5 text-xs">Team Lead</Badge>
                          )}
                          <Badge variant="secondary" className="h-5 text-xs">
                            {totalShifts} {totalShifts === 1 ? "shift" : "shifts"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-wrap mt-2">
                        {volunteer.ageRange?.slice(0, 1).map((ageId) => {
                          const ageQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("age"));
                          const ageLabel = ageQuestion?.options?.find(opt => opt.id === ageId)?.label || ageId;
                          return <Badge key={ageId} variant="secondary" className="text-xs h-5">👤 {ageLabel}</Badge>;
                        })}
                        {volunteer.experiences?.slice(0, 2).map((exp) => {
                          const expLabel = formConfig.experiences.find(e => e.id === exp)?.label;
                          return expLabel ? <Badge key={exp} variant="outline" className="text-xs h-5">⭐ {expLabel}</Badge> : null;
                        })}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVolunteerSelection(volunteer.id);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
            
            <div className="border-t pt-4"></div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Location (optional)</Label>
              <Select value={assignLocationId} onValueChange={(val) => setAssignLocationId(val || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Tasks *</Label>
                <Badge variant="secondary" className="text-xs">
                  {assignTaskIds.length} selected
                </Badge>
                </div>
              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {tasks
                  .filter((t) => !assignLocationId || !t.locationId || t.locationId === assignLocationId)
                  .map((task) => {
                    const location = locations.find(l => l.id === task.locationId);
                    const isChecked = assignTaskIds.includes(task.id);
                    return (
                      <div 
                        key={task.id} 
                        className={`flex items-start space-x-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer ${
                          isChecked ? "bg-primary/5" : ""
                        }`}
                        onClick={() => {
                          if (isChecked) {
                              setAssignTaskIds(assignTaskIds.filter(id => id !== task.id));
                          } else {
                            setAssignTaskIds([...assignTaskIds, task.id]);
                            }
                          }}
                      >
                        <Checkbox
                          id={`task-${task.id}`}
                          checked={isChecked}
                          className="pointer-events-none mt-0.5"
                        />
                        <label htmlFor={`task-${task.id}`} className="flex-1 cursor-pointer text-sm pointer-events-none">
                          <div className="font-medium">{task.name}</div>
                          {location && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {location.name}
                            </div>
                          )}
                        </label>
                      </div>
                    );
                  })}
              </div>
            </div>
            <div className="space-y-3">
              {selectedVolunteers.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg border text-sm">
                  <div className="font-medium text-muted-foreground mb-2">Availability:</div>
                  {selectedVolunteers.length === 1 ? (
                    <div className="text-xs text-muted-foreground">
                      {(() => {
                        const volunteer = volunteers.find(v => v.id === selectedVolunteers[0]);
                        const availableDays = DAYS.filter(day => {
                          const shifts = volunteer?.shifts?.[day] || [];
                          return shifts.length > 0;
                        });
                        return availableDays.length > 0 
                          ? availableDays.map(day => {
                              const shifts = volunteer?.shifts?.[day] || [];
                              return `${day} (${shifts.join(", ")})`;
                            }).join(" • ")
                          : "No availability data";
                      })()}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Only days/shifts where ALL selected volunteers are available will be shown
                    </div>
                  )}
                </div>
              )}
              <div>
                <Label className="text-sm font-medium mb-2 block">Schedule</Label>
                <div className="grid gap-2 grid-cols-2">
                  <Select value={assignDay || undefined} onValueChange={(val) => {
                    setAssignDay(val || "");
                    if (val) {
                      const selectedVols = volunteers.filter(v => selectedVolunteers.includes(v.id));
                      const isAvailable = selectedVols.every(v => {
                        const shifts = v.shifts?.[val] || [];
                        return shifts.length > 0;
                      });
                      if (!isAvailable) {
                        toast.warning("Availability Override", {
                          description: "You're assigning to a day when some volunteers marked themselves unavailable",
                        });
                      }
                      if (assignShift) {
                        const allHaveShift = selectedVols.every(v => {
                          const shifts = v.shifts?.[val] || [];
                          return shifts.includes(assignShift);
                        });
                        if (!allHaveShift) {
                          setAssignShift("");
                        }
                      }
                    }
                  }}>
                <SelectTrigger className={(() => {
                  if (!assignDay) return "";
                  const selectedVols = volunteers.filter(v => selectedVolunteers.includes(v.id));
                  const isAvailable = selectedVols.every(v => {
                    const shifts = v.shifts?.[assignDay] || [];
                    return shifts.length > 0;
                  });
                  return !isAvailable ? "border-amber-500 bg-amber-50/50" : "";
                })()}>
                  <div className="flex items-center gap-1.5 w-full">
                    {assignDay && (() => {
                      const selectedVols = volunteers.filter(v => selectedVolunteers.includes(v.id));
                      const unavailableVols = selectedVols.filter(v => {
                        const shifts = v.shifts?.[assignDay] || [];
                        return shifts.length === 0;
                      });
                      if (unavailableVols.length === 0) return null;
                      return (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <div className="font-semibold mb-1">Unavailable volunteers:</div>
                              {unavailableVols.map(v => (
                                <div key={v.id}>• {v.name}</div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })()}
                      <SelectValue placeholder="Day" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                      {DAYS.map((day) => {
                        const selectedVols = volunteers.filter(v => selectedVolunteers.includes(v.id));
                        const isAvailable = selectedVols.every(v => {
                          const shifts = v.shifts?.[day] || [];
                          return shifts.length > 0;
                        });
                        return (
                          <SelectItem key={day} value={day} className={!isAvailable ? "text-amber-600" : ""}>
                            <div className="flex items-center gap-1.5">
                              {!isAvailable && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                              {day} {!isAvailable && "(override)"}
                            </div>
                          </SelectItem>
                        );
                      })}
                </SelectContent>
              </Select>
                  <Select value={assignShift || undefined} onValueChange={(val) => {
                    setAssignShift(val || "");
                    if (val && assignDay) {
                      const selectedVols = volunteers.filter(v => selectedVolunteers.includes(v.id));
                      const isAvailable = selectedVols.every(v => {
                        const shifts = v.shifts?.[assignDay] || [];
                        return shifts.includes(val);
                      });
                      if (!isAvailable) {
                        toast.warning("Availability Override", {
                          description: "You're assigning to a shift when some volunteers marked themselves unavailable",
                        });
                      }
                    }
                  }} disabled={!assignDay}>
                <SelectTrigger className={(() => {
                  if (!assignShift || !assignDay) return "";
                  const selectedVols = volunteers.filter(v => selectedVolunteers.includes(v.id));
                  const isAvailable = selectedVols.every(v => {
                    const shifts = v.shifts?.[assignDay] || [];
                    return shifts.includes(assignShift);
                  });
                  return !isAvailable ? "border-amber-500 bg-amber-50/50" : "";
                })()}>
                  <div className="flex items-center gap-1.5 w-full">
                    {assignShift && assignDay && (() => {
                      const selectedVols = volunteers.filter(v => selectedVolunteers.includes(v.id));
                      const unavailableVols = selectedVols.filter(v => {
                        const shifts = v.shifts?.[assignDay] || [];
                        return !shifts.includes(assignShift);
                      });
                      if (unavailableVols.length === 0) return null;
                      return (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <div className="font-semibold mb-1">Unavailable volunteers:</div>
                              {unavailableVols.map(v => (
                                <div key={v.id}>• {v.name}</div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })()}
                      <SelectValue placeholder="Shift" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                      {SHIFTS.map((shift) => {
                        if (!assignDay) {
                          return <SelectItem key={shift} value={shift}>{shift}</SelectItem>;
                        }
                        const selectedVols = volunteers.filter(v => selectedVolunteers.includes(v.id));
                        const isAvailable = selectedVols.every(v => {
                          const shifts = v.shifts?.[assignDay] || [];
                          return shifts.includes(shift);
                        });
                        return (
                          <SelectItem key={shift} value={shift} className={!isAvailable ? "text-amber-600" : ""}>
                            <div className="flex items-center gap-1.5">
                              {!isAvailable && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                              {shift} {!isAvailable && "(override)"}
                            </div>
                          </SelectItem>
                        );
                      })}
                </SelectContent>
              </Select>
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Custom Time (optional)</Label>
                <div className="grid gap-2 grid-cols-2">
                  <TimePicker
                    value={assignStartTime}
                    onChange={setAssignStartTime}
                    placeholder="Start time"
                    className="w-full"
                  />
                  <TimePicker
                    value={assignEndTime}
                    onChange={setAssignEndTime}
                    placeholder="End time"
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            <Input
              value={assignDescription}
              onChange={(e) => setAssignDescription(e.target.value)}
              placeholder="Description (optional) - e.g., Special instructions or notes"
            />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="send-email-notifications"
                  checked={sendEmailNotifications}
                  onCheckedChange={(checked) => setSendEmailNotifications(!!checked)}
                />
                <Label htmlFor="send-email-notifications" className="text-sm font-normal cursor-pointer">
                  Send email notifications to volunteers
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="send-whatsapp-message"
                  checked={sendWhatsAppMessage}
                  onCheckedChange={(checked) => setSendWhatsAppMessage(!!checked)}
                />
                <Label htmlFor="send-whatsapp-message" className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
                  <WhatsAppIcon className="w-4 h-4 text-green-600" />
                  Generate WhatsApp message
                </Label>
              </div>
            </div>
            <Button onClick={handleBulkAssignment} className="w-full" disabled={isReadOnly || assignTaskIds.length === 0}>
              <UserPlus className="w-4 h-4 mr-2" />
              Assign {selectedVolunteers.length} Volunteer{selectedVolunteers.length !== 1 ? 's' : ''} to {assignTaskIds.length} Task{assignTaskIds.length !== 1 ? 's' : ''}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Assignments ({assignments.length})</CardTitle>
              <CardDescription>Volunteers grouped by task</CardDescription>
            </div>
            <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={isReadOnly || volunteers.length === 0 || tasks.length === 0}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Quick Assign
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Quick Assign Volunteer</DialogTitle>
                  <DialogDescription>Manually assign a single volunteer to a task</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="assign-volunteer">Volunteer</Label>
                    <Select value={assignVolunteerId || undefined} onValueChange={setAssignVolunteerId}>
                      <SelectTrigger id="assign-volunteer">
                        <SelectValue placeholder="Select volunteer" />
                      </SelectTrigger>
                      <SelectContent>
                        {volunteers.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assign-location">Location (optional)</Label>
                    <Select value={assignLocationId} onValueChange={(val) => setAssignLocationId(val || "")}>
                      <SelectTrigger id="assign-location">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assign-task">Task</Label>
                    <Select value={assignTaskId} onValueChange={setAssignTaskId}>
                      <SelectTrigger id="assign-task">
                        <SelectValue placeholder="Select task" />
                      </SelectTrigger>
                      <SelectContent>
                        {tasks
                          .filter((t) => !assignLocationId || !t.locationId || t.locationId === assignLocationId)
                          .map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name} {t.locationId ? `(${locations.find(l => l.id === t.locationId)?.name})` : '(No location)'}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    {assignVolunteerId && (
                      <div className="p-3 bg-muted/50 rounded-lg border text-sm">
                        <div className="font-medium text-muted-foreground mb-2">Volunteer Availability:</div>
                        <div className="text-xs text-muted-foreground">
                          {(() => {
                            const volunteer = volunteers.find(v => v.id === assignVolunteerId);
                            const availableDays = DAYS.filter(day => {
                              const shifts = volunteer?.shifts?.[day] || [];
                              return shifts.length > 0;
                            });
                            return availableDays.length > 0 
                              ? availableDays.map(day => {
                                  const shifts = volunteer?.shifts?.[day] || [];
                                  return `${day} (${shifts.join(", ")})`;
                                }).join(" • ")
                              : "No availability data";
                          })()}
                        </div>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Schedule</Label>
                      <div className="grid gap-2 grid-cols-2">
                        <Select value={assignDay || undefined} onValueChange={(val) => {
                          setAssignDay(val || "");
                          if (val && assignVolunteerId) {
                            const volunteer = volunteers.find(v => v.id === assignVolunteerId);
                            if (volunteer) {
                              const shifts = volunteer.shifts?.[val] || [];
                              if (shifts.length === 0) {
                                toast.warning("Availability Override", {
                                  description: "This volunteer marked themselves unavailable for this day",
                                });
                              }
                              if (assignShift && !shifts.includes(assignShift)) {
                                setAssignShift("");
                              }
                            }
                          }
                        }}>
                      <SelectTrigger id="assign-day" className={(() => {
                        if (!assignDay || !assignVolunteerId) return "";
                        const volunteer = volunteers.find(v => v.id === assignVolunteerId);
                        const shifts = volunteer?.shifts?.[assignDay] || [];
                        return shifts.length === 0 ? "border-amber-500 bg-amber-50/50" : "";
                      })()}>
                        <div className="flex items-center gap-1.5 w-full">
                          {assignDay && assignVolunteerId && (() => {
                            const volunteer = volunteers.find(v => v.id === assignVolunteerId);
                            const shifts = volunteer?.shifts?.[assignDay] || [];
                            if (shifts.length > 0) return null;
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs">
                                    <div className="font-semibold">{volunteer?.name} is unavailable on this day</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })()}
                            <SelectValue placeholder="Select day" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                            {DAYS.map((day) => {
                              if (!assignVolunteerId) {
                                return <SelectItem key={day} value={day}>{day}</SelectItem>;
                              }
                              const volunteer = volunteers.find(v => v.id === assignVolunteerId);
                              const shifts = volunteer?.shifts?.[day] || [];
                              const isAvailable = shifts.length > 0;
                              return (
                                <SelectItem key={day} value={day} className={!isAvailable ? "text-amber-600" : ""}>
                                  <div className="flex items-center gap-1.5">
                                    {!isAvailable && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                                    {day} {!isAvailable && "(override)"}
                                  </div>
                          </SelectItem>
                              );
                            })}
                      </SelectContent>
                    </Select>
                        <Select value={assignShift || undefined} onValueChange={(val) => {
                          setAssignShift(val || "");
                          if (val && assignDay && assignVolunteerId) {
                            const volunteer = volunteers.find(v => v.id === assignVolunteerId);
                            if (volunteer) {
                              const shifts = volunteer.shifts?.[assignDay] || [];
                              if (!shifts.includes(val)) {
                                toast.warning("Availability Override", {
                                  description: "This volunteer marked themselves unavailable for this shift",
                                });
                              }
                            }
                          }
                        }} disabled={!assignDay}>
                      <SelectTrigger id="assign-shift" className={(() => {
                        if (!assignShift || !assignDay || !assignVolunteerId) return "";
                        const volunteer = volunteers.find(v => v.id === assignVolunteerId);
                        const shifts = volunteer?.shifts?.[assignDay] || [];
                        return !shifts.includes(assignShift) ? "border-amber-500 bg-amber-50/50" : "";
                      })()}>
                        <div className="flex items-center gap-1.5 w-full">
                          {assignShift && assignDay && assignVolunteerId && (() => {
                            const volunteer = volunteers.find(v => v.id === assignVolunteerId);
                            const shifts = volunteer?.shifts?.[assignDay] || [];
                            if (shifts.includes(assignShift)) return null;
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs">
                                    <div className="font-semibold">{volunteer?.name} is unavailable for this shift</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })()}
                            <SelectValue placeholder="Select shift" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                            {SHIFTS.map((shift) => {
                              if (!assignVolunteerId || !assignDay) {
                                return <SelectItem key={shift} value={shift}>{shift}</SelectItem>;
                              }
                              const volunteer = volunteers.find(v => v.id === assignVolunteerId);
                              const shifts = volunteer?.shifts?.[assignDay] || [];
                              const isAvailable = shifts.includes(shift);
                              return (
                                <SelectItem key={shift} value={shift} className={!isAvailable ? "text-amber-600" : ""}>
                                  <div className="flex items-center gap-1.5">
                                    {!isAvailable && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                                    {shift} {!isAvailable && "(override)"}
                                  </div>
                          </SelectItem>
                              );
                            })}
                      </SelectContent>
                    </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">Custom Time (optional)</Label>
                      <div className="grid gap-2 grid-cols-2">
                        <TimePicker
                          value={assignStartTime}
                          onChange={setAssignStartTime}
                          placeholder="Start time"
                          className="w-full"
                        />
                        <TimePicker
                          value={assignEndTime}
                          onChange={setAssignEndTime}
                          placeholder="End time"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assign-description">Description (optional)</Label>
                    <Input
                      id="assign-description"
                      value={assignDescription}
                      onChange={(e) => setAssignDescription(e.target.value)}
                      placeholder="e.g., Special instructions or notes"
                    />
                  </div>
                  <Button onClick={handleCreateAssignment} className="w-full" disabled={isReadOnly}>
                    Create Assignment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={editAssignmentDialogOpen} onOpenChange={setEditAssignmentDialogOpen}>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Assignment</DialogTitle>
                  <DialogDescription>Update the assignment details</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Volunteer</Label>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="font-medium">
                        {editingAssignment && volunteers.find(v => v.id === editingAssignment.volunteerId)?.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {editingAssignment && volunteers.find(v => v.id === editingAssignment.volunteerId)?.email}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-location">Location (optional)</Label>
                    <Select value={assignLocationId || undefined} onValueChange={(val) => setAssignLocationId(val || "")}>
                      <SelectTrigger id="edit-location">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-task">Task *</Label>
                    <Select value={assignTaskId} onValueChange={setAssignTaskId}>
                      <SelectTrigger id="edit-task">
                        <SelectValue placeholder="Select task" />
                      </SelectTrigger>
                      <SelectContent>
                        {tasks
                          .filter((t) => !assignLocationId || !t.locationId || t.locationId === assignLocationId)
                          .map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name} {t.locationId ? `(${locations.find(l => l.id === t.locationId)?.name})` : '(No location)'}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Schedule</Label>
                      <div className="grid gap-2 grid-cols-2">
                        <Select value={assignDay || undefined} onValueChange={(val) => setAssignDay(val || "")}>
                          <SelectTrigger id="edit-day">
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                          <SelectContent>
                            {DAYS.map((day) => (
                              <SelectItem key={day} value={day}>{day}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Select value={assignShift || undefined} onValueChange={(val) => setAssignShift(val || "")} disabled={!assignDay}>
                          <SelectTrigger id="edit-shift">
                            <SelectValue placeholder="Select shift" />
                          </SelectTrigger>
                          <SelectContent>
                            {SHIFTS.map((shift) => (
                              <SelectItem key={shift} value={shift}>{shift}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">Custom Time (optional)</Label>
                      <div className="grid gap-2 grid-cols-2">
                        <TimePicker
                          value={assignStartTime}
                          onChange={setAssignStartTime}
                          placeholder="Start time"
                          className="w-full"
                        />
                        <TimePicker
                          value={assignEndTime}
                          onChange={setAssignEndTime}
                          placeholder="End time"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Description (optional)</Label>
                    <Input
                      id="edit-description"
                      value={assignDescription}
                      onChange={(e) => setAssignDescription(e.target.value)}
                      placeholder="e.g., Special instructions or notes"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleUpdateAssignment} 
                      className="flex-1" 
                      disabled={isReadOnly}
                    >
                      Update Assignment
                    </Button>
                    <Button 
                      onClick={() => {
                        setEditAssignmentDialogOpen(false);
                        setEditingAssignment(null);
                      }} 
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>
    </div>
    </>
  );
}

