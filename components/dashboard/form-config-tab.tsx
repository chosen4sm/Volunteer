"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Plus, Trash2, Database, AlertTriangle, ChevronDown, ChevronUp, Save, X } from "lucide-react";
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
  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FormQuestion["type"]>("text");
  const [placeholder, setPlaceholder] = useState("");
  const [required, setRequired] = useState(true);
  const [customOptions, setCustomOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [newOptionId, setNewOptionId] = useState("");
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [optionsSource, setOptionsSource] = useState<"custom" | "teams" | "experiences">("custom");

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

  const handleAdd = () => {
    if (!id.trim() || !label.trim()) {
      toast.error("ID and label are required");
      return;
    }
    if (!editedConfig) return;
    
    const newQuestion: FormQuestion = { 
      id, 
      label, 
      type, 
      placeholder: placeholder || undefined, 
      required 
    };
    
    // Add options based on source
    if (type === "select" || type === "checkbox-multi") {
      if (optionsSource === "teams") {
        newQuestion.optionsFrom = "teams";
      } else if (optionsSource === "experiences") {
        newQuestion.optionsFrom = "experiences";
      } else if (customOptions.length > 0) {
        newQuestion.options = customOptions;
      }
    }
    
    setEditedConfig({
      ...editedConfig,
      questions: [...editedConfig.questions, newQuestion],
    });
    setId("");
    setLabel("");
    setType("text");
    setPlaceholder("");
    setRequired(true);
    setCustomOptions([]);
    setNewOptionId("");
    setNewOptionLabel("");
    setOptionsSource("custom");
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

  const hasChanges = JSON.stringify(config) !== JSON.stringify(editedConfig);

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Form Configuration
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage form options and questions
          </p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <>
              <Button onClick={handleResetChanges} variant="outline" size="sm" className="gap-2">
                <X className="w-4 h-4" />
                Discard
              </Button>
              <Button onClick={handleSaveConfig} disabled={isSaving} size="sm" className="gap-2">
                <Save className="w-4 h-4" />
                {isSaving ? "Saving..." : "Save All"}
              </Button>
            </>
          )}
          <Button onClick={handleSeedConfig} disabled={isSeeding} variant="outline" size="sm" className="gap-2">
            <Database className="w-4 h-4" />
            {isSeeding ? "Seeding..." : "Reset Defaults"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {[
          { id: "teams", label: "Teams", count: editedConfig.teams.length },
          { id: "experiences", label: "Experiences", count: editedConfig.experiences.length },
          { id: "days", label: "Days", count: editedConfig.days.length },
          { id: "shifts", label: "Shifts", count: editedConfig.shifts.length },
          { id: "questions", label: "Questions", count: editedConfig.questions.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              activeTab === tab.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="text-2xl font-bold">{tab.count}</div>
            <div className="text-sm text-muted-foreground">{tab.label}</div>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          {activeTab === "teams" && (
            <div className="space-y-6">
              <div className="flex gap-3">
                <Input
                  placeholder="Add new team..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const value = e.currentTarget.value;
                      if (value.trim()) {
                        addTeam(value);
                        e.currentTarget.value = "";
                      }
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    if (input.value.trim()) {
                      addTeam(input.value);
                      input.value = "";
                    }
                  }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Team
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {editedConfig.teams.map((team) => (
                  <Badge key={team} variant="secondary" className="px-3 py-2 text-sm">
                    {team}
                    <button onClick={() => removeTeam(team)} className="ml-2 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {activeTab === "experiences" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="ID (e.g., tech)"
                  id="exp-id"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const labelInput = document.getElementById("exp-label") as HTMLInputElement;
                      labelInput?.focus();
                    }
                  }}
                />
                <Input
                  placeholder="Label (e.g., Tech Support)"
                  id="exp-label"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const idInput = document.getElementById("exp-id") as HTMLInputElement;
                      const labelInput = e.currentTarget;
                      if (idInput.value.trim() && labelInput.value.trim()) {
                        addExperience(idInput.value, labelInput.value);
                        idInput.value = "";
                        labelInput.value = "";
                        idInput.focus();
                      }
                    }
                  }}
                />
              </div>
              <Button
                onClick={() => {
                  const idInput = document.getElementById("exp-id") as HTMLInputElement;
                  const labelInput = document.getElementById("exp-label") as HTMLInputElement;
                  if (idInput.value.trim() && labelInput.value.trim()) {
                    addExperience(idInput.value, labelInput.value);
                    idInput.value = "";
                    labelInput.value = "";
                  }
                }}
                className="w-full gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Experience
              </Button>
              <div className="space-y-2">
                {editedConfig.experiences.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{exp.label}</p>
                      <p className="text-xs text-muted-foreground">{exp.id}</p>
                    </div>
                    <Button
                      onClick={() => removeExperience(exp.id)}
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "days" && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="font-semibold">Days</Label>
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
              <div className="space-y-3">
                <Label className="font-semibold">Dates</Label>
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
          )}

          {activeTab === "shifts" && (
            <div className="space-y-3">
              <Label className="font-semibold">Shift Times</Label>
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
          )}

          {activeTab === "questions" && (
            <div className="space-y-4">
              <div className="space-y-3">
                {editedConfig.questions.map((question, idx) => (
                  <div key={question.id} className="p-4 rounded-lg border-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Input
                          value={question.label}
                          onChange={(e) => {
                            const newQuestions = [...editedConfig.questions];
                            newQuestions[idx].label = e.target.value;
                            setEditedConfig({ ...editedConfig, questions: newQuestions });
                          }}
                          className="text-lg font-semibold border-0 p-0 h-auto focus-visible:ring-0"
                          placeholder="Question label"
                        />
                        <p className="text-xs text-muted-foreground mt-1">{question.id}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={() => {
                            const newQuestions = [...editedConfig.questions];
                            [newQuestions[idx], newQuestions[idx - 1]] = [newQuestions[idx - 1], newQuestions[idx]];
                            setEditedConfig({ ...editedConfig, questions: newQuestions });
                          }}
                          disabled={idx === 0}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => {
                            const newQuestions = [...editedConfig.questions];
                            [newQuestions[idx], newQuestions[idx + 1]] = [newQuestions[idx + 1], newQuestions[idx]];
                            setEditedConfig({ ...editedConfig, questions: newQuestions });
                          }}
                          disabled={idx === editedConfig.questions.length - 1}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => {
                            const newQuestions = editedConfig.questions.filter((_, i) => i !== idx);
                            setEditedConfig({ ...editedConfig, questions: newQuestions });
                          }}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Type</Label>
                        <Select
                          value={question.type}
                          onValueChange={(val) => {
                            const newQuestions = [...editedConfig.questions];
                            newQuestions[idx].type = val as FormQuestion["type"];
                            setEditedConfig({ ...editedConfig, questions: newQuestions });
                          }}
                        >
                          <SelectTrigger className="w-full mt-1 h-9" size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {QUESTION_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground">Placeholder</Label>
                        <Input
                          value={question.placeholder || ""}
                          onChange={(e) => {
                            const newQuestions = [...editedConfig.questions];
                            newQuestions[idx].placeholder = e.target.value || undefined;
                            setEditedConfig({ ...editedConfig, questions: newQuestions });
                          }}
                          className="mt-1 h-9"
                          placeholder="Optional help text"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={question.required}
                        onCheckedChange={(checked) => {
                          const newQuestions = [...editedConfig.questions];
                          newQuestions[idx].required = checked as boolean;
                          setEditedConfig({ ...editedConfig, questions: newQuestions });
                        }}
                        id={`required-${idx}`}
                      />
                      <Label htmlFor={`required-${idx}`} className="text-sm cursor-pointer">
                        Required field
                      </Label>
                    </div>

                    {(question.type === "select" || question.type === "checkbox-multi") && (
                      <div className="pt-3 border-t space-y-2">
                        <Label className="text-xs text-muted-foreground">Options</Label>
                        
                        {question.optionsFrom ? (
                          <div className="space-y-2">
                            <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                              Options loaded from: <span className="font-semibold">{question.optionsFrom === "teams" ? "Teams" : "Experiences"}</span>
                            </div>
                            {question.optionsFrom === "teams" ? (
                              editedConfig.teams.length > 0 ? (
                                editedConfig.teams.map((team) => (
                                  <div key={team} className="flex items-center gap-2 p-2 bg-muted/20 rounded">
                                    <Input value={team} disabled className="h-8 text-xs flex-1" />
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-muted-foreground">No teams configured</p>
                              )
                            ) : question.optionsFrom === "experiences" ? (
                              editedConfig.experiences.length > 0 ? (
                                editedConfig.experiences.map((exp) => (
                                  <div key={exp.id} className="flex items-center gap-2 p-2 bg-muted/20 rounded">
                                    <Input value={exp.id} disabled className="h-8 text-xs flex-1" />
                                    <Input value={exp.label} disabled className="h-8 text-xs flex-1" />
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-muted-foreground">No experiences configured</p>
                              )
                            ) : null}
                            <Button
                              onClick={() => {
                                const newQuestions = [...editedConfig.questions];
                                delete newQuestions[idx].optionsFrom;
                                newQuestions[idx].options = [];
                                setEditedConfig({ ...editedConfig, questions: newQuestions });
                                toast.info("Switched to custom options");
                              }}
                              size="sm"
                              variant="outline"
                              className="w-full h-8 text-xs"
                            >
                              Switch to Custom Options
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {question.options?.map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-2">
                                <Input value={opt.id} disabled className="h-8 text-xs flex-1" />
                                <Input value={opt.label} disabled className="h-8 text-xs flex-1" />
                                <Button
                                  onClick={() => {
                                    const newQuestions = [...editedConfig.questions];
                                    newQuestions[idx].options = question.options?.filter((_, i) => i !== optIdx);
                                    setEditedConfig({ ...editedConfig, questions: newQuestions });
                                  }}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-destructive"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                            <div className="flex gap-2">
                              <Input placeholder="ID" id={`opt-id-${idx}`} className="h-8 text-xs flex-1" />
                              <Input placeholder="Label" id={`opt-label-${idx}`} className="h-8 text-xs flex-1" />
                              <Button
                                onClick={() => {
                                  const idInput = document.getElementById(`opt-id-${idx}`) as HTMLInputElement;
                                  const labelInput = document.getElementById(`opt-label-${idx}`) as HTMLInputElement;
                                  if (!idInput?.value.trim() || !labelInput?.value.trim()) {
                                    toast.error("Both ID and label required");
                                    return;
                                  }
                                  const newQuestions = [...editedConfig.questions];
                                  newQuestions[idx].options = [...(question.options || []), { id: idInput.value, label: labelInput.value }];
                                  setEditedConfig({ ...editedConfig, questions: newQuestions });
                                  idInput.value = "";
                                  labelInput.value = "";
                                }}
                                size="sm"
                                className="h-8"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t-2 border-dashed space-y-4">
                <h4 className="font-semibold">Add New Question</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input value={id} onChange={(e) => setId(e.target.value)} placeholder="ID (e.g., phone)" />
                  <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g., Phone number)" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <Select value={type} onValueChange={(val) => setType(val as FormQuestion["type"])}>
                      <SelectTrigger className="w-full mt-1 h-9" size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUESTION_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Placeholder</Label>
                    <Input
                      value={placeholder}
                      onChange={(e) => setPlaceholder(e.target.value)}
                      placeholder="Optional help text"
                      className="mt-1 h-9"
                    />
                  </div>
                </div>

                {(type === "select" || type === "checkbox-multi") && (
                  <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                    <Label className="text-xs text-muted-foreground">Options Source</Label>
                    <Select
                      value={optionsSource}
                      onValueChange={(val) => setOptionsSource(val as "custom" | "teams" | "experiences")}
                    >
                      <SelectTrigger className="w-full h-9" size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom Options</SelectItem>
                        <SelectItem value="teams">From Teams</SelectItem>
                        <SelectItem value="experiences">From Experiences</SelectItem>
                      </SelectContent>
                    </Select>

                    {optionsSource === "custom" ? (
                      <div className="space-y-2 mt-2">
                        {customOptions.map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Input value={opt.id} disabled className="h-8 text-xs flex-1" />
                            <Input value={opt.label} disabled className="h-8 text-xs flex-1" />
                            <Button
                              onClick={() => setCustomOptions(customOptions.filter((_, i) => i !== idx))}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Input
                            value={newOptionId}
                            onChange={(e) => setNewOptionId(e.target.value)}
                            placeholder="ID"
                            className="h-8 text-xs flex-1"
                          />
                          <Input
                            value={newOptionLabel}
                            onChange={(e) => setNewOptionLabel(e.target.value)}
                            placeholder="Label"
                            className="h-8 text-xs flex-1"
                          />
                          <Button
                            onClick={() => {
                              if (!newOptionId.trim() || !newOptionLabel.trim()) {
                                toast.error("Both ID and label required");
                                return;
                              }
                              setCustomOptions([...customOptions, { id: newOptionId, label: newOptionLabel }]);
                              setNewOptionId("");
                              setNewOptionLabel("");
                            }}
                            size="sm"
                            className="h-8"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-muted-foreground p-2 bg-muted/20 rounded">
                        Options will be loaded from: <span className="font-semibold">{optionsSource === "teams" ? "Teams" : "Experiences"}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={required}
                    onCheckedChange={(checked) => setRequired(checked as boolean)}
                    id="new-required"
                  />
                  <Label htmlFor="new-required" className="text-sm cursor-pointer">
                    Required field
                  </Label>
                </div>

                <Button onClick={handleAdd} className="w-full gap-2">
                  <Plus className="w-4 h-4" />
                  Add Question
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
