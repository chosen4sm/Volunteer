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
import { Plus, Trash2, Edit, X } from "lucide-react";
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
        const updateData: { name: string; description: string; materials?: string[]; locationId?: string } = {
          name: taskName,
          description: taskDescription,
          materials: taskMaterialsList.length > 0 ? taskMaterialsList : undefined,
        };
        if (editingTask.locationId) {
          updateData.locationId = editingTask.locationId;
        }
        await updateTask(editingTask.id, updateData);
        toast.success("Task updated");
      } else {
        const createData: { name: string; description: string; materials?: string[] } = {
          name: taskName,
          description: taskDescription,
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
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Locations</CardTitle>
              <CardDescription>Manage volunteer locations (categories)</CardDescription>
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
                  Add Location
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingLocation ? "Edit Location" : "Create Location"}</DialogTitle>
                  <DialogDescription>Add a new location category for volunteers</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="location-name">Name</Label>
                    <Input
                      id="location-name"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="e.g., Main Hall"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location-desc">Description (optional)</Label>
                    <Input
                      id="location-desc"
                      value={locationDescription}
                      onChange={(e) => setLocationDescription(e.target.value)}
                      placeholder="e.g., Main event area"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location-address">Address (optional)</Label>
                    <Input
                      id="location-address"
                      value={locationAddress}
                      onChange={(e) => setLocationAddress(e.target.value)}
                      placeholder="e.g., 123 Main St, City, State"
                    />
                  </div>
                  <Button onClick={handleCreateLocation} className="w-full">
                    {editingLocation ? "Update" : "Create"} Location
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No locations yet</p>
          ) : (
            <div className="space-y-2">
              {locations.map((location) => (
                <div
                  key={location.id}
                  className="p-3 rounded-lg border bg-muted/50 flex items-start justify-between"
                >
                  <div>
                    <div className="font-medium">{location.name}</div>
                    {location.description && (
                      <div className="text-sm text-muted-foreground">{location.description}</div>
                    )}
                    {location.address && (
                      <div className="text-sm text-muted-foreground mt-1">{location.address}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {tasks.filter((t) => t.locationId === location.id).length} tasks
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => openEditLocationDialog(location)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteLocation(location.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>Manage tasks within locations</CardDescription>
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
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTask ? "Edit Task" : "Create Task"}</DialogTitle>
                  <DialogDescription>Create a task and optionally link it to a location</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="task-name">Task Name</Label>
                    <Input
                      id="task-name"
                      value={taskName}
                      onChange={(e) => setTaskName(e.target.value)}
                      placeholder="e.g., Setup"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-desc">Description (optional)</Label>
                    <Input
                      id="task-desc"
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      placeholder="e.g., Set up chairs and tables"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-materials">Materials (optional)</Label>
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
                  <Button onClick={handleCreateTask} className="w-full">
                    {editingTask ? "Update" : "Create"} Task
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const location = locations.find((l) => l.id === task.locationId);
                return (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg border bg-muted/50 flex items-start justify-between"
                  >
                    <div>
                      <div className="font-medium">{task.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {location?.name || "No location assigned"}
                      </div>
                      {task.description && (
                        <div className="text-sm text-muted-foreground mt-1">{task.description}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEditTaskDialog(task)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteTask(task.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
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

