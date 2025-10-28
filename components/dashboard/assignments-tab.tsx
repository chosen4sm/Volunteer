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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, UserPlus, Trash2, AlertTriangle, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  createAssignment,
  deleteAssignment,
  type Volunteer,
  type Location,
  type Task,
  type Assignment,
} from "@/lib/db";
import { getFormConfig, DEFAULT_FORM_CONFIG, type FormConfig } from "@/lib/config";

interface AssignmentsTabProps {
  volunteers: Volunteer[];
  locations: Location[];
  tasks: Task[];
  assignments: Assignment[];
  onDataChange: () => void;
}

export function AssignmentsTab({
  volunteers,
  locations,
  tasks,
  assignments,
  onDataChange,
}: AssignmentsTabProps) {
  const [formConfig, setFormConfig] = useState<FormConfig>(DEFAULT_FORM_CONFIG);
  const [filterDay, setFilterDay] = useState<string>("");
  const [filterShift, setFilterShift] = useState<string>("");
  const [filterCount, setFilterCount] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterExperience, setFilterExperience] = useState<string>("");

  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [assignVolunteerId, setAssignVolunteerId] = useState("");
  const [assignLocationId, setAssignLocationId] = useState("");
  const [assignTaskId, setAssignTaskId] = useState("");
  const [assignShift, setAssignShift] = useState("");
  const [assignDay, setAssignDay] = useState("");
  const [assignDescription, setAssignDescription] = useState("");
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);

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

      if (!filterDay && !filterShift && !filterExperience) return matchesSearch;

      const shiftData = volunteer.shifts || {};
      const dayShifts = shiftData[filterDay] || [];

      const matchesDay = filterDay ? dayShifts.length > 0 : true;
      const matchesShift = filterShift ? dayShifts.includes(filterShift) : true;
      const matchesExperience = filterExperience
        ? (volunteer.experiences || []).includes(filterExperience)
        : true;

      return matchesSearch && matchesDay && matchesShift && matchesExperience;
    });

    const count = parseInt(filterCount);
    if (count && count > 0) {
      filtered = filtered.slice(0, count);
    }

    return filtered;
  })();

  const displayVolunteers = (() => {
    const selectedVols = volunteers.filter((v) => selectedVolunteers.includes(v.id));
    const unselectedFiltered = filteredVolunteers.filter((v) => !selectedVolunteers.includes(v.id));
    return [...selectedVols, ...unselectedFiltered];
  })();

  const handleCreateAssignment = async () => {
    if (!assignVolunteerId || !assignTaskId) {
      toast.error("Please fill in volunteer and task");
      return;
    }
    try {
      const assignmentData: Partial<Assignment> = {
        volunteerId: assignVolunteerId,
        taskId: assignTaskId,
        shift: assignShift || undefined,
        day: assignDay || undefined,
        description: assignDescription || undefined,
      };
      if (assignLocationId) {
        assignmentData.locationId = assignLocationId;
      }
      await createAssignment(assignmentData as Omit<Assignment, "id" | "createdAt">);
      toast.success("Volunteer assigned to task");
      setAssignmentDialogOpen(false);
      setAssignVolunteerId("");
      setAssignLocationId("");
      setAssignTaskId("");
      setAssignShift("");
      setAssignDay("");
      setAssignDescription("");
      onDataChange();
    } catch (error) {
      console.error("Error creating assignment:", error);
      toast.error("Failed to create assignment");
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm("Are you sure you want to remove this assignment?")) return;
    try {
      await deleteAssignment(id);
      toast.success("Assignment removed");
      onDataChange();
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast.error("Failed to remove assignment");
    }
  };

  const handleBulkAssignment = async () => {
    if (selectedVolunteers.length === 0 || !assignTaskId) {
      toast.error("Please select volunteers and task");
      return;
    }
    try {
      const promises = selectedVolunteers.map((volunteerId) => {
        const assignmentData: Partial<Assignment> = {
          volunteerId,
          taskId: assignTaskId,
          shift: assignShift || undefined,
          day: assignDay || undefined,
          description: assignDescription || undefined,
        };
        if (assignLocationId) {
          assignmentData.locationId = assignLocationId;
        }
        return createAssignment(assignmentData as Omit<Assignment, "id" | "createdAt">);
      });
      await Promise.all(promises);
      toast.success(`${selectedVolunteers.length} volunteer(s) assigned to task`);
      setSelectedVolunteers([]);
      setAssignLocationId("");
      setAssignTaskId("");
      setAssignShift("");
      setAssignDay("");
      setAssignDescription("");
      onDataChange();
    } catch (error) {
      console.error("Error creating bulk assignments:", error);
      toast.error("Failed to create assignments");
    }
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
    if (filterDay) {
      setAssignDay(filterDay);
    }
    if (filterShift) {
      setAssignShift(filterShift);
    }
  }, [filterDay, filterShift]);

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
      
      if (filterDay || filterShift) {
        const shiftData = v.shifts || {};
        const dayShifts = shiftData[filterDay] || [];
        
        const matchesDay = filterDay ? dayShifts.length > 0 : true;
        const matchesShift = filterShift ? dayShifts.includes(filterShift) : true;
        
        if (!matchesDay || !matchesShift) return false;
      }
      
      const hasConflict = hasConsecutiveShifts(v, filterDay, filterShift);
      if (hasConflict) return false;
      
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

  const sendToWhatsApp = (volunteer: Volunteer, task: Task, location: Location | undefined, assignment: Assignment) => {
    const scheduleText = assignment.day && assignment.shift
      ? `${assignment.day} - ${assignment.shift}`
      : assignment.day
      ? assignment.day
      : assignment.shift
      ? assignment.shift
      : "No schedule specified";

    let message = `✅ Assignment Confirmation

👤 *${volunteer.name}*
📞 ${volunteer.phone}

🎯 Task: *${task.name}*`;

    if (location) {
      message += `\n📍 Location: *${location.name}*`;
    }

    message += `\n📅 Schedule: *${scheduleText}*`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    window.open(whatsappUrl, "_blank");
    toast.success("Opening WhatsApp", {
      description: "Message is ready to send to your group",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Filter & Select Volunteers</CardTitle>
              <CardDescription>Find volunteers to assign to tasks</CardDescription>
            </div>
            {(searchQuery || filterDay || filterShift || filterCount || filterExperience) && (
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setFilterDay("");
                  setFilterShift("");
                  setFilterCount("");
                  setFilterExperience("");
                }}
                variant="outline"
                size="sm"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="Search name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-2"
            />
            <Select value={filterDay || undefined} onValueChange={(val) => setFilterDay(val)}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((day) => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterShift || undefined} onValueChange={(val) => setFilterShift(val)}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Shift" />
              </SelectTrigger>
              <SelectContent>
                {SHIFTS.map((shift) => (
                  <SelectItem key={shift} value={shift}>{shift}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterExperience || undefined} onValueChange={(val) => setFilterExperience(val)}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Experience" />
              </SelectTrigger>
              <SelectContent>
                {formConfig.experiences.map((exp) => (
                  <SelectItem key={exp.id} value={exp.id}>{exp.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="1"
              placeholder="Limit"
              value={filterCount}
              onChange={(e) => setFilterCount(e.target.value)}
              className="w-24"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedVolunteers.length > 0
                ? `${selectedVolunteers.length} selected • ${filteredVolunteers.length} match filters`
                : filteredVolunteers.length !== volunteers.length
                ? `Showing ${filteredVolunteers.length} of ${volunteers.length}`
                : `${volunteers.length} total`}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={selectAllFilteredVolunteers}>
                Select All
              </Button>
              {selectedVolunteers.length > 0 && (
                <Button size="sm" variant="outline" onClick={clearVolunteerSelection}>
                  Clear ({selectedVolunteers.length})
                </Button>
              )}
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
                const consecutiveShifts = hasConsecutiveShifts(volunteer, filterDay, filterShift);

                return (
                  <div
                    key={volunteer.id}
                    onClick={() => toggleVolunteerSelection(volunteer.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition ${
                      isSelected ? "border-primary bg-primary/5" : "hover:border-primary/50"
                    }`}
                  >
                    <div className="flex gap-3">
                      <Checkbox checked={isSelected} className="pointer-events-none mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm">{volunteer.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{volunteer.email}</div>
                          </div>
                          <Badge variant="secondary" className="shrink-0">{totalShifts}</Badge>
                        </div>

                        {(volunteer.ageRange && volunteer.ageRange.length > 0) || (volunteer.experiences && volunteer.experiences.length > 0) ? (
                          <div className="flex gap-1 flex-wrap mt-2">
                            {volunteer.ageRange && volunteer.ageRange.length > 0 && volunteer.ageRange.map((ageId) => {
                              const ageQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("age"));
                              const ageLabel = ageQuestion?.options?.find(opt => opt.id === ageId)?.label || ageId;
                              return <Badge key={ageId} variant="secondary" className="text-xs">{ageLabel}</Badge>;
                            })}
                            {volunteer.experiences && volunteer.experiences.length > 0 && volunteer.experiences.map((exp) => {
                              const expLabel = formConfig.experiences.find(e => e.id === exp)?.label;
                              return expLabel ? <Badge key={exp} variant="outline" className="text-xs">{expLabel}</Badge> : null;
                            })}
                          </div>
                        ) : null}

                        {consecutiveShifts && (
                          <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-yellow-600">
                                  Consecutive Shifts
                                </div>
                                {consecutiveShifts.map((shift, idx) => (
                                  <div key={idx} className="text-xs text-yellow-600">{shift}</div>
                                ))}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs mt-1 border-yellow-500/30"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    replaceVolunteerWithAlternative(volunteer.id, volunteer.name);
                                  }}
                                >
                                  Replace
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {Object.keys(shiftData).length > 0 && (
                          <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                            {formConfig.days
                              .filter((day) => shiftData[day]?.length > 0)
                              .map((day) => (
                                <div key={day} className="p-1.5 rounded bg-muted">
                                  <span className="font-medium">{day}:</span> {shiftData[day].join(", ")}
                                </div>
                              ))}
                          </div>
                        )}
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
        <Card className="border-2 border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Assign {selectedVolunteers.length} Volunteer{selectedVolunteers.length !== 1 ? 's' : ''}</CardTitle>
            <CardDescription>Choose task and schedule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 grid-cols-2">
              <Select value={assignLocationId} onValueChange={(val) => setAssignLocationId(val || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={assignTaskId} onValueChange={setAssignTaskId}>
                <SelectTrigger>
                  <SelectValue placeholder="Task *" />
                </SelectTrigger>
                <SelectContent>
                  {tasks
                    .filter((t) => !assignLocationId || !t.locationId || t.locationId === assignLocationId)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.locationId ? `(${locations.find(l => l.id === t.locationId)?.name})` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 grid-cols-2">
              <Select value={assignDay || undefined} onValueChange={(val) => setAssignDay(val || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Day (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day) => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={assignShift || undefined} onValueChange={(val) => setAssignShift(val || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Shift (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {SHIFTS.map((shift) => (
                    <SelectItem key={shift} value={shift}>{shift}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              value={assignDescription}
              onChange={(e) => setAssignDescription(e.target.value)}
              placeholder="Description (optional) - e.g., Special instructions or notes"
            />
            <Button onClick={handleBulkAssignment} className="w-full" disabled={!assignTaskId}>
              <UserPlus className="w-4 h-4 mr-2" />
              Assign {selectedVolunteers.length} Volunteer{selectedVolunteers.length !== 1 ? 's' : ''}
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
                <Button size="sm" variant="outline" disabled={volunteers.length === 0 || tasks.length === 0}>
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
                  <div className="space-y-2">
                    <Label htmlFor="assign-day">Day (optional)</Label>
                    <Select value={assignDay || undefined} onValueChange={(val) => setAssignDay(val || "")}>
                      <SelectTrigger id="assign-day">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((day) => (
                          <SelectItem key={day} value={day}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assign-shift">Shift (optional)</Label>
                    <Select value={assignShift || undefined} onValueChange={(val) => setAssignShift(val || "")}>
                      <SelectTrigger id="assign-shift">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        {SHIFTS.map((shift) => (
                          <SelectItem key={shift} value={shift}>
                            {shift}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  <Button onClick={handleCreateAssignment} className="w-full">
                    Create Assignment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="py-12 text-center">
              <UserPlus className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-muted-foreground">No assignments yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Select volunteers above and assign them to tasks
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const taskAssignments = assignments.filter((a) => a.taskId === task.id);
                if (taskAssignments.length === 0) return null;

                const location = locations.find((l) => l.id === task.locationId);

                return (
                  <div key={task.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{task.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {location?.name || "No location"}
                        </p>
                      </div>
                      <Badge variant="secondary">{taskAssignments.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {taskAssignments.map((assignment) => {
                        const volunteer = volunteers.find((v) => v.id === assignment.volunteerId);
                        if (!volunteer) return null;

                        const scheduleText = assignment.day && assignment.shift
                          ? `${assignment.day} - ${assignment.shift}`
                          : assignment.day || assignment.shift || "No schedule";

                        return (
                          <div key={assignment.id} className="flex items-center justify-between p-2 rounded-lg border">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{volunteer.name}</div>
                              <div className="text-xs text-muted-foreground">{scheduleText}</div>
                              {assignment.description && (
                                <div className="text-xs text-muted-foreground mt-1">{assignment.description}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => sendToWhatsApp(volunteer, task, location, assignment)}
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-600"
                                title="Share to WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteAssignment(assignment.id)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                title="Remove"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

