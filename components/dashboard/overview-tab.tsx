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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Edit2, Download, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";
import type { Volunteer, Location, Task, Assignment } from "@/lib/db";
import { getFormConfig, DEFAULT_FORM_CONFIG, type FormConfig } from "@/lib/config";
import { updateVolunteer, deleteVolunteer } from "@/lib/db";
import { formatPhone } from "@/lib/utils";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";

interface OverviewTabProps {
  volunteers: Volunteer[];
  locations: Location[];
  tasks: Task[];
  assignments: Assignment[];
  onDataChange: () => void;
}

export function OverviewTab({ volunteers, locations, tasks, assignments, onDataChange }: OverviewTabProps) {
  const [formConfig, setFormConfig] = useState<FormConfig>(DEFAULT_FORM_CONFIG);
  const [filterDay, setFilterDay] = useState<string>("");
  const [filterShift, setFilterShift] = useState<string>("");
  const [filterCount, setFilterCount] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterExperience, setFilterExperience] = useState<string>("");
  const [filterAgeRange, setFilterAgeRange] = useState<string>("");
  const [filterJamatKhane, setFilterJamatKhane] = useState<string>("");
  const [filterSkill, setFilterSkill] = useState<string>("");
  const [filterRole, setFilterRole] = useState<string>("");
  const [updatingRoles, setUpdatingRoles] = useState<Set<string>>(new Set());
  const [leadAssignmentDialog, setLeadAssignmentDialog] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLeadTasks, setSelectedLeadTasks] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [detailDialog, setDetailDialog] = useState(false);
  const [detailDialogTitle, setDetailDialogTitle] = useState("");
  const [detailDialogVolunteers, setDetailDialogVolunteers] = useState<Volunteer[]>([]);
  const volunteersPerPage = 10;

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
      const matchesJamatKhane = filterJamatKhane
        ? (volunteer.jamatKhane || []).includes(filterJamatKhane)
        : true;
      const matchesSkill = filterSkill
        ? volunteer.specialSkill === filterSkill
        : true;
      const matchesRole = filterRole
        ? volunteer.role === filterRole
        : true;

      return matchesSearch && matchesDay && matchesShift && matchesExperience && matchesAgeRange && matchesJamatKhane && matchesSkill && matchesRole;
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

  const getSkillsAllocation = () => {
    const allocation: { [key: string]: number } = {};
    const skillQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("skill"));
    if (!skillQuestion?.options) return allocation;
    
    skillQuestion.options.forEach((skill) => {
      allocation[skill.id] = volunteers.filter((v) => v.specialSkill === skill.id).length;
    });
    return allocation;
  };

  const getAgeRangeAllocation = () => {
    const allocation: { [key: string]: number } = {};
    const ageQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("age"));
    if (!ageQuestion?.options) return allocation;
    
    ageQuestion.options.forEach((age) => {
      allocation[age.id] = volunteers.filter((v) => 
        (v.ageRange || []).includes(age.id)
      ).length;
    });
    return allocation;
  };

  const getJamatKhaneAllocation = () => {
    const allocation: { [key: string]: number } = {};
    const jamatQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("jamat"));
    if (!jamatQuestion?.options) return allocation;
    
    jamatQuestion.options.forEach((jamat) => {
      allocation[jamat.id] = volunteers.filter((v) => 
        (v.jamatKhane || []).includes(jamat.id)
      ).length;
    });
    return allocation;
  };

  const handleShowVolunteersWithAttribute = (title: string, filterFn: (v: Volunteer) => boolean) => {
    const filtered = volunteers.filter(filterFn);
    setDetailDialogTitle(title);
    setDetailDialogVolunteers(filtered);
    setDetailDialog(true);
  };

  const handleExportCategory = (categoryLabel: string, volunteers: Volunteer[]) => {
    try {
      const headers = ["Name", "Email", "Phone"];
      const rows = volunteers.map(v => [
        v.name || "",
        v.email || "",
        formatPhone(v.phone || "")
      ]);

      const csvContent = [
        headers.map(h => `"${h}"`).join(","),
        ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const filename = categoryLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Export successful", {
        description: `Exported ${volunteers.length} volunteer(s) to CSV`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export failed");
    }
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
          formatPhone(volunteer.phone || ""),
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

  const handleDeleteVolunteer = async (volunteerId: string, volunteerName: string) => {
    if (!confirm(`Are you sure you want to delete ${volunteerName}? This action cannot be undone.`)) return;
    try {
      await deleteVolunteer(volunteerId);
      toast.success("Volunteer deleted", {
        description: `${volunteerName} has been removed from the database`,
      });
      onDataChange();
    } catch (error) {
      console.error("Error deleting volunteer:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error("Failed to delete volunteer", {
        description: errorMessage,
      });
    }
  };

  const shiftAllocation = getShiftAllocation();
  const taskAllocation = getTaskAllocation();
  const experienceAllocation = getExperienceAllocation();
  const skillsAllocation = getSkillsAllocation();
  const ageRangeAllocation = getAgeRangeAllocation();
  const jamatKhaneAllocation = getJamatKhaneAllocation();

  const totalPages = Math.ceil(filteredVolunteers.length / volunteersPerPage);
  const startIndex = (currentPage - 1) * volunteersPerPage;
  const endIndex = startIndex + volunteersPerPage;
  const paginatedVolunteers = filteredVolunteers.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterDay, filterShift, filterExperience, filterAgeRange, filterJamatKhane, filterSkill, filterRole]);

  const totalShiftsAvailable = volunteers.reduce((acc, v) => acc + getTotalShifts(v), 0);
  const uniqueVolunteersWithAssignments = new Set(assignments.map(a => a.volunteerId)).size;
  const pendingAssignments = assignments.filter(a => a.status === "pending").length;
  const completedAssignments = assignments.filter(a => a.status === "completed").length;
  const checkedInAssignments = assignments.filter(a => a.status === "checked-in").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:border-primary/50 transition hover:shadow-md" onClick={() => handleShowVolunteersWithAttribute("All Volunteers", () => true)}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Volunteers</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{volunteers.length}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {volunteers.filter(v => v.role === "lead").length} leads
              </Badge>
              <Badge variant="outline" className="text-xs">
                {totalShiftsAvailable} shifts
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition hover:shadow-md" onClick={() => handleShowVolunteersWithAttribute("Team Leads", (v) => v.role === "lead")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Team Leads</CardTitle>
              <Badge variant="default" className="text-xs">Lead</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{volunteers.filter(v => v.role === "lead").length}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {volunteers.filter(v => v.role === "lead" && v.leadTaskIds && v.leadTaskIds.length > 0).length} with assigned tasks
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Locations & Tasks</CardTitle>
              <MapPin className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{locations.length}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {tasks.length} total tasks created
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition hover:shadow-md" onClick={() => handleShowVolunteersWithAttribute("All Assigned Volunteers", (v) => assignments.some(a => a.volunteerId === v.id))}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Volunteers Deployed</CardTitle>
              <Badge variant="secondary">{uniqueVolunteersWithAssignments}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{uniqueVolunteersWithAssignments}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {assignments.length} total assignment{assignments.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {pendingAssignments > 0 && (
                <Badge 
                  variant="outline" 
                  className="text-xs cursor-pointer hover:bg-primary/10 transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShowVolunteersWithAttribute(
                      "Volunteers with Pending Assignments",
                      (v) => assignments.some(a => a.volunteerId === v.id && a.status === "pending")
                    );
                  }}
                >
                  {pendingAssignments} pending
                </Badge>
              )}
              {checkedInAssignments > 0 && (
                <Badge 
                  variant="secondary" 
                  className="text-xs cursor-pointer hover:bg-primary/10 transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShowVolunteersWithAttribute(
                      "Volunteers Checked-In",
                      (v) => assignments.some(a => a.volunteerId === v.id && a.status === "checked-in")
                    );
                  }}
                >
                  {checkedInAssignments} checked-in
                </Badge>
              )}
              {completedAssignments > 0 && (
                <Badge 
                  variant="default" 
                  className="text-xs cursor-pointer hover:bg-primary/10 transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShowVolunteersWithAttribute(
                      "Volunteers with Completed Assignments",
                      (v) => assignments.some(a => a.volunteerId === v.id && a.status === "completed")
                    );
                  }}
                >
                  {completedAssignments} completed
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Experience Distribution</CardTitle>
            <CardDescription>Volunteers by experience</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {formConfig.experiences.map((exp) => (
                <div 
                  key={exp.id} 
                  className="p-3 rounded-lg border cursor-pointer hover:border-primary/50 transition"
                  onClick={() => handleShowVolunteersWithAttribute(
                    `Volunteers with ${exp.label}`,
                    (v) => (v.experiences || []).includes(exp.id)
                  )}
                >
                  <div className="text-sm text-muted-foreground">{exp.label}</div>
                  <div className="text-2xl font-bold mt-1">{experienceAllocation[exp.id] || 0}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Skills Distribution</CardTitle>
            <CardDescription>Volunteers by special skill</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(() => {
                const skillQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("skill"));
                if (!skillQuestion?.options) return <p className="text-sm text-muted-foreground">No skills configured</p>;
                
                return skillQuestion.options
                  .filter(skill => skillsAllocation[skill.id] > 0)
                  .sort((a, b) => (skillsAllocation[b.id] || 0) - (skillsAllocation[a.id] || 0))
                  .map((skill) => (
                    <div 
                      key={skill.id} 
                      className="p-3 rounded-lg border flex justify-between items-center cursor-pointer hover:border-primary/50 transition"
                      onClick={() => handleShowVolunteersWithAttribute(
                        `Volunteers with ${skill.label}`,
                        (v) => v.specialSkill === skill.id
                      )}
                    >
                      <div className="text-sm truncate">{skill.label}</div>
                      <Badge variant="secondary">{skillsAllocation[skill.id] || 0}</Badge>
                    </div>
                  ));
              })()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Age Range Distribution</CardTitle>
            <CardDescription>Volunteers by age range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(() => {
                const ageQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("age"));
                if (!ageQuestion?.options) return <p className="text-sm text-muted-foreground">No age ranges configured</p>;
                
                return ageQuestion.options.map((age) => (
                  <div 
                    key={age.id} 
                    className="p-3 rounded-lg border flex justify-between items-center cursor-pointer hover:border-primary/50 transition"
                    onClick={() => handleShowVolunteersWithAttribute(
                      `Volunteers in ${age.label}`,
                      (v) => (v.ageRange || []).includes(age.id)
                    )}
                  >
                    <div className="text-sm">{age.label}</div>
                    <Badge variant="secondary">{ageRangeAllocation[age.id] || 0}</Badge>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Jamat Khane Distribution</CardTitle>
            <CardDescription>Volunteers by Jamat Khane</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(() => {
                const jamatQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("jamat"));
                if (!jamatQuestion?.options) return <p className="text-sm text-muted-foreground">No Jamat Khanes configured</p>;
                
                return jamatQuestion.options
                  .filter(jamat => jamatKhaneAllocation[jamat.id] > 0)
                  .sort((a, b) => (jamatKhaneAllocation[b.id] || 0) - (jamatKhaneAllocation[a.id] || 0))
                  .map((jamat) => (
                    <div 
                      key={jamat.id} 
                      className="p-3 rounded-lg border flex justify-between items-center cursor-pointer hover:border-primary/50 transition"
                      onClick={() => handleShowVolunteersWithAttribute(
                        `Volunteers from ${jamat.label}`,
                        (v) => (v.jamatKhane || []).includes(jamat.id)
                      )}
                    >
                      <div className="text-sm truncate">{jamat.label}</div>
                      <Badge variant="secondary">{jamatKhaneAllocation[jamat.id] || 0}</Badge>
                    </div>
                  ));
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Leads</CardTitle>
            <CardDescription>Team leads and their assignments</CardDescription>
          </CardHeader>
          <CardContent>
            {volunteers.filter(v => v.role === "lead").length === 0 ? (
              <p className="text-sm text-muted-foreground">No leads assigned yet</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
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
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs h-7"
                            onClick={() => {
                              let message = `Hi ${lead.name}!\n\n`;
                              message += `Thank you for being a team lead for the USA Visit volunteer program.\n\n`;
                              if (leadTasks.length > 0) {
                                message += `You're leading:\n`;
                                leadTasks.forEach((task, idx) => {
                                  message += `${idx + 1}. ${task.name}\n`;
                                });
                                message += `\n`;
                              }
                              message += `Please let us know if you have any questions.\n\n`;
                              message += `Best regards`;

                              const encodedMessage = encodeURIComponent(message);
                              const whatsappUrl = `https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${encodedMessage}`;
                              
                              window.open(whatsappUrl, "_blank");
                              toast.success("Opening WhatsApp", {
                                description: `Message prepared for ${lead.name}`,
                              });
                            }}
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5 text-green-600" />
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
            <CardTitle className="text-lg">Shift Availability</CardTitle>
            <CardDescription>Volunteers available per shift</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {DAYS.map((day) => (
                <div key={day} className="space-y-2">
                  <div className="text-sm font-semibold text-muted-foreground">{day}</div>
                  <div className="space-y-2">
                    {SHIFTS.map((shift) => (
                      <div 
                        key={shift} 
                        className="p-3 rounded-lg border flex justify-between items-center cursor-pointer hover:border-primary/50 transition"
                        onClick={() => handleShowVolunteersWithAttribute(
                          `Volunteers available for ${day} - ${shift}`,
                          (v) => {
                            const shiftData = v.shifts || {};
                            const dayShifts = shiftData[day] || [];
                            return dayShifts.includes(shift);
                          }
                        )}
                      >
                        <div className="text-sm">{shift}</div>
                        <Badge variant="secondary">{shiftAllocation[day][shift]}</Badge>
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
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {tasks
                  .sort((a, b) => (taskAllocation[b.id] || 0) - (taskAllocation[a.id] || 0))
                  .map((task) => {
                    const location = locations.find((l) => l.id === task.locationId);
                    return (
                      <div 
                        key={task.id} 
                        className="p-3 rounded-lg border flex items-center justify-between cursor-pointer hover:border-primary/50 transition"
                        onClick={() => handleShowVolunteersWithAttribute(
                          `Volunteers assigned to ${task.name}`,
                          (v) => assignments.some(a => a.volunteerId === v.id && a.taskId === task.id)
                        )}
                      >
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
              {(searchQuery || filterDay || filterShift || filterCount || filterExperience || filterAgeRange || filterJamatKhane || filterSkill || filterRole) && (
                <Button
                  onClick={() => {
                    setSearchQuery("");
                    setFilterDay("");
                    setFilterShift("");
                    setFilterCount("");
                    setFilterExperience("");
                    setFilterAgeRange("");
                    setFilterJamatKhane("");
                    setFilterSkill("");
                    setFilterRole("");
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
          <Input
            placeholder="Search name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <Select value={filterDay || undefined} onValueChange={(val) => setFilterDay(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((day) => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterShift || undefined} onValueChange={(val) => setFilterShift(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Shift" />
              </SelectTrigger>
              <SelectContent>
                {SHIFTS.map((shift) => (
                  <SelectItem key={shift} value={shift}>{shift}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterExperience || undefined} onValueChange={(val) => setFilterExperience(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Experience" />
              </SelectTrigger>
              <SelectContent>
                {formConfig.experiences.map((exp) => (
                  <SelectItem key={exp.id} value={exp.id}>{exp.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAgeRange || undefined} onValueChange={(val) => setFilterAgeRange(val)}>
              <SelectTrigger>
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
            <Select value={filterJamatKhane || undefined} onValueChange={(val) => setFilterJamatKhane(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Jamat Khane" />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  const jamatQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("jamat"));
                  return jamatQuestion?.options?.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                  ));
                })()}
              </SelectContent>
            </Select>
            <Select value={filterSkill || undefined} onValueChange={(val) => setFilterSkill(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Skill" />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  const skillQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("skill"));
                  return skillQuestion?.options?.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                  ));
                })()}
              </SelectContent>
            </Select>
            <Select value={filterRole || undefined} onValueChange={(val) => setFilterRole(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="volunteer">Volunteer</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="1"
              placeholder="Limit"
              value={filterCount}
              onChange={(e) => setFilterCount(e.target.value)}
            />
          </div>

          {filteredVolunteers.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-muted-foreground">No volunteers found</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedVolunteers.map((volunteer) => {
                const shiftData = volunteer.shifts || {};
                const totalShifts = getTotalShifts(volunteer);
                const volunteerAssignments = assignments.filter((a) => a.volunteerId === volunteer.id);
                const jamatKhaneLabels = (volunteer.jamatKhane || []).map(jkId => {
                  const jamatQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("jamat"));
                  return jamatQuestion?.options?.find(opt => opt.id === jkId)?.label || jkId;
                });
                const skillLabel = volunteer.specialSkill ? (() => {
                  const skillQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("skill"));
                  return skillQuestion?.options?.find(opt => opt.id === volunteer.specialSkill)?.label;
                })() : null;

                return (
                  <div key={volunteer.id} className="p-4 rounded-lg border hover:border-primary/50 transition hover:shadow-sm bg-card">
                    <div className="flex gap-4">
                      <Avatar className="h-12 w-12 shrink-0 ring-2 ring-primary/10">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-base">
                          {getInitials(volunteer.name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0 space-y-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-semibold text-base">{volunteer.name}</div>
                            {volunteer.role === "lead" && (
                              <Badge variant="default" className="text-xs">Team Lead</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span>{volunteer.email}</span>
                            <span>•</span>
                            <span>{formatPhone(volunteer.phone)}</span>
                            {volunteer.submittedAt && (
                              <>
                                <span>•</span>
                                <span className="text-xs">
                                  Joined {volunteer.submittedAt.toDate?.()?.toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                          <div className="flex gap-2 flex-wrap">
                            {volunteer.ageRange?.map((ageId) => {
                              const ageQuestion = formConfig.questions.find(q => q.label.toLowerCase().includes("age"));
                              const ageLabel = ageQuestion?.options?.find(opt => opt.id === ageId)?.label || ageId;
                            return <Badge key={ageId} variant="secondary" className="text-xs">👤 {ageLabel}</Badge>;
                            })}
                            {volunteer.experiences?.map((exp) => {
                              const expLabel = formConfig.experiences.find(e => e.id === exp)?.label;
                            return expLabel ? <Badge key={exp} variant="outline" className="text-xs">⭐ {expLabel}</Badge> : null;
                            })}
                          {skillLabel && (
                            <Badge variant="default" className="text-xs">🛠️ {skillLabel}</Badge>
                          )}
                          {jamatKhaneLabels.length > 0 && (
                            <Badge variant="outline" className="text-xs">🕌 {jamatKhaneLabels[0]}</Badge>
                          )}
                          </div>

                        {Object.keys(shiftData).length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {formConfig.days
                              .filter((day) => shiftData[day]?.length > 0)
                              .map((day) => (
                                <div key={day} className="p-2 rounded bg-muted/50 border">
                                  <span className="font-medium text-primary">{day}:</span> <span className="text-muted-foreground">{shiftData[day].join(", ")}</span>
                                </div>
                              ))}
                          </div>
                        )}

                        {volunteerAssignments.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {volunteerAssignments.map((assignment) => {
                              const task = tasks.find(t => t.id === assignment.taskId);
                              const location = locations.find(l => l.id === (assignment.locationId || task?.locationId));
                              return task ? (
                                <Badge key={assignment.id} variant="secondary" className="text-xs">
                                  📋 {task.name} {location && `@ ${location.name}`}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 items-end shrink-0">
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
                            <SelectItem value="lead">Team Lead</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs">{totalShifts} shifts</Badge>
                        {volunteerAssignments.length > 0 && (
                            <Badge className="text-xs">{volunteerAssignments.length} tasks</Badge>
                        )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              const whatsappUrl = `https://wa.me/${volunteer.phone.replace(/\D/g, '')}`;
                              window.open(whatsappUrl, "_blank");
                              toast.success("Opening WhatsApp", {
                                description: `Contacting ${volunteer.name}`,
                              });
                            }}
                            title="Contact on WhatsApp"
                          >
                            <WhatsAppIcon className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteVolunteer(volunteer.id, volunteer.name)}
                            title="Delete volunteer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
              
              {totalPages > 1 && (
                <div className="flex justify-center pt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) setCurrentPage(currentPage - 1);
                          }}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentPage(page);
                                }}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return (
                            <PaginationItem key={page}>
                              <span className="px-4">...</span>
                            </PaginationItem>
                          );
                        }
                        return null;
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                          }}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
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

      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>{detailDialogTitle}</DialogTitle>
                <DialogDescription>
                  {detailDialogVolunteers.length} volunteer{detailDialogVolunteers.length !== 1 ? 's' : ''} found
                </DialogDescription>
              </div>
              {detailDialogVolunteers.length > 0 && (
                <Button
                  onClick={() => handleExportCategory(detailDialogTitle, detailDialogVolunteers)}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {detailDialogVolunteers.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-muted-foreground">No volunteers found</p>
              </div>
            ) : (
              detailDialogVolunteers.map((volunteer) => (
                <div key={volunteer.id} className="p-3 rounded-lg border">
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(volunteer.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{volunteer.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {volunteer.email} • {formatPhone(volunteer.phone)}
                      </div>
                      {volunteer.role === "lead" && (
                        <Badge variant="default" className="text-xs mt-1">Lead</Badge>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          const whatsappUrl = `https://wa.me/${volunteer.phone.replace(/\D/g, '')}`;
                          window.open(whatsappUrl, "_blank");
                          toast.success("Opening WhatsApp", {
                            description: `Contacting ${volunteer.name}`,
                          });
                        }}
                        title="Contact on WhatsApp"
                      >
                        <WhatsAppIcon className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => {
                          handleDeleteVolunteer(volunteer.id, volunteer.name);
                          setDetailDialog(false);
                        }}
                        title="Delete volunteer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

