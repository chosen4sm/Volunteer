"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings, Plus, Trash2, Database, AlertTriangle, Check, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { getFormConfig, invalidateConfigCache, type FormConfig, type FormQuestion } from "@/lib/config";
import { seedFormConfig, updateFormConfig } from "@/lib/seeder";

const QUESTION_TYPES = ["text", "tel", "email", "select", "checkbox-multi", "shifts"] as const;

export function FormConfigTab() {
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [editedConfig, setEditedConfig] = useState<FormConfig | null>(null);
  const [activeTab, setActiveTab] = useState("teams");

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const fetchedConfig = await getFormConfig();
      setConfig(fetchedConfig);
      setEditedConfig(JSON.parse(JSON.stringify(fetchedConfig)));
    } catch (error) {
      console.error("Error fetching config:", error);
      toast.error("Failed to fetch configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedConfig = async () => {
    if (isSeeding) return;

    setIsSeeding(true);
    try {
      await seedFormConfig();
      invalidateConfigCache();
      await fetchConfig();
      toast.success("Config seeded!", {
        description: "Form configuration has been initialized in Firebase.",
      });
    } catch (error) {
      console.error("Error seeding config:", error);
      toast.error("Failed to seed config");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!editedConfig || isSaving) return;

    setIsSaving(true);
    try {
      await updateFormConfig(editedConfig);
      invalidateConfigCache();
      setConfig(JSON.parse(JSON.stringify(editedConfig)));
      toast.success("Config updated!", {
        description: "Form configuration has been saved to Firebase.",
      });
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Failed to save config");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetChanges = () => {
    if (config) {
      setEditedConfig(JSON.parse(JSON.stringify(config)));
      toast.info("Changes discarded");
    }
  };

  const addTeam = (newTeam: string) => {
    if (!editedConfig || !newTeam.trim()) return;
    if (editedConfig.teams.includes(newTeam)) {
      toast.error("Team already exists");
      return;
    }
    setEditedConfig({
      ...editedConfig,
      teams: [...editedConfig.teams, newTeam],
    });
  };

  const removeTeam = (team: string) => {
    if (!editedConfig) return;
    setEditedConfig({
      ...editedConfig,
      teams: editedConfig.teams.filter((t) => t !== team),
    });
  };

  const addExperience = (id: string, label: string) => {
    if (!editedConfig || !id.trim() || !label.trim()) return;
    if (editedConfig.experiences.some((e) => e.id === id)) {
      toast.error("Experience ID already exists");
      return;
    }
    setEditedConfig({
      ...editedConfig,
      experiences: [...editedConfig.experiences, { id, label }],
    });
  };

  const removeExperience = (id: string) => {
    if (!editedConfig) return;
    setEditedConfig({
      ...editedConfig,
      experiences: editedConfig.experiences.filter((e) => e.id !== id),
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading configuration...</p>
        </CardContent>
      </Card>
    );
  }

  if (!editedConfig) {
    return (
      <Card className="border-2 border-chart-3/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            No Configuration Found
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              The form configuration has not been initialized in Firebase yet.
            </AlertDescription>
          </Alert>
          <Button onClick={handleSeedConfig} disabled={isSeeding} size="lg" className="w-full">
            <Database className="w-4 h-4 mr-2" />
            {isSeeding ? "Seeding..." : "Seed Configuration"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const tabs = [
    { id: "teams", label: "Teams", count: editedConfig.teams.length },
    { id: "experiences", label: "Experiences", count: editedConfig.experiences.length },
    { id: "days", label: "Days & Dates", count: editedConfig.days.length },
    { id: "shifts", label: "Shifts", count: editedConfig.shifts.length },
    { id: "questions", label: "Questions", count: editedConfig.questions.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Form Configuration
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Edit form options and questions. Changes sync instantly.
          </p>
        </div>
        <Button
          onClick={handleSeedConfig}
          disabled={isSeeding}
          variant="outline"
          size="sm"
          className="gap-2 self-start sm:self-auto"
        >
          <Database className="w-4 h-4" />
          {isSeeding ? "Seeding..." : "Re-seed Defaults"}
        </Button>
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {tab.label}
                <Badge variant="outline" className="ml-2 text-xs">
                  {tab.count}
                </Badge>
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 min-h-96">
          {/* Teams Tab */}
          {activeTab === "teams" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3">Team Options</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {editedConfig.teams.map((team) => (
                    <Badge key={team} variant="secondary" className="pl-3 py-2">
                      {team}
                      <button
                        onClick={() => removeTeam(team)}
                        className="ml-2 hover:opacity-70"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              <TeamAddForm onAdd={addTeam} />
            </div>
          )}

          {/* Experiences Tab */}
          {activeTab === "experiences" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3">Experience Options</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                  {editedConfig.experiences.map((exp) => (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{exp.label}</p>
                        <p className="text-xs text-muted-foreground">ID: {exp.id}</p>
                      </div>
                      <button
                        onClick={() => removeExperience(exp.id)}
                        className="text-destructive hover:opacity-70"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <ExperienceAddForm onAdd={addExperience} />
            </div>
          )}

          {/* Days Tab */}
          {activeTab === "days" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Days</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {editedConfig.days.map((day, idx) => (
                      <Input
                        key={idx}
                        value={day}
                        onChange={(e) => {
                          const newDays = [...editedConfig.days];
                          newDays[idx] = e.target.value;
                          setEditedConfig({ ...editedConfig, days: newDays });
                        }}
                        placeholder={`Day ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Dates</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {editedConfig.dayDates.map((date, idx) => (
                      <Input
                        key={idx}
                        value={date}
                        onChange={(e) => {
                          const newDates = [...editedConfig.dayDates];
                          newDates[idx] = e.target.value;
                          setEditedConfig({ ...editedConfig, dayDates: newDates });
                        }}
                        placeholder={`Date ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                ⚠️ Keep days and dates in sync - same number of items
              </p>
            </div>
          )}

          {/* Shifts Tab */}
          {activeTab === "shifts" && (
            <div className="space-y-4">
              <h3 className="font-semibold">Shift Times</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {editedConfig.shifts.map((shift, idx) => (
                  <Input
                    key={idx}
                    value={shift}
                    onChange={(e) => {
                      const newShifts = [...editedConfig.shifts];
                      newShifts[idx] = e.target.value;
                      setEditedConfig({ ...editedConfig, shifts: newShifts });
                    }}
                    placeholder={`Shift ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Questions Tab */}
          {activeTab === "questions" && (
            <div className="space-y-4">
              <h3 className="font-semibold mb-3">Form Questions</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                {editedConfig.questions.map((question, idx) => (
                  <div
                    key={question.id}
                    className="p-3 rounded-lg border bg-muted/50 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{question.label}</p>
                        <p className="text-xs text-muted-foreground">ID: {question.id}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {idx > 0 && (
                          <button
                            onClick={() => {
                              const newQuestions = [...editedConfig.questions];
                              [newQuestions[idx], newQuestions[idx - 1]] = [newQuestions[idx - 1], newQuestions[idx]];
                              setEditedConfig({ ...editedConfig, questions: newQuestions });
                            }}
                            className="text-muted-foreground hover:text-foreground p-1"
                            title="Move up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                        )}
                        {idx < editedConfig.questions.length - 1 && (
                          <button
                            onClick={() => {
                              const newQuestions = [...editedConfig.questions];
                              [newQuestions[idx], newQuestions[idx + 1]] = [newQuestions[idx + 1], newQuestions[idx]];
                              setEditedConfig({ ...editedConfig, questions: newQuestions });
                            }}
                            className="text-muted-foreground hover:text-foreground p-1"
                            title="Move down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const newQuestions = editedConfig.questions.filter((_, i) => i !== idx);
                            setEditedConfig({ ...editedConfig, questions: newQuestions });
                          }}
                          className="text-destructive hover:opacity-70 p-1"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <Badge className="ml-1">{question.type}</Badge>
                      </div>
                      {question.required && (
                        <div className="text-chart-2">Required: Yes</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <QuestionAddForm onAdd={(q) => {
                setEditedConfig({
                  ...editedConfig,
                  questions: [...editedConfig.questions, q],
                });
              }} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 sticky bottom-4">
        <Button
          onClick={handleSaveConfig}
          disabled={isSaving || JSON.stringify(config) === JSON.stringify(editedConfig)}
          size="lg"
          className="gap-2"
        >
          <Check className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
        <Button
          onClick={handleResetChanges}
          disabled={JSON.stringify(config) === JSON.stringify(editedConfig)}
          variant="outline"
          size="lg"
        >
          Discard Changes
        </Button>
      </div>
    </div>
  );
}

function TeamAddForm({ onAdd }: { onAdd: (team: string) => void }) {
  const [value, setValue] = useState("");

  const handleAdd = () => {
    onAdd(value);
    setValue("");
  };

  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add new team (e.g., Audio)"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleAdd();
          }
        }}
      />
      <Button onClick={handleAdd} size="sm" variant="outline" className="gap-2">
        <Plus className="w-4 h-4" />
        Add
      </Button>
    </div>
  );
}

function ExperienceAddForm({ onAdd }: { onAdd: (id: string, label: string) => void }) {
  const [id, setId] = useState("");
  const [label, setLabel] = useState("");

  const handleAdd = () => {
    onAdd(id, label);
    setId("");
    setLabel("");
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="ID (e.g., catering)"
        />
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (e.g., Catering)"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleAdd();
            }
          }}
        />
      </div>
      <Button onClick={handleAdd} size="sm" variant="outline" className="w-full gap-2">
        <Plus className="w-4 h-4" />
        Add Experience
      </Button>
    </div>
  );
}

function QuestionAddForm({ onAdd }: { onAdd: (question: FormQuestion) => void }) {
  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FormQuestion["type"]>("text");
  const [placeholder, setPlaceholder] = useState("");
  const [required, setRequired] = useState(true);

  const handleAdd = () => {
    if (!id.trim() || !label.trim()) {
      toast.error("ID and label are required");
      return;
    }
    onAdd({
      id,
      label,
      type,
      placeholder: placeholder || undefined,
      required,
    });
    setId("");
    setLabel("");
    setType("text");
    setPlaceholder("");
    setRequired(true);
  };

  return (
    <div className="space-y-3 p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
      <h3 className="text-sm font-semibold">Add New Question</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="ID (e.g., company)"
          className="text-sm"
        />
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (e.g., Company name)"
          className="text-sm"
        />
        <Select value={type} onValueChange={(value) => setType(value as FormQuestion["type"])}>
          <SelectTrigger className="text-sm h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUESTION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={placeholder}
          onChange={(e) => setPlaceholder(e.target.value)}
          placeholder="Placeholder text"
          className="text-sm"
        />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          checked={required}
          onCheckedChange={(checked) => setRequired(checked as boolean)}
          id="new-question-required"
        />
        <Label htmlFor="new-question-required" className="text-sm cursor-pointer">
          Required
        </Label>
      </div>
      <Button onClick={handleAdd} size="sm" className="w-full gap-2">
        <Plus className="w-4 h-4" />
        Add Question
      </Button>
    </div>
  );
}
