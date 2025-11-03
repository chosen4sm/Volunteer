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
    materialsIssued: { gloves: boolean; glasses: boolean }
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
    materialsReturned: { gloves: boolean; glasses: boolean }
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
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="w-8 h-8 text-primary" />
              <div>
                <CardTitle className="text-2xl">{volunteer?.name}</CardTitle>
                <CardDescription>{volunteer?.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {assignments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No assignments yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                You&apos;ll see your shifts here when they&apos;re assigned.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {upcomingAssignments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Upcoming & Active Shifts</CardTitle>
                  <CardDescription>
                    {upcomingAssignments.length} assignment{upcomingAssignments.length !== 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                <CardHeader>
                  <CardTitle className="text-xl">Completed Shifts</CardTitle>
                  <CardDescription>
                    {completedAssignments.length} completed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
          {(assignment.day || assignment.shift) && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {assignment.day && assignment.shift
                ? `${assignment.day} • ${assignment.shift}`
                : assignment.day || assignment.shift}
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

