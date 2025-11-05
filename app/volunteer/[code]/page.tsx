"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Clock,
  MapPin,
  Calendar,
  User,
  AlertCircle,
  Loader2,
  Package,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  getVolunteerByCode,
  getAssignmentsByVolunteer,
  checkInVolunteer,
  checkOutVolunteer,
  getTasks,
  getLocations,
  type Volunteer,
  type Assignment,
  type Task,
  type Location,
  type CheckInRecord,
} from "@/lib/db";
import { formatTime } from "@/lib/utils";

export default function VolunteerPortalPage() {
  const params = useParams();
  const code = params.code as string;

  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  const loadVolunteerData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const vol = await getVolunteerByCode(code);
      if (!vol) {
        setError("Invalid volunteer code. Please check your link and try again.");
        return;
      }

      const [assignmentsData, tasksData, locationsData] = await Promise.all([
        getAssignmentsByVolunteer(vol.id),
        getTasks(),
        getLocations(),
      ]);

      setVolunteer(vol);
      setAssignments(assignmentsData);
      setTasks(tasksData);
      setLocations(locationsData);
    } catch (err) {
      console.error("Error loading volunteer data:", err);
      setError("Failed to load your information. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    loadVolunteerData();
  }, [loadVolunteerData]);

  const handleCheckIn = async (
    shiftKey: string,
    materialsIssued: { [key: string]: boolean }
  ) => {
    if (!volunteer) return;

    try {
      setCheckingIn(shiftKey);
      const shiftAssignments = assignments.filter(a => getShiftKey(a) === shiftKey);
      
      await Promise.all(
        shiftAssignments.map(assignment => 
          checkInVolunteer(assignment.id, volunteer.id, materialsIssued)
        )
      );
      
      await loadVolunteerData();
      toast.success(`Checked in to ${shiftAssignments.length} assignment(s)!`);
    } catch (err) {
      console.error("Error checking in:", err);
      toast.error("Failed to check in. Please try again.");
    } finally {
      setCheckingIn(null);
    }
  };

  const handleCheckOut = async (
    shiftKey: string,
    materialsReturned: { [key: string]: boolean }
  ) => {
    if (!volunteer) return;

    try {
      setCheckingIn(shiftKey);
      const shiftAssignments = assignments.filter(a => getShiftKey(a) === shiftKey);
      
      await Promise.all(
        shiftAssignments.map(assignment =>
          checkOutVolunteer(assignment.id, volunteer.id, materialsReturned)
        )
      );
      
      await loadVolunteerData();
      toast.success(`Checked out of ${shiftAssignments.length} assignment(s)!`);
    } catch (err) {
      console.error("Error checking out:", err);
      toast.error("Failed to check out. Please try again.");
    } finally {
      setCheckingIn(null);
    }
  };

  const getShiftKey = (assignment: Assignment): string => {
    if (assignment.startTime || assignment.endTime) {
      const timeStr = [assignment.startTime, assignment.endTime].filter(Boolean).join("-");
      return `${assignment.day || "no-day"}_${timeStr}`;
    }
    return `${assignment.day || "no-day"}_${assignment.shift || "no-shift"}`;
  };

  const getCheckInForAssignment = (assignmentId: string): CheckInRecord | undefined => {
    return volunteer?.checkIns?.find((ci) => ci.assignmentId === assignmentId);
  };

  const upcomingAssignments = assignments.filter(
    (a) => a.status === "pending" || a.status === "checked-in"
  );
  const completedAssignments = assignments.filter((a) => a.status === "completed");

  const groupAssignmentsByShift = (assignmentList: Assignment[]) => {
    const grouped = new Map<string, Assignment[]>();
    assignmentList.forEach(assignment => {
      const key = getShiftKey(assignment);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(assignment);
    });
    return grouped;
  };

  const upcomingShifts = groupAssignmentsByShift(upcomingAssignments);
  const completedShifts = groupAssignmentsByShift(completedAssignments);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your assignments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-6 h-6" />
              <CardTitle>Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20 shrink-0">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-2xl md:text-3xl truncate">{volunteer?.name}</CardTitle>
                  <CardDescription className="text-base mt-1 truncate">{volunteer?.email}</CardDescription>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Badge variant="secondary" className="text-sm whitespace-nowrap">
                  {assignments.length} {assignments.length === 1 ? "assignment" : "assignments"}
                </Badge>
                {upcomingAssignments.length > 0 && (
                  <Badge variant="default" className="text-sm whitespace-nowrap">
                    {upcomingAssignments.length} active
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {assignments.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-10 h-10 text-primary/50" />
              </div>
              <p className="text-xl font-semibold text-muted-foreground mb-2">No assignments yet</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                You&apos;ll see your shifts here when they&apos;re assigned by the organizers.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {upcomingShifts.size > 0 && (
              <Card>
                <CardHeader className="pb-4 bg-muted/30 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      <div>
                        <CardTitle className="text-xl">Upcoming & Active Shifts</CardTitle>
                        <CardDescription className="mt-1">
                          {upcomingShifts.size} shift{upcomingShifts.size !== 1 ? "s" : ""} to complete
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="default" className="text-sm">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {Array.from(upcomingShifts.entries()).map(([shiftKey, shiftAssignments]) => (
                    <ShiftCard
                      key={shiftKey}
                      shiftKey={shiftKey}
                      assignments={shiftAssignments}
                      volunteer={volunteer!}
                      tasks={tasks}
                      locations={locations}
                      checkIns={shiftAssignments.map(a => getCheckInForAssignment(a.id))}
                      onCheckIn={handleCheckIn}
                      onCheckOut={handleCheckOut}
                      isProcessing={checkingIn === shiftKey}
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            {completedShifts.size > 0 && (
              <Card>
                <CardHeader className="pb-4 bg-muted/30 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCheck className="w-5 h-5 text-green-600" />
                      <div>
                        <CardTitle className="text-xl">Completed Shifts</CardTitle>
                        <CardDescription className="mt-1">
                          {completedShifts.size} shift{completedShifts.size !== 1 ? "s" : ""} completed
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-sm">Completed</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {Array.from(completedShifts.entries()).map(([shiftKey, shiftAssignments]) => (
                    <ShiftCard
                      key={shiftKey}
                      shiftKey={shiftKey}
                      assignments={shiftAssignments}
                      volunteer={volunteer!}
                      tasks={tasks}
                      locations={locations}
                      checkIns={shiftAssignments.map(a => getCheckInForAssignment(a.id))}
                      onCheckIn={handleCheckIn}
                      onCheckOut={handleCheckOut}
                      isProcessing={false}
                      isCompleted
                    />
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ShiftCard({
  shiftKey,
  assignments,
  tasks,
  locations,
  checkIns,
  onCheckIn,
  onCheckOut,
  isProcessing,
  isCompleted = false,
}: {
  shiftKey: string;
  assignments: Assignment[];
  volunteer: Volunteer;
  tasks: Task[];
  locations: Location[];
  checkIns: (CheckInRecord | undefined)[];
  onCheckIn: (shiftKey: string, materials: { [key: string]: boolean }) => void;
  onCheckOut: (shiftKey: string, materials: { [key: string]: boolean }) => void;
  isProcessing: boolean;
  isCompleted?: boolean;
}) {
  const [materials, setMaterials] = useState<{ [key: string]: boolean }>({});

  const firstAssignment = assignments[0];
  const allCheckedIn = assignments.every(a => a.status === "checked-in" || a.status === "completed");
  const anyCheckedIn = assignments.some(a => a.status === "checked-in" || a.status === "completed");
  const hasCheckIn = checkIns.some(ci => !!ci?.checkInTime);
  const hasCheckOut = checkIns.every(ci => !!ci?.checkOutTime);

  const allMaterials = Array.from(
    new Set(
      assignments.flatMap(a => {
        const task = tasks.find(t => t.id === a.taskId);
        return task?.materials || [];
      })
    )
  );

  const getScheduleText = () => {
    if (firstAssignment.startTime || firstAssignment.endTime) {
      const timeStr = [firstAssignment.startTime, firstAssignment.endTime]
        .filter(Boolean)
        .map(t => formatTime(t))
        .join(" - ");
      if (firstAssignment.day) {
        return `${firstAssignment.day} • ${timeStr}`;
      }
      return timeStr;
    }
    if (firstAssignment.day && firstAssignment.shift) {
      return `${firstAssignment.day} • ${firstAssignment.shift}`;
    }
    return firstAssignment.day || firstAssignment.shift || "No schedule";
  };

  return (
    <div className={`border rounded-lg p-4 space-y-3 ${isCompleted ? "opacity-75" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-lg">{getScheduleText()}</h3>
          </div>
          
          <div className="space-y-1.5 pl-6">
            {assignments.map(assignment => {
              const task = tasks.find(t => t.id === assignment.taskId);
              const location = locations.find(l => l.id === assignment.locationId);
              return (
                <div key={assignment.id} className="text-sm">
                  <div className="font-medium">{task?.name || "Unknown Task"}</div>
                  {location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {location.name}
                    </div>
                  )}
                  {assignment.description && (
                    <p className="text-xs text-muted-foreground italic mt-0.5">{assignment.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <Badge variant={isCompleted ? "secondary" : anyCheckedIn ? "default" : "outline"}>
          {isCompleted ? "Completed" : anyCheckedIn ? "Checked In" : "Pending"}
        </Badge>
      </div>

      {hasCheckIn && (
        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-muted-foreground">
              Checked in: {checkIns.find(ci => ci?.checkInTime)?.checkInTime?.toDate().toLocaleString()}
            </span>
          </div>
          {checkIns.some(ci => ci?.materialsIssued && Object.keys(ci.materialsIssued).length > 0) && (
            <div className="ml-6 text-xs text-muted-foreground">
              Materials issued:{" "}
              {Array.from(new Set(
                checkIns.flatMap(ci => 
                  ci?.materialsIssued ? Object.entries(ci.materialsIssued)
                    .filter(([, value]) => value)
                    .map(([key]) => key) : []
                )
              )).join(", ") || "None"}
            </div>
          )}
        </div>
      )}

      {hasCheckOut && (
        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <span className="text-muted-foreground">
              Checked out: {checkIns.find(ci => ci?.checkOutTime)?.checkOutTime?.toDate().toLocaleString()}
            </span>
          </div>
          {checkIns.some(ci => ci?.materialsReturned && Object.keys(ci.materialsReturned).length > 0) && (
            <div className="ml-6 text-xs text-muted-foreground">
              Materials returned:{" "}
              {Array.from(new Set(
                checkIns.flatMap(ci => 
                  ci?.materialsReturned ? Object.entries(ci.materialsReturned)
                    .filter(([, value]) => value)
                    .map(([key]) => key) : []
                )
              )).join(", ") || "None"}
            </div>
          )}
        </div>
      )}

      {!isCompleted && (
        <>
          <Separator />
          {!hasCheckIn && (
            <div className="space-y-3">
              {allMaterials.length > 0 && (
                <div className="flex flex-wrap gap-4">
                  {allMaterials.map((material) => (
                    <div key={material} className="flex items-center gap-2">
                      <Checkbox
                        id={`material-${shiftKey}-${material}`}
                        checked={materials[material] || false}
                        onCheckedChange={(c) =>
                          setMaterials((prev) => ({ ...prev, [material]: !!c }))
                        }
                      />
                      <Label htmlFor={`material-${shiftKey}-${material}`} className="text-sm">
                        {material}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
              <Button
                onClick={() => onCheckIn(shiftKey, materials)}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking in...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Check In to Shift ({assignments.length} task{assignments.length !== 1 ? 's' : ''})
                  </>
                )}
              </Button>
            </div>
          )}

          {hasCheckIn && !hasCheckOut && (
            <div className="space-y-3">
              {allMaterials.length > 0 && (
                <div className="flex flex-wrap gap-4">
                  {allMaterials.map((material) => (
                    <div key={material} className="flex items-center gap-2">
                      <Checkbox
                        id={`material-return-${shiftKey}-${material}`}
                        checked={materials[material] || false}
                        onCheckedChange={(c) =>
                          setMaterials((prev) => ({ ...prev, [material]: !!c }))
                        }
                      />
                      <Label htmlFor={`material-return-${shiftKey}-${material}`} className="text-sm">
                        Return {material}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
              <Button
                onClick={() => onCheckOut(shiftKey, materials)}
                disabled={isProcessing}
                className="w-full"
                variant="outline"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking out...
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Check Out of Shift ({assignments.length} task{assignments.length !== 1 ? 's' : ''})
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

