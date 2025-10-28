"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Edit2 } from "lucide-react";
import { toast } from "sonner";
import type { Volunteer, Location, Task, Assignment } from "@/lib/db";
import { getFormConfig, DEFAULT_FORM_CONFIG, type FormConfig } from "@/lib/config";
import { updateVolunteer } from "@/lib/db";

interface OverviewTabProps {
  volunteers: Volunteer[];
  locations: Location[];
  tasks: Task[];
  assignments: Assignment[];
}

export function OverviewTab({ volunteers, locations, tasks, assignments }: OverviewTabProps) {
  const [formConfig, setFormConfig] = useState<FormConfig>(DEFAULT_FORM_CONFIG);
  const [filterDay, setFilterDay] = useState<string>("");
  const [filterShift, setFilterShift] = useState<string>("");
  const [filterCount, setFilterCount] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterExperience, setFilterExperience] = useState<string>("");
  const [updatingRoles, setUpdatingRoles] = useState<Set<string>>(new Set());
  const [leadAssignmentDialog, setLeadAssignmentDialog] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLeadTasks, setSelectedLeadTasks] = useState<string[]>([]);

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

  const getShiftAllocation = () => {
    const allocation: { [key: string]: { [key: string]: number } } = {};
    DAYS.forEach((day) => {
      allocation[day] = {};
      SHIFTS.forEach((shift) => {
        allocation[day][shift] = volunteers.filter((v) => {
          const shifts = v.shifts?.[day] || [];
          return shifts.includes(shift);
        }).length;
      });
    });
    return allocation;
  };

  const getTaskAllocation = () => {
    const allocation: { [key: string]: number } = {};
    tasks.forEach((task) => {
      allocation[task.id] = assignments.filter((a) => a.taskId === task.id).length;
    });
    return allocation;
  };

  const getExperienceAllocation = () => {
    const allocation: { [key: string]: number } = {};
    formConfig.experiences.forEach((exp) => {
      allocation[exp.id] = volunteers.filter((v) => 
        (v.experiences || []).includes(exp.id)
      ).length;
    });
    return allocation;
  };

  const handleRoleChange = async (volunteerId: string, newRole: "volunteer" | "lead") => {
    setUpdatingRoles((prev) => new Set(prev).add(volunteerId));
    try {
      await updateVolunteer(volunteerId, { role: newRole });
      toast.success(newRole === "lead" ? "Assigned as lead" : "Assigned as volunteer");
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    } finally {
      setUpdatingRoles((prev) => {
        const next = new Set(prev);
        next.delete(volunteerId);
        return next;
      });
    }
  };

  const handleSaveLeadTasks = async () => {
    if (!selectedLeadId) return;
    try {
      await updateVolunteer(selectedLeadId, { leadTaskIds: selectedLeadTasks });
      toast.success("Lead assignments updated");
      setLeadAssignmentDialog(false);
      setSelectedLeadId(null);
      setSelectedLeadTasks([]);
    } catch (error) {
      console.error("Error updating lead tasks:", error);
      toast.error("Failed to update lead assignments");
    }
  };

  const handleOpenLeadDialog = (leadId: string) => {
    const lead = volunteers.find(v => v.id === leadId);
    setSelectedLeadId(leadId);
    setSelectedLeadTasks(lead?.leadTaskIds || []);
    setLeadAssignmentDialog(true);
  };

  const shiftAllocation = getShiftAllocation();
  const taskAllocation = getTaskAllocation();
  const experienceAllocation = getExperienceAllocation();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Volunteers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{volunteers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total registered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{locations.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{tasks.length} tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{assignments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{volunteers.filter(v => v.role === "lead").length}</div>
            <p className="text-xs text-muted-foreground mt-1">Team leads assigned</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Leads</CardTitle>
            <CardDescription>Team leads and their assignments</CardDescription>
          </CardHeader>
          <CardContent>
            {volunteers.filter(v => v.role === "lead").length === 0 ? (
              <p className="text-sm text-muted-foreground">No leads assigned yet</p>
            ) : (
              <div className="space-y-3">
                {volunteers
                  .filter(v => v.role === "lead")
                  .map((lead) => {
                    const leadTasks = lead.leadTaskIds 
                      ? tasks.filter(t => lead.leadTaskIds?.includes(t.id))
                      : [];

                    return (
                      <div key={lead.id} className="p-3 rounded-lg border space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm">{lead.name}</div>
                            {leadTasks.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {leadTasks.map(t => t.name).join(", ")}
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => handleOpenLeadDialog(lead.id)}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs h-7"
                            onClick={() => window.location.href = `tel:${lead.phone}`}
                          >
                            Call
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs h-7"
                            onClick={() => window.location.href = `mailto:${lead.email}`}
                          >
                            Email
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Experience Distribution</CardTitle>
            <CardDescription>Volunteers by experience</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {formConfig.experiences.map((exp) => (
                <div key={exp.id} className="p-3 rounded-lg border">
                  <div className="text-sm text-muted-foreground">{exp.label}</div>
                  <div className="text-2xl font-bold mt-1">{experienceAllocation[exp.id] || 0}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Shift Availability</CardTitle>
            <CardDescription>Volunteers available per shift</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {DAYS.map((day) => (
                <div key={day}>
                  <div className="text-sm font-semibold mb-2">{day}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {SHIFTS.map((shift) => (
                      <div key={shift} className="p-2 rounded-lg border">
                        <div className="text-xs text-muted-foreground">{shift}</div>
                        <div className="text-lg font-bold">{shiftAllocation[day][shift]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Task Assignments</CardTitle>
            <CardDescription>Volunteers assigned to tasks</CardDescription>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks created yet</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => {
                  const location = locations.find((l) => l.id === task.locationId);
                  return (
                    <div key={task.id} className="p-3 rounded-lg border flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{task.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {location?.name || "No location"}
                        </div>
                      </div>
                      <Badge variant="secondary" className="ml-2">{taskAllocation[task.id] || 0}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Volunteers</CardTitle>
              <CardDescription>
                {filteredVolunteers.length !== volunteers.length
                  ? `Showing ${filteredVolunteers.length} of ${volunteers.length}`
                  : `${volunteers.length} total`}
              </CardDescription>
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

          {filteredVolunteers.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-muted-foreground">No volunteers found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredVolunteers.map((volunteer) => {
                const shiftData = volunteer.shifts || {};
                const totalShifts = getTotalShifts(volunteer);
                const volunteerAssignments = assignments.filter((a) => a.volunteerId === volunteer.id);

                return (
                  <div key={volunteer.id} className="p-4 rounded-lg border hover:border-primary/50 transition">
                    <div className="flex gap-4">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(volunteer.name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="font-semibold">{volunteer.name}</div>
                            {volunteer.role === "lead" && (
                              <Badge variant="default" className="text-xs">Lead</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{volunteer.email} • {volunteer.phone}</div>
                        </div>

                        {(volunteer.ageRange?.length || volunteer.experiences?.length) ? (
                          <div className="flex gap-2 flex-wrap">
                            {volunteer.ageRange?.map((ageId) => {
                              const ageQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("age"));
                              const ageLabel = ageQuestion?.options?.find(opt => opt.id === ageId)?.label || ageId;
                              return <Badge key={ageId} variant="secondary" className="text-xs">{ageLabel}</Badge>;
                            })}
                            {volunteer.experiences?.map((exp) => {
                              const expLabel = formConfig.experiences.find(e => e.id === exp)?.label;
                              return expLabel ? <Badge key={exp} variant="outline" className="text-xs">{expLabel}</Badge> : null;
                            })}
                          </div>
                        ) : null}

                        {Object.keys(shiftData).length > 0 && (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {formConfig.days
                              .filter((day) => shiftData[day]?.length > 0)
                              .map((day) => (
                                <div key={day} className="p-2 rounded bg-muted">
                                  <span className="font-medium">{day}:</span> {shiftData[day].join(", ")}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 items-end">
                        <Select 
                          value={volunteer.role || "volunteer"}
                          onValueChange={(value) => handleRoleChange(volunteer.id, value as "volunteer" | "lead")}
                          disabled={updatingRoles.has(volunteer.id)}
                        >
                          <SelectTrigger className="w-32 text-xs h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="volunteer">Volunteer</SelectItem>
                            <SelectItem value="lead">Lead</SelectItem>
                          </SelectContent>
                        </Select>
                        <Badge variant="secondary">{totalShifts} shifts</Badge>
                        {volunteerAssignments.length > 0 && (
                          <Badge>{volunteerAssignments.length} tasks</Badge>
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

      <Dialog open={leadAssignmentDialog} onOpenChange={setLeadAssignmentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Tasks to Lead</DialogTitle>
            <DialogDescription>
              Select which tasks this lead will be responsible for
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {tasks.map((task) => {
                const location = locations.find(l => l.id === task.locationId);
                return (
                  <div key={task.id} className="flex items-start space-x-3">
                    <Checkbox
                      id={task.id}
                      checked={selectedLeadTasks.includes(task.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedLeadTasks([...selectedLeadTasks, task.id]);
                        } else {
                          setSelectedLeadTasks(selectedLeadTasks.filter(id => id !== task.id));
                        }
                      }}
                    />
                    <label htmlFor={task.id} className="flex-1 cursor-pointer">
                      <div className="text-sm font-medium">{task.name}</div>
                      <div className="text-xs text-muted-foreground">{location?.name || "No location"}</div>
                    </label>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setLeadAssignmentDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveLeadTasks}>
                Save Assignments
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

