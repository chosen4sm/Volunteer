"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
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
import { LogOut, Users, AlertCircle, User, MapPin, UserPlus, Database, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  getVolunteers,
  getLocations,
  getTasks,
  getAssignments,
  nukeAllData,
  type Volunteer,
  type Location,
  type Task,
  type Assignment,
} from "@/lib/db";
import { OverviewTab } from "@/components/dashboard/overview-tab";
import { LocationsTab } from "@/components/dashboard/locations-tab";
import { AssignmentsTab } from "@/components/dashboard/assignments-tab";

type TabType = "overview" | "locations" | "assignments" | "dev";

const DAYS = ["Friday", "Saturday", "Sunday", "Monday"];
const SHIFTS = ["12am-6am", "6am-12pm", "12pm-6pm", "6pm-12am"];

export default function DashboardPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isNuking, setIsNuking] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchAllData();
    }
  }, [user, isAdmin]);

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

    const firstNames = [
      "John",
      "Jane",
      "Michael",
      "Sarah",
      "David",
      "Emma",
      "Chris",
      "Olivia",
      "Ryan",
      "Sophia",
      "Daniel",
      "Ava",
      "Matthew",
      "Isabella",
      "James",
      "Mia",
      "Robert",
      "Charlotte",
      "William",
      "Amelia",
      "Joseph",
      "Harper",
      "Thomas",
      "Evelyn",
      "Charles",
    ];
    const lastNames = [
      "Smith",
      "Johnson",
      "Williams",
      "Brown",
      "Jones",
      "Garcia",
      "Miller",
      "Davis",
      "Rodriguez",
      "Martinez",
      "Hernandez",
      "Lopez",
      "Gonzalez",
      "Wilson",
      "Anderson",
      "Thomas",
      "Taylor",
      "Moore",
      "Jackson",
      "Martin",
      "Lee",
      "Thompson",
      "White",
      "Harris",
      "Clark",
    ];

    try {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const randomNum = Math.floor(Math.random() * 10000);

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

        const allTeams = ["IV", "PMP"];
        const teamData = allTeams[Math.floor(Math.random() * allTeams.length)];

        const volunteer = {
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNum}@example.com`,
          phone: `${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
          team: teamData,
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

  if (loading || !user) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
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
      <header className="border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Volunteer Dashboard</h1>
                <p className="text-xs text-muted-foreground">Admin Panel</p>
              </div>
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

      <div className="border-b border-border bg-background/30">
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
            {process.env.NODE_ENV === "development" && (
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
            />
          )}

          {activeTab === "locations" && (
            <LocationsTab locations={locations} tasks={tasks} onDataChange={fetchAllData} />
          )}

          {activeTab === "assignments" && (
            <AssignmentsTab
              volunteers={volunteers}
              locations={locations}
              tasks={tasks}
              assignments={assignments}
              onDataChange={fetchAllData}
            />
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
                      Generate fake volunteers for testing purposes.
                    </p>
                    <Button
                      onClick={seedFakeData}
                      disabled={isSeeding}
                      variant="outline"
                      className="gap-2"
                    >
                      <Database className="w-4 h-4" />
                      {isSeeding ? "Seeding..." : "Seed 100 Volunteers"}
                    </Button>
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
  );
}
