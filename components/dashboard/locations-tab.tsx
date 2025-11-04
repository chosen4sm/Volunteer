"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Edit, X, MapPin, ListTodo, Package, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  createLocation,
  updateLocation,
  deleteLocation,
  createTask,
  updateTask,
  deleteTask,
  type Location,
  type Task,
} from "@/lib/db";

interface LocationsTabProps {
  locations: Location[];
  tasks: Task[];
  onDataChange: () => void;
}

export function LocationsTab({ locations, tasks, onDataChange }: LocationsTabProps) {
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [locationName, setLocationName] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskMaterials, setTaskMaterials] = useState("");
  const [taskMaterialsList, setTaskMaterialsList] = useState<string[]>([]);

  const handleCreateLocation = async () => {
    if (!locationName.trim()) {
      toast.error("Please enter a location name");
      return;
    }
    try {
      if (editingLocation) {
        await updateLocation(editingLocation.id, {
          name: locationName,
          description: locationDescription,
          address: locationAddress,
        });
        toast.success("Location updated");
      } else {
        await createLocation({
          name: locationName,
          description: locationDescription,
          address: locationAddress,
        });
        toast.success("Location created");
      }
      setLocationDialogOpen(false);
      setLocationName("");
      setLocationDescription("");
      setLocationAddress("");
      setEditingLocation(null);
      onDataChange();
    } catch (error) {
      console.error("Error saving location:", error);
      toast.error("Failed to save location");
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this location?")) return;
    try {
      await deleteLocation(id);
      toast.success("Location deleted");
      onDataChange();
    } catch (error) {
      console.error("Error deleting location:", error);
      toast.error("Failed to delete location");
    }
  };

  const handleCreateTask = async () => {
    if (!taskName.trim()) {
      toast.error("Please enter a task name");
      return;
    }
    try {
      if (editingTask) {
        const updateData: { name: string; description?: string; materials?: string[]; locationId?: string } = {
          name: taskName,
          description: taskDescription.trim() || undefined,
          materials: taskMaterialsList.length > 0 ? taskMaterialsList : undefined,
        };
        if (editingTask.locationId) {
          updateData.locationId = editingTask.locationId;
        }
        await updateTask(editingTask.id, updateData);
        toast.success("Task updated");
      } else {
        const createData: { name: string; description?: string; materials?: string[] } = {
          name: taskName,
          description: taskDescription.trim() || undefined,
          materials: taskMaterialsList.length > 0 ? taskMaterialsList : undefined,
        };
        await createTask(createData);
        toast.success("Task created");
      }
      setTaskDialogOpen(false);
      setTaskName("");
      setTaskDescription("");
      setTaskMaterials("");
      setTaskMaterialsList([]);
      setEditingTask(null);
      onDataChange();
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error("Failed to save task");
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask(id);
      toast.success("Task deleted");
      onDataChange();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  const openEditLocationDialog = (location: Location) => {
    setEditingLocation(location);
    setLocationName(location.name);
    setLocationDescription(location.description || "");
    setLocationAddress(location.address || "");
    setLocationDialogOpen(true);
  };

  const openEditTaskDialog = (task: Task) => {
    setEditingTask(task);
    setTaskName(task.name);
    setTaskDescription(task.description || "");
    setTaskMaterialsList(task.materials || []);
    setTaskMaterials("");
    setTaskDialogOpen(true);
  };

  const addMaterial = () => {
    const material = taskMaterials.trim();
    if (material && !taskMaterialsList.includes(material)) {
      setTaskMaterialsList([...taskMaterialsList, material]);
      setTaskMaterials("");
    }
  };

  const removeMaterial = (material: string) => {
    setTaskMaterialsList(taskMaterialsList.filter(m => m !== material));
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:border-primary/50 transition hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Locations</CardTitle>
              <MapPin className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{locations.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Categories for tasks</p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
              <ListTodo className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Available for assignment</p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition hover:shadow-md">
          <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">With Materials</CardTitle>
              <Package className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {tasks.filter(t => t.materials && t.materials.length > 0).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Tasks with materials</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-4 bg-muted/30 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Locations</CardTitle>
                  <CardDescription>Manage volunteer location categories</CardDescription>
                </div>
            </div>
            <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingLocation(null);
                    setLocationName("");
                    setLocationDescription("");
                    setLocationAddress("");
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                    Add
                </Button>
              </DialogTrigger>
                <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingLocation ? "Edit Location" : "Create Location"}</DialogTitle>
                  <DialogDescription>Add a new location category for volunteers</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                      <Label htmlFor="location-name">Name *</Label>
                    <Input
                      id="location-name"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="e.g., Main Hall"
                    />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="location-desc">Description</Label>
                    <Input
                      id="location-desc"
                      value={locationDescription}
                      onChange={(e) => setLocationDescription(e.target.value)}
                      placeholder="e.g., Main event area"
                    />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="location-address">Address</Label>
                    <Input
                      id="location-address"
                      value={locationAddress}
                      onChange={(e) => setLocationAddress(e.target.value)}
                      placeholder="e.g., 123 Main St, City, State"
                    />
                  </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={() => setLocationDialogOpen(false)} className="flex-1">
                        Cancel
                      </Button>
                      <Button onClick={handleCreateLocation} className="flex-1">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {editingLocation ? "Update" : "Create"}
                  </Button>
                    </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
          <CardContent className="pt-4">
          {locations.length === 0 ? (
              <div className="py-12 text-center">
                <MapPin className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-muted-foreground">No locations yet</p>
                <p className="text-sm text-muted-foreground mt-1">Create your first location category</p>
              </div>
          ) : (
              <div className="space-y-3">
                {locations.map((location) => {
                  const locationTasks = tasks.filter((t) => t.locationId === location.id);
                  return (
                <div
                  key={location.id}
                      className="p-4 rounded-lg border hover:border-primary/50 transition hover:shadow-sm bg-card"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-primary shrink-0" />
                            <div className="font-semibold text-base">{location.name}</div>
                            <Badge variant="secondary" className="text-xs">
                              {locationTasks.length} {locationTasks.length === 1 ? 'task' : 'tasks'}
                            </Badge>
                          </div>
                    {location.description && (
                            <p className="text-sm text-muted-foreground mb-1 ml-6">{location.description}</p>
                    )}
                    {location.address && (
                            <p className="text-xs text-muted-foreground ml-6">📍 {location.address}</p>
                    )}
                    </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => openEditLocationDialog(location)} className="h-8 w-8 p-0">
                      <Edit className="w-4 h-4" />
                    </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteLocation(location.id)} className="h-8 w-8 p-0">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
          <CardHeader className="pb-4 bg-muted/30 border-b">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-primary" />
            <div>
                  <CardTitle className="text-lg">Tasks</CardTitle>
              <CardDescription>Manage tasks within locations</CardDescription>
                </div>
            </div>
            <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingTask(null);
                    setTaskName("");
                    setTaskDescription("");
                    setTaskMaterials("");
                    setTaskMaterialsList([]);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                    Add
                </Button>
              </DialogTrigger>
                <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingTask ? "Edit Task" : "Create Task"}</DialogTitle>
                  <DialogDescription>Create a task and optionally link it to a location</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                      <Label htmlFor="task-name">Task Name *</Label>
                    <Input
                      id="task-name"
                      value={taskName}
                      onChange={(e) => setTaskName(e.target.value)}
                      placeholder="e.g., Setup"
                    />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="task-desc">Description</Label>
                    <Input
                      id="task-desc"
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      placeholder="e.g., Set up chairs and tables"
                    />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="task-materials">Materials</Label>
                    <div className="flex gap-2">
                      <Input
                        id="task-materials"
                        value={taskMaterials}
                        onChange={(e) => setTaskMaterials(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addMaterial();
                          }
                        }}
                        placeholder="e.g., Gloves, Hard Hat"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addMaterial}
                        disabled={!taskMaterials.trim()}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {taskMaterialsList.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {taskMaterialsList.map((material) => (
                          <Badge key={material} variant="secondary" className="gap-1">
                              <Package className="w-3 h-3" />
                            {material}
                            <button
                              type="button"
                              onClick={() => removeMaterial(material)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={() => setTaskDialogOpen(false)} className="flex-1">
                        Cancel
                      </Button>
                      <Button onClick={handleCreateTask} className="flex-1">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {editingTask ? "Update" : "Create"}
                  </Button>
                    </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
          <CardContent className="pt-4">
          {tasks.length === 0 ? (
              <div className="py-12 text-center">
                <ListTodo className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-muted-foreground">No tasks yet</p>
                <p className="text-sm text-muted-foreground mt-1">Create your first task</p>
              </div>
          ) : (
              <div className="space-y-3">
              {tasks.map((task) => {
                const location = locations.find((l) => l.id === task.locationId);
                return (
                  <div
                    key={task.id}
                      className="p-4 rounded-lg border hover:border-primary/50 transition hover:shadow-sm bg-card"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <ListTodo className="w-4 h-4 text-primary shrink-0" />
                            <div className="font-semibold text-base">{task.name}</div>
                          </div>
                          <div className="ml-6 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                        {location?.name || "No location assigned"}
                              </span>
                      </div>
                      {task.description && (
                              <p className="text-sm text-muted-foreground">{task.description}</p>
                            )}
                            {task.materials && task.materials.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {task.materials.map((material) => (
                                  <Badge key={material} variant="outline" className="text-xs">
                                    <Package className="w-3 h-3 mr-1" />
                                    {material}
                                  </Badge>
                                ))}
                              </div>
                      )}
                    </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => openEditTaskDialog(task)} className="h-8 w-8 p-0">
                        <Edit className="w-4 h-4" />
                      </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteTask(task.id)} className="h-8 w-8 p-0">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
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
    </div>
  );
}

