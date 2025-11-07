"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/auth-provider";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { LogOut, Users, AlertCircle, User, MapPin, UserPlus, Database, Trash2, AlertTriangle, History, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  getVolunteers,
  getLocations,
  getTasks,
  getAssignments,
  nukeAllData,
  nukeVolunteersAndAssignments,
  createLocation,
  generateUniqueCodesForExistingVolunteers,
  type Volunteer,
  type Location,
  type Task,
  type Assignment,
} from "@/lib/db";
import { populateJamatKhaneOptions } from "@/lib/seeder";
import { OverviewTab } from "@/components/dashboard/overview-tab";
import { LocationsTab } from "@/components/dashboard/locations-tab";
import { AssignmentsTab } from "@/components/dashboard/assignments-tab";
import { AssignedTab } from "@/components/dashboard/assigned-tab";
import { FormConfigTab } from "@/components/dashboard/form-config-tab";
import { HistoryTab } from "@/components/dashboard/history-tab";

type TabType = "overview" | "locations" | "assignments" | "assigned" | "history" | "form-config" | "dev";

const DAYS = ["Friday", "Saturday", "Sunday", "Monday", "Tuesday"];
const SHIFTS = ["12am-6am", "6am-12pm", "12pm-6pm", "6pm-12am"];

export default function DashboardPage() {
  const { user, isAdmin, isViewer, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSeedingHalls, setIsSeedingHalls] = useState(false);
  const [isNuking, setIsNuking] = useState(false);
  const [isPopulatingJamatOptions, setIsPopulatingJamatOptions] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && (isAdmin || isViewer)) {
      fetchAllData();
      
      const intervalId = setInterval(() => {
        fetchAllData();
      }, 5000);

      return () => clearInterval(intervalId);
    }
  }, [user, isAdmin, isViewer]);

  const fetchAllData = async () => {
    try {
      const [volunteersData, locationsData, tasksData, assignmentsData] = await Promise.all([
        getVolunteers(),
        getLocations(),
        getTasks(),
        getAssignments(),
      ]);
      setVolunteers(volunteersData);
      setLocations(locationsData);
      setTasks(tasksData);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Logout failed");
    }
  };

  const seedFakeData = async () => {
    if (isSeeding) return;

    setIsSeeding(true);
    toast.info("Seeding data...", {
      description: "Creating 100 fake volunteers. This may take a moment.",
    });

    const names = [
      "John Smith",
      "Jane Johnson",
      "Michael Williams",
      "Sarah Brown",
      "David Jones",
      "Emma Garcia",
      "Chris Miller",
      "Olivia Davis",
      "Ryan Rodriguez",
      "Sophia Martinez",
      "Daniel Hernandez",
      "Ava Lopez",
      "Matthew Gonzalez",
      "Isabella Wilson",
      "James Anderson",
      "Mia Thomas",
      "Robert Taylor",
      "Charlotte Moore",
      "William Jackson",
      "Amelia Martin",
      "Joseph Lee",
      "Harper Thompson",
      "Thomas White",
      "Evelyn Harris",
      "Charles Clark",
    ];

    try {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        const name = names[Math.floor(Math.random() * names.length)];
        const randomNum = Math.floor(Math.random() * 10000);
        const emailName = name.toLowerCase().replace(" ", ".");

        const shiftData: Record<string, string[]> = {};
        DAYS.forEach((day) => {
          const availableShifts: string[] = [];
          if (Math.random() > 0.3) {
            SHIFTS.forEach((shift) => {
              if (Math.random() > 0.5) {
                availableShifts.push(shift);
              }
            });
          }
          shiftData[day] = availableShifts;
        });

        const volunteer = {
          name,
          email: `${emailName}${randomNum}@example.com`,
          phone: `${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
          shifts: shiftData,
          submittedAt: Timestamp.fromDate(
            new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000))
          ),
        };

        promises.push(addDoc(collection(db, "volunteers"), volunteer));
      }

      await Promise.all(promises);
      await fetchAllData();

      toast.success("Success!", {
        description: "100 fake volunteers have been added to the database.",
      });
    } catch (error) {
      console.error("Error seeding data:", error);
      toast.error("Seeding failed", {
        description: "Failed to seed fake data. Check console for details.",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const seedHalls = async () => {
    if (isSeedingHalls) return;

    setIsSeedingHalls(true);
    toast.info("Seeding halls...", {
      description: "Creating Hall A through Hall D.",
    });

    try {
      const halls = ["Hall A", "Hall B", "Hall C", "Hall D"];
      const promises = halls.map((hall) =>
        createLocation({
          name: hall,
          description: `${hall} location`,
        })
      );

      await Promise.all(promises);
      await fetchAllData();

      toast.success("Success!", {
        description: "Hall A through Hall D have been created.",
      });
    } catch (error) {
      console.error("Error seeding halls:", error);
      toast.error("Seeding failed", {
        description: "Failed to seed halls. Check console for details.",
      });
    } finally {
      setIsSeedingHalls(false);
    }
  };

  const handleNukeAllData = async () => {
    if (isNuking) return;

    const confirmed = confirm(
      "⚠️ DANGER: This will permanently delete ALL volunteers, locations, tasks, and assignments from the database. This action CANNOT be undone. Are you absolutely sure?"
    );

    if (!confirmed) return;

    const doubleConfirmed = confirm(
      "This is your last chance. Type your confirmation by clicking OK to proceed with deleting ALL data."
    );

    if (!doubleConfirmed) return;

    setIsNuking(true);
    toast.info("Nuking database...", {
      description: "Deleting all data. Please wait.",
    });

    try {
      await nukeAllData();
      await fetchAllData();

      toast.success("Database nuked!", {
        description: "All data has been permanently deleted.",
      });
    } catch (error) {
      console.error("Error nuking data:", error);
      toast.error("Nuke failed", {
        description: "Failed to delete all data. Check console for details.",
      });
    } finally {
      setIsNuking(false);
    }
  };

  const handleNukeVolunteersOnly = async () => {
    if (isNuking) return;

    const confirmed = confirm(
      "⚠️ WARNING: This will permanently delete ALL volunteers and their assignments from the database. Locations and tasks will be preserved. This action CANNOT be undone. Are you sure?"
    );

    if (!confirmed) return;

    setIsNuking(true);
    toast.info("Nuking volunteers...", {
      description: "Deleting all volunteers and assignments. Please wait.",
    });

    try {
      await nukeVolunteersAndAssignments();
      await fetchAllData();

      toast.success("Volunteers nuked!", {
        description: "All volunteers and assignments have been deleted.",
      });
    } catch (error) {
      console.error("Error nuking volunteers:", error);
      toast.error("Nuke failed", {
        description: "Failed to delete volunteers. Check console for details.",
      });
    } finally {
      setIsNuking(false);
    }
  };

  const handlePopulateJamatOptions = async () => {
    if (isPopulatingJamatOptions) return;
    
    setIsPopulatingJamatOptions(true);
    toast.info("Adding Jamat Khane options...", {
      description: "Populating the jamat-khane question with locations.",
    });

    try {
      await populateJamatKhaneOptions();
      toast.success("Jamat Khane options added!", {
        description: "The jamat-khane question now has all Jamat locations.",
      });
    } catch (error) {
      console.error("Error populating jamat options:", error);
      toast.error("Failed to add options", {
        description: "Check console for details.",
      });
    } finally {
      setIsPopulatingJamatOptions(false);
    }
  };

  const handleMigrateRoles = async () => {
    if (isMigrating) return;

    const confirmed = confirm(
      "This will update all volunteers with no role or empty role to 'volunteer'. Continue?"
    );

    if (!confirmed) return;

    setIsMigrating(true);
    toast.info("Migrating roles...", {
      description: "Updating volunteer roles to new format.",
    });

    try {
      const { updateVolunteer } = await import("@/lib/db");
      let updated = 0;
      
      for (const volunteer of volunteers) {
        if (!volunteer.role) {
          await updateVolunteer(volunteer.id, { role: "volunteer" });
          updated++;
        }
      }
      
      await fetchAllData();

      toast.success("Migration complete!", {
        description: `Updated ${updated} volunteer role(s) to new format.`,
      });
    } catch (error) {
      console.error("Error migrating roles:", error);
      toast.error("Migration failed", {
        description: "Failed to migrate roles. Check console for details.",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleFixMondayMorningShift = async () => {
    if (isFixing) return;

    // First, let's see what we have for Monday Morning
    const mondayMorningAssignments = assignments.filter(
      (a) => a.day === "Monday" && a.shift === "Morning"
    );

    console.log("All Monday Morning assignments:", mondayMorningAssignments.length);
    console.log("Sample times:", mondayMorningAssignments.slice(0, 3).map(a => ({
      startTime: a.startTime,
      endTime: a.endTime
    })));

    // Try different time formats
    const targetAssignments = assignments.filter(
      (a) =>
        a.day === "Monday" &&
        a.shift === "Morning" &&
        (a.startTime === "06:00" || a.startTime === "6:00" || a.startTime === "06:00:00") &&
        (a.endTime === "08:00" || a.endTime === "8:00" || a.endTime === "08:00:00")
    );

    if (targetAssignments.length === 0) {
      toast.error("No matching assignments found", {
        description: `Found ${mondayMorningAssignments.length} Monday Morning shifts, but none match 6:00am - 8:00am. Check console for time formats.`,
      });
      return;
    }

    const uniqueTaskIds = new Set(targetAssignments.map((a) => a.taskId));
    const taskNames = Array.from(uniqueTaskIds)
      .map((taskId) => tasks.find((t) => t.id === taskId)?.name)
      .filter(Boolean)
      .join(", ");

    const confirmed = confirm(
      `Found ${targetAssignments.length} assignments to update:\n\n` +
      `Tasks: ${taskNames}\n` +
      `Current: Monday Morning 6:00am - 8:00am\n` +
      `New: Monday Morning 12:00am - 8:00am\n\n` +
      `Continue?`
    );

    if (!confirmed) return;

    setIsFixing(true);
    toast.info("Updating assignments...", {
      description: `Fixing ${targetAssignments.length} assignments`,
    });

    try {
      const { updateAssignment } = await import("@/lib/db");
      
      for (const assignment of targetAssignments) {
        await updateAssignment(assignment.id, {
          startTime: "00:00",
          endTime: "08:00",
        });
      }
      
      await fetchAllData();

      toast.success("Fix complete!", {
        description: `Updated ${targetAssignments.length} assignment(s) to 12:00am - 8:00am.`,
      });
    } catch (error) {
      console.error("Error fixing assignments:", error);
      toast.error("Fix failed", {
        description: "Failed to update assignments. Check console for details.",
      });
    } finally {
      setIsFixing(false);
    }
  };

  const handleSetViewer = async () => {
    const email = prompt("Enter the email address of the user to set as viewer:");
    if (!email) return;

    try {
      const { doc, getDoc, updateDoc, getDocs, query, collection, where, setDoc } = await import("firebase/firestore");
      
      // Find user by email in profiles collection
      const profilesQuery = query(collection(db, "profiles"), where("email", "==", email));
      const querySnapshot = await getDocs(profilesQuery);
      
      if (querySnapshot.empty) {
        // Check if volunteer exists with this email
        const volunteer = volunteers.find(v => v.email === email);
        
        if (!volunteer) {
          toast.error("User not found", {
            description: `No user or volunteer found with email: ${email}`,
          });
          return;
        }

        // Create profile for the volunteer
        const volunteersQuery = query(collection(db, "volunteers"), where("email", "==", email));
        const volunteerSnapshot = await getDocs(volunteersQuery);
        
        if (volunteerSnapshot.empty) {
          toast.error("Volunteer not found in database", {
            description: `Cannot create profile for: ${email}`,
          });
          return;
        }

        const volunteerId = volunteerSnapshot.docs[0].id;
        await setDoc(doc(db, "profiles", volunteerId), {
          email: volunteer.email,
          displayName: volunteer.name,
          admin: false,
          viewer: true,
          createdAt: new Date().toISOString(),
        });

        toast.success("Profile created and viewer access granted!", {
          description: `${email} can now view the dashboard (read-only)`,
        });
        return;
      }

      const userDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, "profiles", userDoc.id), {
        viewer: true,
        admin: false,
      });

      toast.success("Viewer access granted!", {
        description: `${email} can now view the dashboard (read-only)`,
      });
    } catch (error) {
      console.error("Error setting viewer:", error);
      toast.error("Failed to set viewer", {
        description: "Check console for details.",
      });
    }
  };

  const handleGenerateUniqueCodes = async () => {
    if (isMigrating) return;

    const confirmed = confirm(
      "Generate unique codes for all volunteers that don't have one yet. Continue?"
    );

    if (!confirmed) return;

    setIsMigrating(true);
    toast.info("Generating unique codes...", {
      description: "Creating codes for existing volunteers.",
    });

    try {
      const result = await generateUniqueCodesForExistingVolunteers();
      await fetchAllData();

      toast.success("Migration complete!", {
        description: `Generated ${result.success} codes, skipped ${result.skipped}, errors: ${result.errors}`,
      });
    } catch (error) {
      console.error("Error generating codes:", error);
      toast.error("Migration failed", {
        description: "Failed to generate unique codes. Check console for details.",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin && !isViewer) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Access Denied</h3>
                  <p className="text-sm">You don&apos;t have permission to access the admin dashboard.</p>
                </div>
                <Button onClick={handleLogout} variant="outline" size="sm" className="w-full">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <div className="gradient-blob-1" />
      <div className="gradient-blob-2" />
      <div className="gradient-blob-3" />
      
      <div className="gradient-content">
      <header className="border-b border-border gradient-header backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary via-primary to-chart-2 rounded-lg flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Volunteer Dashboard</h1>
                <p className="text-xs text-muted-foreground">
                  {isViewer ? "View Only Access" : "Admin Panel"}
                </p>
              </div>
              {isViewer && (
                <Badge variant="secondary" className="ml-3">
                  View Only
                </Badge>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.displayName || "Admin"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="border-b border-border bg-gradient-to-r from-background/30 via-primary/5 to-background/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "overview"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab("locations")}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "locations"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <MapPin className="w-4 h-4 inline mr-2" />
              Locations & Tasks
            </button>
            <button
              onClick={() => setActiveTab("assignments")}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "assignments"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Assignments
            </button>
            <button
              onClick={() => setActiveTab("assigned")}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "assigned"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Assigned ({assignments.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "history"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <History className="w-4 h-4 inline mr-2" />
              History
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab("form-config")}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "form-config"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Database className="w-4 h-4 inline mr-2" />
                Form Config
              </button>
            )}
            {process.env.NODE_ENV === "development" && isAdmin && (
              <button
                onClick={() => setActiveTab("dev")}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "dev"
                    ? "border-destructive text-destructive"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Database className="w-4 h-4 inline mr-2" />
                Dev Tools
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-8"
        >
          {activeTab === "overview" && (
            <OverviewTab
              volunteers={volunteers}
              locations={locations}
              tasks={tasks}
              assignments={assignments}
              onDataChange={fetchAllData}
              isReadOnly={isViewer}
            />
          )}

          {activeTab === "locations" && (
            <LocationsTab locations={locations} tasks={tasks} onDataChange={fetchAllData} isReadOnly={isViewer} />
          )}

          {activeTab === "assignments" && (
            <AssignmentsTab
              volunteers={volunteers}
              locations={locations}
              tasks={tasks}
              assignments={assignments}
              onDataChange={fetchAllData}
              isReadOnly={isViewer}
            />
          )}

          {activeTab === "assigned" && (
            <AssignedTab
              volunteers={volunteers}
              locations={locations}
              tasks={tasks}
              assignments={assignments}
              onDataChange={fetchAllData}
              isReadOnly={isViewer}
            />
          )}

          {activeTab === "history" && (
            <HistoryTab
              volunteers={volunteers}
              locations={locations}
              tasks={tasks}
              assignments={assignments}
            />
          )}

          {activeTab === "form-config" && (
            <FormConfigTab />
          )}

          {activeTab === "dev" && (
            <div className="space-y-6">
              <Card className="border-2 border-chart-3/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Developer Tools
                  </CardTitle>
                  <CardDescription>
                    Tools for testing and development. Only visible in development mode.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Seed Data</h3>
                    <p className="text-sm text-muted-foreground">
                      Generate fake data for testing purposes.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={seedFakeData}
                        disabled={isSeeding}
                        variant="outline"
                        className="gap-2"
                      >
                        <Database className="w-4 h-4" />
                        {isSeeding ? "Seeding..." : "Seed 100 Volunteers"}
                      </Button>
                      <Button
                        onClick={seedHalls}
                        disabled={isSeedingHalls}
                        variant="outline"
                        className="gap-2"
                      >
                        <MapPin className="w-4 h-4" />
                        {isSeedingHalls ? "Seeding..." : "Seed Hall A - D"}
                      </Button>
                    </div>
                  </div>

                  <div className="border-t pt-6 space-y-4">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-5 h-5" />
                      <h3 className="text-lg font-semibold">Danger Zone</h3>
                    </div>
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="ml-2">
                        <p className="font-semibold mb-1">Nuclear Option</p>
                        <p className="text-sm">
                          This will permanently delete ALL volunteers, locations, tasks, and assignments
                          from the database. Profile data will be preserved. This action cannot be undone.
                        </p>
                      </AlertDescription>
                    </Alert>
                    <Button
                      onClick={handleNukeAllData}
                      disabled={isNuking}
                      variant="destructive"
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isNuking ? "Nuking..." : "Nuke All Data"}
                    </Button>
                    <Button
                      onClick={handleNukeVolunteersOnly}
                      disabled={isNuking}
                      variant="destructive"
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isNuking ? "Nuking..." : "Nuke Volunteers Only"}
                    </Button>
                    <Button
                      onClick={handlePopulateJamatOptions}
                      disabled={isPopulatingJamatOptions}
                      variant="outline"
                      className="gap-2"
                    >
                      <MapPin className="w-4 h-4" />
                      {isPopulatingJamatOptions ? "Populating..." : "Populate Jamat Khane Options"}
                    </Button>
                  </div>

                  <div className="border-t pt-6 space-y-4">
                    <h3 className="text-lg font-semibold">Access Management</h3>
                    <p className="text-sm text-muted-foreground">
                      Grant or revoke dashboard access permissions.
                    </p>
                    <Button
                      onClick={handleSetViewer}
                      variant="outline"
                      className="gap-2"
                    >
                      <User className="w-4 h-4" />
                      Grant Viewer Access
                    </Button>
                  </div>

                  <div className="border-t pt-6 space-y-4">
                    <h3 className="text-lg font-semibold">Migrations</h3>
                    <p className="text-sm text-muted-foreground">
                      Run data migrations for existing volunteers.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={handleGenerateUniqueCodes}
                        disabled={isMigrating}
                        variant="outline"
                        className="gap-2"
                      >
                        <Database className="w-4 h-4" />
                        {isMigrating ? "Migrating..." : "Generate Unique Codes"}
                      </Button>
                      <Button
                        onClick={handleMigrateRoles}
                        disabled={isMigrating}
                        variant="outline"
                        className="gap-2"
                      >
                        <Users className="w-4 h-4" />
                        {isMigrating ? "Migrating..." : "Migrate Role Format"}
                      </Button>
                    </div>
                  </div>

                  <div className="border-t pt-6 space-y-4">
                    <h3 className="text-lg font-semibold">Quick Fixes</h3>
                    <p className="text-sm text-muted-foreground">
                      One-time fixes for specific data issues.
                    </p>
                    <Button
                      onClick={handleFixMondayMorningShift}
                      disabled={isFixing}
                      variant="outline"
                      className="gap-2"
                    >
                      <Clock className="w-4 h-4" />
                      {isFixing ? "Fixing..." : "Fix Monday Morning Shift (6am→12am)"}
                    </Button>
                  </div>

                  <div className="border-t pt-6 space-y-4">
                    <h3 className="text-lg font-semibold">Statistics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">Volunteers</p>
                        <p className="text-2xl font-bold">{volunteers.length}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">Locations</p>
                        <p className="text-2xl font-bold">{locations.length}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">Tasks</p>
                        <p className="text-2xl font-bold">{tasks.length}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">Assignments</p>
                        <p className="text-2xl font-bold">{assignments.length}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </main>
      </div>
    </div>
  );
}
