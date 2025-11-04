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
    assignmentId: string,
    materialsIssued: { [key: string]: boolean }
  ) => {
    if (!volunteer) return;

    try {
      setCheckingIn(assignmentId);
      await checkInVolunteer(assignmentId, volunteer.id, materialsIssued);
      await loadVolunteerData();
      toast.success("Checked in successfully!");
    } catch (err) {
      console.error("Error checking in:", err);
      toast.error("Failed to check in. Please try again.");
    } finally {
      setCheckingIn(null);
    }
  };

  const handleCheckOut = async (
    assignmentId: string,
    materialsReturned: { [key: string]: boolean }
  ) => {
    if (!volunteer) return;

    try {
      setCheckingIn(assignmentId);
      await checkOutVolunteer(assignmentId, volunteer.id, materialsReturned);
      await loadVolunteerData();
      toast.success("Checked out successfully!");
    } catch (err) {
      console.error("Error checking out:", err);
      toast.error("Failed to check out. Please try again.");
    } finally {
      setCheckingIn(null);
    }
  };

  const getCheckInForAssignment = (assignmentId: string): CheckInRecord | undefined => {
    return volunteer?.checkIns?.find((ci) => ci.assignmentId === assignmentId);
  };

  const upcomingAssignments = assignments.filter(
    (a) => a.status === "pending" || a.status === "checked-in"
  );
  const completedAssignments = assignments.filter((a) => a.status === "completed");

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
            {upcomingAssignments.length > 0 && (
              <Card>
                <CardHeader className="pb-4 bg-muted/30 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      <div>
                        <CardTitle className="text-xl">Upcoming & Active Shifts</CardTitle>
                        <CardDescription className="mt-1">
                          {upcomingAssignments.length} assignment{upcomingAssignments.length !== 1 ? "s" : ""} to complete
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="default" className="text-sm">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {upcomingAssignments.map((assignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      volunteer={volunteer!}
                      task={tasks.find((t) => t.id === assignment.taskId)}
                      location={locations.find((l) => l.id === assignment.locationId)}
                      checkIn={getCheckInForAssignment(assignment.id)}
                      onCheckIn={handleCheckIn}
                      onCheckOut={handleCheckOut}
                      isProcessing={checkingIn === assignment.id}
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            {completedAssignments.length > 0 && (
              <Card>
                <CardHeader className="pb-4 bg-muted/30 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCheck className="w-5 h-5 text-green-600" />
                      <div>
                        <CardTitle className="text-xl">Completed Shifts</CardTitle>
                        <CardDescription className="mt-1">
                          {completedAssignments.length} assignment{completedAssignments.length !== 1 ? "s" : ""} completed
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-sm">Completed</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {completedAssignments.map((assignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      volunteer={volunteer!}
                      task={tasks.find((t) => t.id === assignment.taskId)}
                      location={locations.find((l) => l.id === assignment.locationId)}
                      checkIn={getCheckInForAssignment(assignment.id)}
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

function AssignmentCard({
  assignment,
  task,
  location,
  checkIn,
  onCheckIn,
  onCheckOut,
  isProcessing,
  isCompleted = false,
}: {
  assignment: Assignment;
  volunteer: Volunteer;
  task?: Task;
  location?: Location;
  checkIn?: CheckInRecord;
  onCheckIn: (assignmentId: string, materials: { [key: string]: boolean }) => void;
  onCheckOut: (assignmentId: string, materials: { [key: string]: boolean }) => void;
  isProcessing: boolean;
  isCompleted?: boolean;
}) {
  const [materials, setMaterials] = useState<{ [key: string]: boolean }>({});

  const taskMaterials = task?.materials || [];
  const isCheckedIn = assignment.status === "checked-in";
  const hasCheckIn = !!checkIn?.checkInTime;
  const hasCheckOut = !!checkIn?.checkOutTime;

  return (
    <div className={`border rounded-lg p-4 space-y-3 ${isCompleted ? "opacity-75" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <h3 className="font-semibold text-lg">{task?.name || "Unknown Task"}</h3>
          {location && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              {location.name}
            </div>
          )}
          {(assignment.day || assignment.shift || assignment.startTime || assignment.endTime) && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {assignment.startTime || assignment.endTime ? (
                <>
                  {assignment.day && <span>{assignment.day} • </span>}
                  {assignment.startTime && <span>{assignment.startTime}</span>}
                  {assignment.startTime && assignment.endTime && <span> - </span>}
                  {assignment.endTime && <span>{assignment.endTime}</span>}
                </>
              ) : (
                <>
                  {assignment.day && assignment.shift
                    ? `${assignment.day} • ${assignment.shift}`
                    : assignment.day || assignment.shift}
                </>
              )}
            </div>
          )}
          {assignment.description && (
            <p className="text-sm text-muted-foreground">{assignment.description}</p>
          )}
        </div>
        <Badge variant={isCompleted ? "secondary" : isCheckedIn ? "default" : "outline"}>
          {isCompleted ? "Completed" : isCheckedIn ? "Checked In" : "Pending"}
        </Badge>
      </div>

      {hasCheckIn && (
        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-muted-foreground">
              Checked in: {checkIn.checkInTime?.toDate().toLocaleString()}
            </span>
          </div>
          {checkIn.materialsIssued && Object.keys(checkIn.materialsIssued).length > 0 && (
            <div className="ml-6 text-xs text-muted-foreground">
              Materials issued:{" "}
              {Object.entries(checkIn.materialsIssued)
                .filter(([, value]) => value)
                .map(([key]) => key)
                .join(", ") || "None"}
            </div>
          )}
        </div>
      )}

      {hasCheckOut && (
        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <span className="text-muted-foreground">
              Checked out: {checkIn.checkOutTime?.toDate().toLocaleString()}
            </span>
          </div>
          {checkIn.materialsReturned && Object.keys(checkIn.materialsReturned).length > 0 && (
            <div className="ml-6 text-xs text-muted-foreground">
              Materials returned:{" "}
              {Object.entries(checkIn.materialsReturned)
                .filter(([, value]) => value)
                .map(([key]) => key)
                .join(", ") || "None"}
            </div>
          )}
        </div>
      )}

      {!isCompleted && (
        <>
          <Separator />
          {!hasCheckIn && (
            <div className="space-y-3">
              {taskMaterials.length > 0 && (
                <div className="flex flex-wrap gap-4">
                  {taskMaterials.map((material) => (
                    <div key={material} className="flex items-center gap-2">
                      <Checkbox
                        id={`material-${assignment.id}-${material}`}
                        checked={materials[material] || false}
                        onCheckedChange={(c) =>
                          setMaterials((prev) => ({ ...prev, [material]: !!c }))
                        }
                      />
                      <Label htmlFor={`material-${assignment.id}-${material}`} className="text-sm">
                        {material}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
              <Button
                onClick={() => onCheckIn(assignment.id, materials)}
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
                    Check In
                  </>
                )}
              </Button>
            </div>
          )}

          {hasCheckIn && !hasCheckOut && (
            <div className="space-y-3">
              {taskMaterials.length > 0 && (
                <div className="flex flex-wrap gap-4">
                  {taskMaterials.map((material) => (
                    <div key={material} className="flex items-center gap-2">
                      <Checkbox
                        id={`material-return-${assignment.id}-${material}`}
                        checked={materials[material] || false}
                        onCheckedChange={(c) =>
                          setMaterials((prev) => ({ ...prev, [material]: !!c }))
                        }
                      />
                      <Label htmlFor={`material-return-${assignment.id}-${material}`} className="text-sm">
                        Return {material}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
              <Button
                onClick={() => onCheckOut(assignment.id, materials)}
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
                    Check Out
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

