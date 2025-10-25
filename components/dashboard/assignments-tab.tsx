"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { FORM_CONFIG } from "@/lib/config";

interface AssignmentsTabProps {
  volunteers: Volunteer[];
  locations: Location[];
  tasks: Task[];
  assignments: Assignment[];
  onDataChange: () => void;
}

const DAYS = FORM_CONFIG.days;
const SHIFTS = FORM_CONFIG.shifts;

export function AssignmentsTab({
  volunteers,
  locations,
  tasks,
  assignments,
  onDataChange,
}: AssignmentsTabProps) {
  const [filterDay, setFilterDay] = useState<string>("");
  const [filterShift, setFilterShift] = useState<string>("");
  const [filterCount, setFilterCount] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [assignVolunteerId, setAssignVolunteerId] = useState("");
  const [assignLocationId, setAssignLocationId] = useState("");
  const [assignTaskId, setAssignTaskId] = useState("");
  const [assignShift, setAssignShift] = useState("");
  const [assignDay, setAssignDay] = useState("");
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);

  const getInitials = (name?: string) => {
    const parts = name?.split(" ") || [];
    return `${parts[0]?.charAt(0) || ""}${parts[parts.length - 1]?.charAt(0) || ""}`.toUpperCase();
  };

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

      if (!filterDay && !filterShift) return matchesSearch;

      const shiftData = volunteer.shifts || {};
      const dayShifts = shiftData[filterDay] || [];

      const matchesDay = filterDay ? dayShifts.length > 0 : true;
      const matchesShift = filterShift ? dayShifts.includes(filterShift) : true;

      return matchesSearch && matchesDay && matchesShift;
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
    if (!assignVolunteerId || !assignLocationId || !assignTaskId) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      await createAssignment({
        volunteerId: assignVolunteerId,
        locationId: assignLocationId,
        taskId: assignTaskId,
        shift: assignShift,
        day: assignDay,
      });
      toast.success("Volunteer assigned to task");
      setAssignmentDialogOpen(false);
      setAssignVolunteerId("");
      setAssignLocationId("");
      setAssignTaskId("");
      setAssignShift("");
      setAssignDay("");
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
    if (selectedVolunteers.length === 0 || !assignLocationId || !assignTaskId) {
      toast.error("Please select volunteers and fill in all required fields");
      return;
    }
    try {
      const promises = selectedVolunteers.map((volunteerId) =>
        createAssignment({
          volunteerId,
          locationId: assignLocationId,
          taskId: assignTaskId,
          shift: assignShift,
          day: assignDay,
        })
      );
      await Promise.all(promises);
      toast.success(`${selectedVolunteers.length} volunteer(s) assigned to task`);
      setSelectedVolunteers([]);
      setAssignLocationId("");
      setAssignTaskId("");
      setAssignShift("");
      setAssignDay("");
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

  const sendToWhatsApp = (volunteer: Volunteer, task: Task, location: Location, assignment: Assignment) => {
    const scheduleText = assignment.day && assignment.shift
      ? `${assignment.day} - ${assignment.shift}`
      : assignment.day
      ? assignment.day
      : assignment.shift
      ? assignment.shift
      : "No schedule specified";

    const message = `✅ Assignment Confirmation

👤 *${volunteer.name}*
📞 ${volunteer.phone}

📍 Location: *${location.name}*
🎯 Task: *${task.name}*
📅 Schedule: *${scheduleText}*`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    window.open(whatsappUrl, "_blank");
    toast.success("Opening WhatsApp", {
      description: "Message is ready to send to your group",
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Filter Volunteers</CardTitle>
          <CardDescription>Find volunteers by availability or search to assign them to tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="volunteers-needed-assign">Number Needed</Label>
              <Input
                id="volunteers-needed-assign"
                type="number"
                min="1"
                placeholder="e.g., 50"
                value={filterCount}
                onChange={(e) => setFilterCount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="search-assign">Search</Label>
              <Input
                id="search-assign"
                placeholder="Name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="day-assign">Day</Label>
              <Select value={filterDay || undefined} onValueChange={(val) => setFilterDay(val)}>
                <SelectTrigger id="day-assign">
                  <SelectValue placeholder="All days" />
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
              <Label htmlFor="shift-assign">Shift</Label>
              <Select value={filterShift || undefined} onValueChange={(val) => setFilterShift(val)}>
                <SelectTrigger id="shift-assign">
                  <SelectValue placeholder="All shifts" />
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
              <Label className="invisible">Actions</Label>
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setFilterDay("");
                  setFilterShift("");
                  setFilterCount("");
                }}
                variant="outline"
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Select Volunteers ({selectedVolunteers.length} selected)</CardTitle>
              <CardDescription>
                {selectedVolunteers.length > 0 && selectedVolunteers.length > filteredVolunteers.filter(v => selectedVolunteers.includes(v.id)).length
                  ? `Showing ${displayVolunteers.length} volunteers (${selectedVolunteers.length} selected, ${filteredVolunteers.length} match filters)`
                  : filteredVolunteers.length !== volunteers.length
                  ? `Showing ${filteredVolunteers.length} of ${volunteers.length} volunteers`
                  : "All volunteers"}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={selectAllFilteredVolunteers}>
                Select All
              </Button>
              {selectedVolunteers.length > 0 && (
                <Button size="sm" variant="outline" onClick={clearVolunteerSelection}>
                  Clear Selection
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredVolunteers.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No volunteers found</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {displayVolunteers.map((volunteer) => {
                const isSelected = selectedVolunteers.includes(volunteer.id);
                const shiftData = volunteer.shifts || {};
                const totalShifts = getTotalShifts(volunteer);
                const consecutiveShifts = hasConsecutiveShifts(volunteer, filterDay, filterShift);

                return (
                  <div
                    key={volunteer.id}
                    onClick={() => toggleVolunteerSelection(volunteer.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-accent"
                        : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        className="pointer-events-none mt-1"
                      />
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-accent text-accent-foreground text-sm font-semibold">
                          {getInitials(volunteer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <div className="font-semibold text-sm">
                              {volunteer.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{volunteer.email}</div>
                            {volunteer.team && (
                              <div className="text-xs text-muted-foreground">
                                {volunteer.team}
                              </div>
                            )}
                          </div>
                          <Badge variant="secondary" className="shrink-0">{totalShifts} shifts</Badge>
                        </div>
                        
                        {consecutiveShifts && (
                          <div className="mt-2 mb-2 p-2 bg-chart-3/10 border border-chart-3/30 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-chart-3 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <div className="text-xs font-semibold text-chart-3">
                                  Consecutive Shifts Detected
                                </div>
                                {consecutiveShifts.map((shift, idx) => (
                                  <div key={idx} className="text-xs text-chart-3">
                                    {shift}
                                  </div>
                                ))}
                                <div className="flex items-center justify-between mt-2 gap-2">
                                  <div className="text-xs text-chart-3">
                                    Consider replacing with someone else
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2 text-xs border-chart-3/30 hover:bg-chart-3/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      replaceVolunteerWithAlternative(
                                        volunteer.id,
                                        volunteer.name
                                      );
                                    }}
                                  >
                                    Replace
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {Object.keys(shiftData).length > 0 && (
                          <div className="mt-2 space-y-1">
                            {Object.entries(shiftData).map(
                              ([day, shifts]) =>
                                shifts.length > 0 && (
                                  <div key={day} className="text-xs">
                                    <span className="font-medium text-foreground">{day}:</span>{" "}
                                    <span className="text-muted-foreground">{shifts.join(", ")}</span>
                                  </div>
                                )
                            )}
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
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Assign {selectedVolunteers.length} Volunteer(s) to Task</CardTitle>
            <CardDescription>Choose location, task, and optional day/shift</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bulk-location">Location</Label>
                  <Select value={assignLocationId || undefined} onValueChange={setAssignLocationId}>
                    <SelectTrigger id="bulk-location">
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
                  <Label htmlFor="bulk-task">Task</Label>
                  <Select value={assignTaskId || undefined} onValueChange={setAssignTaskId}>
                    <SelectTrigger id="bulk-task">
                      <SelectValue placeholder="Select task" />
                    </SelectTrigger>
                    <SelectContent>
                      {tasks
                        .filter((t) => !assignLocationId || t.locationId === assignLocationId)
                        .map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bulk-day">Day (optional)</Label>
                  <Select value={assignDay || undefined} onValueChange={(val) => setAssignDay(val || "")}>
                    <SelectTrigger id="bulk-day">
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
                  <Label htmlFor="bulk-shift">Shift (optional)</Label>
                  <Select value={assignShift || undefined} onValueChange={(val) => setAssignShift(val || "")}>
                    <SelectTrigger id="bulk-shift">
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
              </div>
              <Button
                onClick={handleBulkAssignment}
                className="w-full bg-primary hover:bg-primary/90"
                disabled={!assignLocationId || !assignTaskId}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Assign {selectedVolunteers.length} Volunteer(s)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Assignments by Task ({assignments.length} total)</CardTitle>
              <CardDescription>View volunteers grouped by their assigned tasks</CardDescription>
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
                    <Label htmlFor="assign-location">Location</Label>
                    <Select value={assignLocationId || undefined} onValueChange={setAssignLocationId}>
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
                    <Select value={assignTaskId || undefined} onValueChange={setAssignTaskId}>
                      <SelectTrigger id="assign-task">
                        <SelectValue placeholder="Select task" />
                      </SelectTrigger>
                      <SelectContent>
                        {tasks
                          .filter((t) => !assignLocationId || t.locationId === assignLocationId)
                          .map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
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
            <div className="py-8 text-center">
              <UserPlus className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No assignments yet</p>
              <p className="text-sm text-muted-foreground">
                Use the filter above to select volunteers and assign them to tasks
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => {
                const taskAssignments = assignments.filter((a) => a.taskId === task.id);
                if (taskAssignments.length === 0) return null;

                const location = locations.find((l) => l.id === task.locationId);

                return (
                  <div key={task.id} className="border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{task.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {location?.name || "Unknown location"} • {taskAssignments.length} volunteer
                          {taskAssignments.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        {taskAssignments.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {taskAssignments.map((assignment) => {
                        const volunteer = volunteers.find((v) => v.id === assignment.volunteerId);
                        if (!volunteer) return null;

                        const scheduleText = assignment.day && assignment.shift
                          ? `${assignment.day} - ${assignment.shift}`
                          : assignment.day
                          ? assignment.day
                          : assignment.shift
                          ? assignment.shift
                          : null;

                        return (
                          <div
                            key={assignment.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-background"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                                  {getInitials(volunteer.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">
                                  {volunteer.name}
                                </div>
                                {scheduleText ? (
                                  <div className="text-xs text-muted-foreground">
                                    {scheduleText}
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground italic">
                                    No schedule specified
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => sendToWhatsApp(volunteer, task, location!, assignment)}
                                className="text-chart-1 hover:text-chart-1"
                                title="Share to WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteAssignment(assignment.id)}
                                className="text-destructive hover:text-destructive"
                                title="Remove assignment"
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
    </>
  );
}

