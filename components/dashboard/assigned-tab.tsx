"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Clock, User, Link2, Trash2, UserPlus, Search, Pencil, Download, Table as TableIcon, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import type { Volunteer, Location, Task, Assignment } from "@/lib/db";
import { deleteAssignment, updateAssignment } from "@/lib/db";
import { Label } from "@/components/ui/label";
import { TimePicker } from "@/components/ui/time-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { formatTime } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as XLSX from 'xlsx';

interface AssignedTabProps {
  volunteers: Volunteer[];
  locations: Location[];
  tasks: Task[];
  assignments: Assignment[];
  onDataChange: () => void;
  isReadOnly?: boolean;
}

export function AssignedTab({
  volunteers,
  locations,
  tasks,
  assignments,
  onDataChange,
  isReadOnly = false,
}: AssignedTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [filterDay, setFilterDay] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");
  
  const [editAssignmentDialogOpen, setEditAssignmentDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [assignLocationId, setAssignLocationId] = useState("");
  const [assignTaskId, setAssignTaskId] = useState("");
  const [assignShift, setAssignShift] = useState("");
  const [assignDay, setAssignDay] = useState("");
  const [assignStartTime, setAssignStartTime] = useState("");
  const [assignEndTime, setAssignEndTime] = useState("");
  const [assignDescription, setAssignDescription] = useState("");
  
  const DAYS = ["Friday", "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
  const SHIFTS = ["Morning", "Afternoon", "Evening", "Night"];

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    const groupedByDay = filteredAssignments.reduce((acc, assignment) => {
      const day = assignment.day || "Unscheduled";
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(assignment);
      return acc;
    }, {} as Record<string, Assignment[]>);

    const dayOrder = ["Friday", "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Unscheduled"];
    const sortedDays = Object.keys(groupedByDay).sort((a, b) => {
      const indexA = dayOrder.indexOf(a);
      const indexB = dayOrder.indexOf(b);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    sortedDays.forEach((day) => {
      const dayAssignments = groupedByDay[day];
      
      const exportData = dayAssignments.map((assignment) => {
        const volunteer = volunteers.find(v => v.id === assignment.volunteerId);
        const task = tasks.find(t => t.id === assignment.taskId);
        const location = assignment.locationId 
          ? locations.find(l => l.id === assignment.locationId)
          : locations.find(l => l.id === task?.locationId);

        const getScheduleText = () => {
          if (assignment.startTime || assignment.endTime) {
            return [assignment.startTime, assignment.endTime]
              .filter(Boolean)
              .map(t => formatTime(t))
              .join(" - ");
          }
          return assignment.shift || "";
        };

        return {
          Name: volunteer?.name || "",
          Email: volunteer?.email || "",
          Phone: volunteer?.phone || "",
          Role: volunteer?.role === "lead" ? "Core Team" : volunteer?.role === "team-lead" ? "Team Lead" : "Volunteer",
          Location: location?.name || "",
          Task: task?.name || "",
          Shift: assignment.shift || "",
          "Custom Time": getScheduleText(),
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      const colWidths = [
        { wch: 20 },
        { wch: 30 },
        { wch: 15 },
        { wch: 12 },
        { wch: 20 },
        { wch: 25 },
        { wch: 12 },
        { wch: 20 },
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, day);
    });

    XLSX.writeFile(wb, `volunteer-assignments-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Exported successfully", {
      description: `${filteredAssignments.length} assignments across ${sortedDays.length} sheet(s)`,
    });
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      await deleteAssignment(id);
      toast.success("Assignment removed successfully");
      onDataChange();
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast.error("Failed to remove assignment");
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

  const copyVolunteerLink = (volunteer: Volunteer) => {
    if (!volunteer.uniqueCode) {
      toast.error("No unique code found", {
        description: "This volunteer doesn't have a portal link yet",
      });
      return;
    }
    const portalLink = `${window.location.origin}/volunteer/${volunteer.uniqueCode}`;
    navigator.clipboard.writeText(portalLink);
    toast.success("Link copied!", {
      description: "Volunteer portal link copied to clipboard",
    });
  };

  const sendToWhatsApp = (
    volunteer: Volunteer,
    task: Task,
    location: Location | undefined,
    assignment: Assignment
  ) => {
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

  // Filter assignments
  const filteredAssignments = assignments.filter((assignment) => {
    const volunteer = volunteers.find(v => v.id === assignment.volunteerId);
    const task = tasks.find(t => t.id === assignment.taskId);
    
    if (searchQuery && volunteer) {
      const query = searchQuery.toLowerCase();
      const matchesName = volunteer.name.toLowerCase().includes(query);
      const matchesTask = task?.name.toLowerCase().includes(query);
      if (!matchesName && !matchesTask) return false;
    }

    if (filterLocation && filterLocation !== "all") {
      const assignmentLocation = assignment.locationId || task?.locationId;
      if (assignmentLocation !== filterLocation) return false;
    }

    if (filterDay && filterDay !== "all" && assignment.day !== filterDay) return false;

    return true;
  });

  // Group assignments by location and task
  const groupedAssignments = tasks
    .filter((task) => filteredAssignments.some((a) => a.taskId === task.id))
    .sort((a, b) => {
      const locationA = locations.find((l) => l.id === a.locationId)?.name || "";
      const locationB = locations.find((l) => l.id === b.locationId)?.name || "";
      return locationA.localeCompare(locationB);
    })
    .map((task) => {
      const taskAssignments = filteredAssignments.filter((a) => a.taskId === task.id);
      
      const getLocationForAssignment = (assignment: Assignment) => {
        if (assignment.locationId) {
          return locations.find((l) => l.id === assignment.locationId);
        }
        return locations.find((l) => l.id === task.locationId);
      };

      const primaryLocation = getLocationForAssignment(taskAssignments[0]);

      return {
        task,
        assignments: taskAssignments,
        primaryLocation,
        getLocationForAssignment,
      };
    });

  const totalAssignments = filteredAssignments.length;
  const uniqueVolunteers = new Set(filteredAssignments.map(a => a.volunteerId)).size;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Assigned Volunteers</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {totalAssignments} assignment{totalAssignments !== 1 ? 's' : ''} across {uniqueVolunteers} volunteer{uniqueVolunteers !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex border rounded-lg p-1">
                <Button
                  size="sm"
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  onClick={() => setViewMode("table")}
                  className="h-8 px-3"
                >
                  <TableIcon className="w-4 h-4 mr-1.5" />
                  Table
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "cards" ? "secondary" : "ghost"}
                  onClick={() => setViewMode("cards")}
                  className="h-8 px-3"
                >
                  <LayoutGrid className="w-4 h-4 mr-1.5" />
                  Cards
                </Button>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={exportToExcel}
                disabled={totalAssignments === 0}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by volunteer name or task..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="w-full sm:w-48">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <SelectValue placeholder="All locations" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDay} onValueChange={setFilterDay}>
              <SelectTrigger className="w-full sm:w-48">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <SelectValue placeholder="All days" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All days</SelectItem>
                <SelectItem value="Friday">Friday</SelectItem>
                <SelectItem value="Saturday">Saturday</SelectItem>
                <SelectItem value="Sunday">Sunday</SelectItem>
                <SelectItem value="Monday">Monday</SelectItem>
                <SelectItem value="Tuesday">Tuesday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {totalAssignments === 0 ? (
            <div className="py-12 text-center">
              <UserPlus className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-muted-foreground">No assignments yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Go to the Assignments tab to assign volunteers to tasks
              </p>
            </div>
          ) : viewMode === "table" ? (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map((assignment) => {
                    const volunteer = volunteers.find(v => v.id === assignment.volunteerId);
                    const task = tasks.find(t => t.id === assignment.taskId);
                    const location = assignment.locationId 
                      ? locations.find(l => l.id === assignment.locationId)
                      : locations.find(l => l.id === task?.locationId);

                    if (!volunteer) return null;

                    const getTimeText = () => {
                      if (assignment.startTime || assignment.endTime) {
                        return [assignment.startTime, assignment.endTime]
                          .filter(Boolean)
                          .map(t => formatTime(t))
                          .join(" - ");
                      }
                      return "-";
                    };

                    return (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {volunteer.name}
                            {volunteer.role === "lead" && (
                              <Badge variant="default" className="h-5 text-xs">Core</Badge>
                            )}
                            {volunteer.role === "team-lead" && (
                              <Badge variant="secondary" className="h-5 text-xs">Lead</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{volunteer.email}</TableCell>
                        <TableCell className="text-muted-foreground">{volunteer.phone || "-"}</TableCell>
                        <TableCell>{location?.name || "-"}</TableCell>
                        <TableCell>{task?.name || "-"}</TableCell>
                        <TableCell>{assignment.day || "-"}</TableCell>
                        <TableCell>{assignment.shift || "-"}</TableCell>
                        <TableCell>{getTimeText()}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyVolunteerLink(volunteer)}
                              className="h-8 w-8 p-0"
                              title="Copy volunteer link"
                            >
                              <Link2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => task && sendToWhatsApp(volunteer, task, location, assignment)}
                              className="h-8 w-8 p-0"
                              title="Share to WhatsApp"
                              disabled={!task}
                            >
                              <WhatsAppIcon className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditAssignment(assignment)}
                              className="h-8 w-8 p-0"
                              disabled={isReadOnly}
                              title={isReadOnly ? "Cannot edit in view-only mode" : "Edit assignment"}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteAssignment(assignment.id)}
                              className="h-8 w-8 p-0"
                              disabled={isReadOnly}
                              title={isReadOnly ? "Cannot delete in view-only mode" : "Remove"}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedAssignments.map(({ task, assignments: taskAssignments, primaryLocation, getLocationForAssignment }) => (
                <Card key={task.id} className="overflow-hidden">
                  <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-4 border-b">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{task.name}</h3>
                            {primaryLocation && (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">{primaryLocation.name}</span>
                              </div>
                            )}
                          </div>
                          <Badge variant="secondary" className="shrink-0">
                            {taskAssignments.length} {taskAssignments.length === 1 ? "volunteer" : "volunteers"}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const volunteers_list = taskAssignments
                            .map((assignment) => {
                              const volunteer = volunteers.find((v) => v.id === assignment.volunteerId);
                              if (!volunteer) return null;
                              return {
                                name: volunteer.name,
                                phone: volunteer.phone,
                                assignment: assignment,
                              };
                            })
                            .filter((v): v is NonNullable<typeof v> => v !== null);

                          if (volunteers_list.length > 0) {
                            const firstAssignment = taskAssignments[0];
                            const scheduleText = (() => {
                              if (firstAssignment.startTime || firstAssignment.endTime) {
                                const timeStr = [firstAssignment.startTime, firstAssignment.endTime]
                                  .filter(Boolean)
                                  .map(t => formatTime(t))
                                  .join(" - ");
                                return firstAssignment.day ? `${firstAssignment.day} ${timeStr}` : timeStr;
                              }
                              if (firstAssignment.day && firstAssignment.shift) {
                                return `${firstAssignment.day} - ${firstAssignment.shift}`;
                              }
                              return firstAssignment.day || firstAssignment.shift || "TBD";
                            })();

                            let message = `You have been assigned to a duty @ ${primaryLocation?.name || ""}\n\n`;
                            message += `*${task.name}*\n`;
                            message += `${scheduleText}\n\n`;
                            volunteers_list.forEach((v) => {
                              message += `${v.name} - ${v.phone}\n`;
                            });
                            message += `\nCheck your email for details.`;

                            const encodedMessage = encodeURIComponent(message);
                            const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

                            window.open(whatsappUrl, "_blank");
                            toast.success("Opening WhatsApp", {
                              description: `Prepared message for ${volunteers_list.length} volunteer(s)`,
                            });
                          }
                        }}
                        className="gap-2"
                      >
                        <WhatsAppIcon className="w-4 h-4 text-green-600" />
                        <span className="hidden sm:inline">WhatsApp All</span>
                      </Button>
                    </div>
                  </div>
                  <div className="divide-y">
                    {taskAssignments.map((assignment) => {
                      const volunteer = volunteers.find((v) => v.id === assignment.volunteerId);
                      if (!volunteer) return null;

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
                        return assignment.day || assignment.shift || "No schedule";
                      };

                      const scheduleText = getScheduleText();
                      const assignmentLocation = getLocationForAssignment(assignment);

                      return (
                        <div key={assignment.id} className="px-5 py-4 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2.5 mb-2">
                                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="font-medium text-base">{volunteer.name}</span>
                                {volunteer.role === "lead" && (
                                  <Badge variant="default" className="h-5 text-xs">Core Team</Badge>
                                )}
                                {volunteer.role === "team-lead" && (
                                  <Badge variant="secondary" className="h-5 text-xs">Team Lead</Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 ml-6.5 text-sm">
                                {scheduleText && (
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{scheduleText}</span>
                                  </div>
                                )}
                                {assignmentLocation && assignmentLocation.id !== primaryLocation?.id && (
                                  <Badge variant="outline" className="text-xs">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {assignmentLocation.name}
                                  </Badge>
                                )}
                                {volunteer.phone && (
                                  <span className="text-muted-foreground">{volunteer.phone}</span>
                                )}
                              </div>
                              {assignment.description && (
                                <div className="text-sm text-muted-foreground mt-2 ml-6.5 italic">
                                  {assignment.description}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyVolunteerLink(volunteer)}
                                className="h-9 w-9 p-0"
                                title="Copy volunteer link"
                              >
                                <Link2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => sendToWhatsApp(volunteer, task, assignmentLocation || primaryLocation, assignment)}
                                className="h-9 w-9 p-0"
                                title="Share to WhatsApp"
                              >
                                <WhatsAppIcon className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditAssignment(assignment)}
                                className="h-9 w-9 p-0"
                                disabled={isReadOnly}
                                title={isReadOnly ? "Cannot edit in view-only mode" : "Edit assignment"}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteAssignment(assignment.id)}
                                className="h-9 w-9 p-0"
                                disabled={isReadOnly}
                                title={isReadOnly ? "Cannot delete in view-only mode" : "Remove"}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
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
  );
}

