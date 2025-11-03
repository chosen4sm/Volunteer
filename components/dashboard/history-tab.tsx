"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, CheckCircle } from "lucide-react";
import type { Volunteer, Location, Task, Assignment } from "@/lib/db";
import { getFormConfig, DEFAULT_FORM_CONFIG, type FormConfig } from "@/lib/config";

interface HistoryTabProps {
  volunteers: Volunteer[];
  locations: Location[];
  tasks: Task[];
  assignments: Assignment[];
}

export function HistoryTab({ volunteers, locations, tasks, assignments }: HistoryTabProps) {
  const [formConfig, setFormConfig] = useState<FormConfig>(DEFAULT_FORM_CONFIG);
  const [filterDay, setFilterDay] = useState<string>("");
  const [filterTask, setFilterTask] = useState<string>("");
  const [filterVolunteer, setFilterVolunteer] = useState<string>("");
  const [daysThreshold, setDaysThreshold] = useState<string>("7");

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

  const assignmentsByDay = useMemo(() => {
    const grouped: { [key: string]: Assignment[] } = {};
    
    let filteredAssignments = assignments;
    
    if (filterDay) {
      filteredAssignments = filteredAssignments.filter((a) => a.day === filterDay);
    }
    if (filterTask) {
      filteredAssignments = filteredAssignments.filter((a) => a.taskId === filterTask);
    }
    if (filterVolunteer) {
      filteredAssignments = filteredAssignments.filter((a) => a.volunteerId === filterVolunteer);
    }

    filteredAssignments.forEach((assignment) => {
      const day = assignment.day || "No Day Specified";
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(assignment);
    });

    return grouped;
  }, [assignments, filterDay, filterTask, filterVolunteer]);

  const volunteerParticipation = useMemo(() => {
    const participation: {
      [volunteerId: string]: {
        total: number;
        completed: number;
        checkedIn: number;
        pending: number;
        lastAssignmentDate?: Date;
      };
    } = {};

    volunteers.forEach((volunteer) => {
      const volunteerAssignments = assignments.filter((a) => a.volunteerId === volunteer.id);
      const checkIns = volunteer.checkIns || [];
      
      let lastDate: Date | undefined;
      checkIns.forEach((ci) => {
        if (ci.checkInTime) {
          const date = ci.checkInTime.toDate();
          if (!lastDate || date > lastDate) {
            lastDate = date;
          }
        }
      });

      participation[volunteer.id] = {
        total: volunteerAssignments.length,
        completed: volunteerAssignments.filter((a) => a.status === "completed").length,
        checkedIn: volunteerAssignments.filter((a) => a.status === "checked-in").length,
        pending: volunteerAssignments.filter((a) => !a.status || a.status === "pending").length,
        lastAssignmentDate: lastDate,
      };
    });

    return participation;
  }, [volunteers, assignments]);

  const inactiveVolunteers = useMemo(() => {
    const threshold = parseInt(daysThreshold) || 7;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - threshold);

    return volunteers.filter((volunteer) => {
      const participation = volunteerParticipation[volunteer.id];
      if (!participation || participation.total === 0) return true;
      if (!participation.lastAssignmentDate) return true;
      return participation.lastAssignmentDate < thresholdDate;
    });
  }, [volunteers, volunteerParticipation, daysThreshold]);

  const statusCounts = useMemo(() => {
    return {
      pending: assignments.filter((a) => !a.status || a.status === "pending").length,
      checkedIn: assignments.filter((a) => a.status === "checked-in").length,
      completed: assignments.filter((a) => a.status === "completed").length,
    };
  }, [assignments]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{assignments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{statusCounts.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Checked In</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{statusCounts.checkedIn}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{statusCounts.completed}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Inactive Volunteers</CardTitle>
          <CardDescription>
            Volunteers who haven&apos;t been assigned or checked in recently
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 items-center">
            <label className="text-sm">Show volunteers inactive for more than</label>
            <Input
              type="number"
              min="1"
              value={daysThreshold}
              onChange={(e) => setDaysThreshold(e.target.value)}
              className="w-20"
            />
            <label className="text-sm">days</label>
          </div>
          {inactiveVolunteers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>All volunteers have been active recently!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {inactiveVolunteers.map((volunteer) => {
                const participation = volunteerParticipation[volunteer.id];
                return (
                  <div key={volunteer.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{volunteer.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {participation.lastAssignmentDate
                          ? `Last active: ${participation.lastAssignmentDate.toLocaleDateString()}`
                          : "Never assigned"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{participation.total} total</Badge>
                      <Badge variant="secondary">{participation.completed} completed</Badge>
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
          <CardTitle className="text-lg">Assignment History by Day</CardTitle>
          <CardDescription>View assignments organized by day and track check-ins</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Select value={filterDay || undefined} onValueChange={(val) => setFilterDay(val || "")}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((day) => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTask || undefined} onValueChange={(val) => setFilterTask(val || "")}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by task" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>{task.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterVolunteer || undefined} onValueChange={(val) => setFilterVolunteer(val || "")}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by volunteer" />
              </SelectTrigger>
              <SelectContent>
                {volunteers.map((volunteer) => (
                  <SelectItem key={volunteer.id} value={volunteer.id}>{volunteer.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(filterDay || filterTask || filterVolunteer) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFilterDay("");
                setFilterTask("");
                setFilterVolunteer("");
              }}
            >
              Clear Filters
            </Button>
          )}

          {Object.keys(assignmentsByDay).length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No assignments found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(assignmentsByDay)
                .sort(([dayA], [dayB]) => {
                  const indexA = DAYS.indexOf(dayA);
                  const indexB = DAYS.indexOf(dayB);
                  if (indexA === -1) return 1;
                  if (indexB === -1) return -1;
                  return indexA - indexB;
                })
                .map(([day, dayAssignments]) => (
                  <Card key={day} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-primary" />
                          <CardTitle className="text-lg">{day}</CardTitle>
                        </div>
                        <Badge variant="secondary">{dayAssignments.length} assignments</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {dayAssignments.map((assignment) => {
                          const volunteer = volunteers.find((v) => v.id === assignment.volunteerId);
                          const task = tasks.find((t) => t.id === assignment.taskId);
                          const location = locations.find((l) => l.id === assignment.locationId);
                          const checkIn = volunteer?.checkIns?.find((ci) => ci.assignmentId === assignment.id);

                          return (
                            <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="font-medium text-sm">{volunteer?.name || "Unknown"}</div>
                                <div className="text-xs text-muted-foreground">
                                  {task?.name || "Unknown Task"}
                                  {location && ` • ${location.name}`}
                                  {assignment.shift && ` • ${assignment.shift}`}
                                </div>
                                {checkIn?.checkInTime && (
                                  <div className="text-xs text-green-600 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    Checked in: {checkIn.checkInTime.toDate().toLocaleTimeString()}
                                    {checkIn.checkOutTime && (
                                      <> • Checked out: {checkIn.checkOutTime.toDate().toLocaleTimeString()}</>
                                    )}
                                  </div>
                                )}
                              </div>
                              <Badge
                                variant={
                                  assignment.status === "completed"
                                    ? "default"
                                    : assignment.status === "checked-in"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {assignment.status || "pending"}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Volunteer Participation</CardTitle>
          <CardDescription>Overview of each volunteer&apos;s assignment and completion rate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {volunteers
              .filter((v) => volunteerParticipation[v.id]?.total > 0)
              .sort((a, b) => {
                const aParticipation = volunteerParticipation[a.id];
                const bParticipation = volunteerParticipation[b.id];
                return bParticipation.total - aParticipation.total;
              })
              .map((volunteer) => {
                const participation = volunteerParticipation[volunteer.id];
                const completionRate =
                  participation.total > 0
                    ? Math.round((participation.completed / participation.total) * 100)
                    : 0;

                return (
                  <div key={volunteer.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{volunteer.name}</div>
                        {participation.lastAssignmentDate && (
                          <div className="text-xs text-muted-foreground">
                            Last active: {participation.lastAssignmentDate.toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {completionRate}% complete
                      </Badge>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <Badge variant="secondary">{participation.total} total</Badge>
                      <Badge variant="default">{participation.completed} completed</Badge>
                      <Badge variant="outline">{participation.checkedIn} checked in</Badge>
                      <Badge variant="outline">{participation.pending} pending</Badge>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

