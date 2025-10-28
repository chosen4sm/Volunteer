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
import { Users, Edit2, Download } from "lucide-react";
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
  const [filterAgeRange, setFilterAgeRange] = useState<string>("");
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

      if (!filterDay && !filterShift && !filterExperience && !filterAgeRange) return matchesSearch;

      const shiftData = volunteer.shifts || {};
      const dayShifts = shiftData[filterDay] || [];

      const matchesDay = filterDay ? dayShifts.length > 0 : true;
      const matchesShift = filterShift ? dayShifts.includes(filterShift) : true;
      const matchesExperience = filterExperience
        ? (volunteer.experiences || []).includes(filterExperience)
        : true;
      const matchesAgeRange = filterAgeRange
        ? (volunteer.ageRange || []).includes(filterAgeRange)
        : true;

      return matchesSearch && matchesDay && matchesShift && matchesExperience && matchesAgeRange;
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

  const handleExportVolunteers = () => {
    try {
      const baseFields = ["id", "name", "email", "phone", "role", "experiences", "ageRange", "jamatKhane", "specialSkill", "shifts", "submittedAt", "leadTaskIds"];
      const excludeFields = ["select-your-primary-jamat-khane"];
      
      const allExtraFields = new Set<string>();
      volunteers.forEach(v => {
        const volunteerData = v as unknown as Record<string, unknown>;
        Object.keys(volunteerData).forEach(key => {
          if (!baseFields.includes(key) && !excludeFields.includes(key)) {
            allExtraFields.add(key);
          }
        });
      });

      const headers = [
        "Name",
        "Email",
        "Phone",
        "Role",
        "Total Shifts",
        "Experiences",
        "Age Range",
        "Jamat Khane",
        "Special Skill",
        "Submitted At",
      ];

      formConfig.days.forEach(day => {
        headers.push(`${day} Shifts`);
      });

      Array.from(allExtraFields).sort().forEach(fieldId => {
        const question = formConfig.questions.find(q => q.id === fieldId);
        headers.push(question?.label || fieldId);
      });

      const rows = volunteers.map(volunteer => {
        const row: string[] = [
          volunteer.name || "",
          volunteer.email || "",
          volunteer.phone || "",
          volunteer.role || "volunteer",
          getTotalShifts(volunteer).toString(),
          (volunteer.experiences || []).map(exp => {
            const expLabel = formConfig.experiences.find(e => e.id === exp)?.label;
            return expLabel || exp;
          }).join("; "),
          (volunteer.ageRange || []).map(ageId => {
            const ageQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("age"));
            const ageLabel = ageQuestion?.options?.find(opt => opt.id === ageId)?.label;
            return ageLabel || ageId;
          }).join("; "),
          (volunteer.jamatKhane || []).map(jamatId => {
            const jamatQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("jamat"));
            const jamatLabel = jamatQuestion?.options?.find(opt => opt.id === jamatId)?.label;
            return jamatLabel || jamatId;
          }).join("; "),
          (() => {
            if (!volunteer.specialSkill) return "";
            const skillQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("skill"));
            const skillLabel = skillQuestion?.options?.find(opt => opt.id === volunteer.specialSkill)?.label;
            return skillLabel || volunteer.specialSkill;
          })(),
          volunteer.submittedAt?.toDate?.()?.toLocaleString() || "",
        ];

        formConfig.days.forEach(day => {
          const dayShifts = volunteer.shifts?.[day] || [];
          row.push(dayShifts.join("; "));
        });

        Array.from(allExtraFields).sort().forEach(fieldId => {
          const volunteerData = volunteer as unknown as Record<string, unknown>;
          const value = volunteerData[fieldId];
          const question = formConfig.questions.find(q => q.id === fieldId);
          
          if (Array.isArray(value)) {
            const labels = value.map(v => {
              const option = question?.options?.find(opt => opt.id === v);
              return option?.label || v;
            });
            row.push(labels.join("; "));
          } else if (typeof value === "string") {
            const option = question?.options?.find(opt => opt.id === value);
            row.push(option?.label || value);
          } else {
            row.push("");
          }
        });

        return row;
      });

      const csvContent = [
        headers.map(h => `"${h}"`).join(","),
        ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `volunteers_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Export successful", {
        description: `Exported ${volunteers.length} volunteer(s) to CSV`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export failed", {
        description: "Failed to export volunteers data",
      });
    }
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
            <div className="flex gap-2">
              {(searchQuery || filterDay || filterShift || filterCount || filterExperience || filterAgeRange) && (
                <Button
                  onClick={() => {
                    setSearchQuery("");
                    setFilterDay("");
                    setFilterShift("");
                    setFilterCount("");
                    setFilterExperience("");
                    setFilterAgeRange("");
                  }}
                  variant="outline"
                  size="sm"
                >
                  Clear Filters
                </Button>
              )}
              <Button
                onClick={handleExportVolunteers}
                variant="outline"
                size="sm"
                disabled={volunteers.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
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
            <Select value={filterAgeRange || undefined} onValueChange={(val) => setFilterAgeRange(val)}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Age Range" />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  const ageQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("age"));
                  return ageQuestion?.options?.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                  ));
                })()}
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

