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
import { Users } from "lucide-react";
import type { Volunteer, Location, Task, Assignment } from "@/lib/db";
import { getFormConfig, DEFAULT_FORM_CONFIG, type FormConfig } from "@/lib/config";

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

  const getTeamAllocation = () => {
    const allocation: { [key: string]: number } = {};
    formConfig.teams.forEach((team) => {
      allocation[team] = volunteers.filter((v) => v.team === team).length;
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

  const shiftAllocation = getShiftAllocation();
  const taskAllocation = getTaskAllocation();
  const teamAllocation = getTeamAllocation();
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formConfig.teams.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Configured teams</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Teams Distribution</CardTitle>
            <CardDescription>Volunteers per team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {formConfig.teams.map((team) => (
                <div key={team} className="p-3 rounded-lg border">
                  <div className="text-sm text-muted-foreground">{team}</div>
                  <div className="text-2xl font-bold mt-1">{teamAllocation[team] || 0}</div>
                </div>
              ))}
            </div>
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
                          <div className="font-semibold">{volunteer.name}</div>
                          <div className="text-sm text-muted-foreground">{volunteer.email} • {volunteer.phone}</div>
                          {volunteer.team && (
                            <div className="text-sm text-muted-foreground mt-1">
                              Team: <span className="font-medium">{volunteer.team}</span>
                            </div>
                          )}
                        </div>

                        {volunteer.experiences && volunteer.experiences.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {volunteer.experiences.map((exp) => {
                              const expLabel = formConfig.experiences.find(e => e.id === exp)?.label;
                              return expLabel ? <Badge key={exp} variant="outline" className="text-xs">{expLabel}</Badge> : null;
                            })}
                          </div>
                        )}

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
    </div>
  );
}

