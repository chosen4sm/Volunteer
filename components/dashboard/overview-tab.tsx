"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface OverviewTabProps {
  volunteers: Volunteer[];
  locations: Location[];
  tasks: Task[];
  assignments: Assignment[];
}

const DAYS = ["Friday", "Saturday", "Sunday", "Monday"];
const SHIFTS = ["Day Time", "Over Night"];

export function OverviewTab({ volunteers, locations, tasks, assignments }: OverviewTabProps) {
  const [filterDay, setFilterDay] = useState<string>("");
  const [filterShift, setFilterShift] = useState<string>("");
  const [filterCount, setFilterCount] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
  };

  const getTotalShifts = (volunteer: Volunteer) => {
    const shiftData = volunteer.shifts || {};
    return Object.values(shiftData).reduce((acc, shifts) => acc + shifts.length, 0);
  };

  const filteredVolunteers = (() => {
    let filtered = volunteers.filter((volunteer) => {
      const matchesSearch = searchQuery
        ? `${volunteer.firstName} ${volunteer.lastName} ${volunteer.email} ${volunteer.phone}`
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

  const shiftAllocation = getShiftAllocation();
  const taskAllocation = getTaskAllocation();

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volunteers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {volunteers.length}
            </div>
            <p className="text-xs text-muted-foreground">Total registrations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {locations.length}
            </div>
            <p className="text-xs text-muted-foreground">{tasks.length} tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-2">
              {assignments.length}
            </div>
            <p className="text-xs text-muted-foreground">Volunteers assigned</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Availability by Shifts</CardTitle>
            <CardDescription>Volunteer count per day and shift</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {DAYS.map((day) => (
                <div key={day}>
                  <div className="text-sm font-semibold mb-2">{day}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {SHIFTS.map((shift) => (
                      <div key={shift} className="p-3 rounded-lg border bg-muted/50">
                        <div className="text-xs text-muted-foreground">{shift}</div>
                        <div className="text-lg font-bold text-foreground">
                          {shiftAllocation[day][shift]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Allocation by Tasks</CardTitle>
            <CardDescription>Volunteers assigned to each task</CardDescription>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks created yet</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => {
                  const location = locations.find((l) => l.id === task.locationId);
                  return (
                    <div key={task.id} className="p-3 rounded-lg border bg-muted/50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-medium">{task.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {location?.name || "Unknown location"}
                          </div>
                        </div>
                        <Badge variant="secondary">{taskAllocation[task.id] || 0}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Volunteers</CardTitle>
          <CardDescription>Find volunteers by availability or search</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="volunteers-needed">Number Needed</Label>
              <Input
                id="volunteers-needed"
                type="number"
                min="1"
                placeholder="e.g., 50"
                value={filterCount}
                onChange={(e) => setFilterCount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="day">Day</Label>
              <Select value={filterDay || undefined} onValueChange={(val) => setFilterDay(val)}>
                <SelectTrigger id="day">
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
              <Label htmlFor="shift">Shift</Label>
              <Select value={filterShift || undefined} onValueChange={(val) => setFilterShift(val)}>
                <SelectTrigger id="shift">
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
          <CardTitle>Volunteers ({filteredVolunteers.length})</CardTitle>
          <CardDescription>
            {filteredVolunteers.length !== volunteers.length
              ? `Showing ${filteredVolunteers.length} of ${volunteers.length} volunteers`
              : "All volunteer submissions"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredVolunteers.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No volunteers found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVolunteers.map((volunteer) => {
                const shiftData = volunteer.shifts || {};
                const totalShifts = getTotalShifts(volunteer);
                const volunteerAssignments = assignments.filter((a) => a.volunteerId === volunteer.id);

                return (
                  <div
                    key={volunteer.id}
                    className="p-4 rounded-lg border bg-background hover:border-primary/50 transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="flex items-start space-x-3 flex-1">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-accent text-accent-foreground text-sm font-semibold">
                            {getInitials(volunteer.firstName, volunteer.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="font-semibold text-foreground">
                            {volunteer.firstName} {volunteer.lastName}
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="text-sm text-muted-foreground truncate">
                              {volunteer.email}
                            </div>
                            <div className="text-sm text-muted-foreground">{volunteer.phone}</div>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="secondary">{totalShifts} shifts</Badge>
                            {volunteerAssignments.length > 0 && (
                              <Badge className="bg-chart-1 text-primary-foreground">
                                {volunteerAssignments.length} assigned
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="text-sm font-semibold">Availability:</div>
                        {Object.keys(shiftData).length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {Object.entries(shiftData).map(
                              ([day, shifts]) =>
                                shifts.length > 0 && (
                                  <div key={day} className="text-sm p-2 rounded bg-muted/50">
                                    <span className="font-medium">{day}:</span>{" "}
                                    <span className="text-muted-foreground">{shifts.join(", ")}</span>
                                  </div>
                                )
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No shifts selected</span>
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
    </>
  );
}

