"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/auth-provider";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, addDoc, Timestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { LogOut, Users, Calendar, Clock, AlertCircle, User, Copy, Check, Database } from "lucide-react";
import { toast } from "sonner";

interface VolunteerData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  shifts?: Record<string, string[]>;
  availability?: Record<string, string[]>;
  submittedAt: any;
}

export default function DashboardPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [volunteers, setVolunteers] = useState<VolunteerData[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Filtering state
  const [filterDay, setFilterDay] = useState<string>("");
  const [filterShift, setFilterShift] = useState<string>("");
  const [filterCount, setFilterCount] = useState<string>("");
  const [filteredVolunteers, setFilteredVolunteers] = useState<VolunteerData[]>([]);
  const [copied, setCopied] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchVolunteers();
    }
  }, [user, isAdmin]);

  const fetchVolunteers = async () => {
    try {
      const q = query(
        collection(db, "volunteers"),
        orderBy("submittedAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const data: VolunteerData[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as VolunteerData);
      });
      setVolunteers(data);
    } catch (error) {
      console.error("Error fetching volunteers:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out", {
        description: "You have been successfully logged out.",
      });
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Logout failed", {
        description: "Could not log out. Please try again.",
      });
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
  };

  const getTotalShifts = (volunteer: VolunteerData) => {
    const shiftData = volunteer.shifts || volunteer.availability || {};
    return Object.values(shiftData).reduce((acc, shifts) => acc + shifts.length, 0);
  };

  const handleFilter = () => {
    if (!filterDay || !filterShift) {
      setFilteredVolunteers([]);
      return;
    }

    const filtered = volunteers.filter((volunteer) => {
      const shiftData = volunteer.shifts || volunteer.availability || {};
      const dayShifts = shiftData[filterDay] || [];
      return dayShifts.includes(filterShift);
    });

    // Limit to specified count if provided
    const count = parseInt(filterCount);
    if (count && count > 0) {
      setFilteredVolunteers(filtered.slice(0, count));
    } else {
      setFilteredVolunteers(filtered);
    }
  };

  const clearFilter = () => {
    setFilterDay("");
    setFilterShift("");
    setFilterCount("");
    setFilteredVolunteers([]);
  };

  const displayVolunteers = filteredVolunteers.length > 0 ? filteredVolunteers : volunteers;

  const copyVolunteerNames = async () => {
    const names = displayVolunteers.map(v => `${v.firstName} ${v.lastName}`).join('\n');
    try {
      await navigator.clipboard.writeText(names);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied!", {
        description: `${displayVolunteers.length} volunteer name${displayVolunteers.length !== 1 ? 's' : ''} copied to clipboard.`,
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error("Failed to copy", {
        description: "Could not copy names to clipboard. Please try again.",
      });
    }
  };

  const seedFakeData = async () => {
    if (isSeeding) return;
    
    setIsSeeding(true);
    toast.info("Seeding data...", {
      description: "Creating 100 fake volunteers. This may take a moment.",
    });

    const firstNames = ["John", "Jane", "Michael", "Sarah", "David", "Emma", "Chris", "Olivia", "Ryan", "Sophia", "Daniel", "Ava", "Matthew", "Isabella", "James", "Mia", "Robert", "Charlotte", "William", "Amelia", "Joseph", "Harper", "Thomas", "Evelyn", "Charles"];
    const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris", "Clark"];
    const days = ["Friday", "Saturday", "Sunday", "Monday"];
    const shifts = ["Day Time", "Over Night"];

    try {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const randomNum = Math.floor(Math.random() * 10000);
        
        const shiftData: Record<string, string[]> = {};
        days.forEach(day => {
          const availableShifts: string[] = [];
          if (Math.random() > 0.3) {
            shifts.forEach(shift => {
              if (Math.random() > 0.5) {
                availableShifts.push(shift);
              }
            });
          }
          shiftData[day] = availableShifts;
        });

        const volunteer = {
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNum}@example.com`,
          phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
          shifts: shiftData,
          submittedAt: Timestamp.fromDate(new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000))),
        };

        promises.push(addDoc(collection(db, "volunteers"), volunteer));
      }

      await Promise.all(promises);
      await fetchVolunteers();
      
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

  if (loading || !user) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Check if user is admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md"
        >
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Access Denied</h3>
                  <p className="text-sm">
                    You don't have permission to access the admin dashboard.
                    Please contact an administrator.
                  </p>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
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
      {/* Header */}
      <header className="border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Volunteer Dashboard
                </h1>
                <p className="text-xs text-muted-foreground">
                  Manage volunteer submissions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {process.env.NODE_ENV === "development" && (
                <Button
                  onClick={seedFakeData}
                  disabled={isSeeding}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Database className="w-4 h-4" />
                  {isSeeding ? "Seeding..." : "Seed 100 Volunteers"}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                      <AvatarFallback className="bg-indigo-600 text-white">
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
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-8"
        >
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Volunteers
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {volunteers.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total registrations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Shifts
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {volunteers.reduce((acc, v) => acc + getTotalShifts(v), 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all volunteers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Latest Submission
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {volunteers.length > 0
                    ? volunteers[0].submittedAt?.toDate?.()?.toLocaleDateString() || "N/A"
                    : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Most recent registration
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filter Section */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Volunteers</CardTitle>
              <CardDescription>
                Find volunteers available for specific days and shifts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="volunteers-needed">Volunteers Needed</Label>
                  <Input
                    id="volunteers-needed"
                    type="number"
                    min="1"
                    placeholder="e.g., 5"
                    value={filterCount}
                    onChange={(e) => setFilterCount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="day">Day</Label>
                  <Select value={filterDay} onValueChange={setFilterDay}>
                    <SelectTrigger id="day">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Friday">Friday (Nov 7)</SelectItem>
                      <SelectItem value="Saturday">Saturday (Nov 8)</SelectItem>
                      <SelectItem value="Sunday">Sunday (Nov 9)</SelectItem>
                      <SelectItem value="Monday">Monday (Nov 10)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shift">Shift</Label>
                  <Select value={filterShift} onValueChange={setFilterShift}>
                    <SelectTrigger id="shift">
                      <SelectValue placeholder="Select shift" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Day Time">Day Time</SelectItem>
                      <SelectItem value="Over Night">Over Night</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="invisible">Actions</Label>
                  <div className="flex gap-2">
                    <Button onClick={handleFilter} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                      Filter
                    </Button>
                    {filteredVolunteers.length > 0 && (
                      <Button onClick={clearFilter} variant="outline">
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {filteredVolunteers.length > 0 && (
                <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                    Found {filteredVolunteers.length} volunteer{filteredVolunteers.length !== 1 ? "s" : ""} available for {filterShift} on {filterDay}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Volunteers Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {filteredVolunteers.length > 0 ? "Filtered Results" : "All Volunteers"}
                  </CardTitle>
                  <CardDescription>
                    {filteredVolunteers.length > 0 
                      ? `Showing ${filteredVolunteers.length} volunteer${filteredVolunteers.length !== 1 ? "s" : ""} matching your filter`
                      : "A list of all volunteer submissions with their availability"
                    }
                  </CardDescription>
                </div>
                {displayVolunteers.length > 0 && (
                  <Button
                    onClick={copyVolunteerNames}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Names
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading volunteers...
                </div>
              ) : displayVolunteers.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">No volunteers yet</p>
                  <p className="text-sm text-muted-foreground">
                    Submissions will appear here once volunteers sign up
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayVolunteers.map((volunteer, index) => {
                    const shiftData = volunteer.shifts || volunteer.availability || {};
                    const totalShifts = getTotalShifts(volunteer);
                    
                    return (
                      <motion.div
                        key={volunteer.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 rounded-lg border-2 border-border bg-background hover:border-indigo-600/50 hover:bg-accent/5 transition-all"
                      >
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                          {/* Volunteer Info */}
                          <div className="flex items-start space-x-3 flex-1">
                            <Avatar className="h-12 w-12 shrink-0">
                              <AvatarFallback className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-sm font-semibold">
                                {getInitials(volunteer.firstName, volunteer.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="font-semibold text-lg text-foreground">
                                {volunteer.firstName} {volunteer.lastName}
                              </div>
                              <div className="flex flex-col gap-1">
                                <div className="text-sm text-muted-foreground truncate">
                                  {volunteer.email}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {volunteer.phone}
                                </div>
                              </div>
                              <Badge 
                                variant={totalShifts > 0 ? "default" : "secondary"}
                                className={totalShifts > 0 ? "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 mt-2" : "mt-2"}
                              >
                                {totalShifts} {totalShifts === 1 ? "shift" : "shifts"}
                              </Badge>
                            </div>
                          </div>

                          {/* Availability */}
                          <div className="flex-1 space-y-2">
                            <div className="text-sm font-semibold text-foreground mb-2">Availability:</div>
                            {Object.keys(shiftData).length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {Object.entries(shiftData).map(
                                  ([day, shifts]) =>
                                    shifts.length > 0 && (
                                      <div
                                        key={day}
                                        className="text-sm p-2 rounded bg-muted/50"
                                      >
                                        <span className="font-medium text-foreground">
                                          {day}:
                                        </span>{" "}
                                        <span className="text-muted-foreground">
                                          {shifts.join(", ")}
                                        </span>
                                      </div>
                                    )
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                No shifts selected
                              </span>
                            )}
                          </div>

                          {/* Submitted Date */}
                          <div className="text-xs text-muted-foreground md:text-right">
                            Submitted: {volunteer.submittedAt?.toDate?.()?.toLocaleDateString() || "N/A"}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
