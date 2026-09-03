"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import {
  listQuotationTemplates,
  getQuotationTemplate,
} from "@/lib/quotation-templates";
import { QuotationTemplateItem } from "@/lib/quotation-types";
import { Loader2, Plus, Save, Trash2, AlertCircle } from "lucide-react";

type ItemEditState = {
  description?: string;
  unit?: string;
  materials?: string;
  basicRate?: number;
  standardRate?: number;
  premiumRate?: number;
  sectionId?: string;
};

type ConfirmationModalState = {
  open: boolean;
  title: string;
  message: string;
  actionText: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
};

export default function QuotationSettingsPage() {
  const catalogs = listQuotationTemplates();
  const [selectedCatalogKey, setSelectedCatalogKey] = useState(
    catalogs[0]?.key || "",
  );
  const [overrides, setOverrides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);

  // Local editing state per item
  const [itemEdits, setItemEdits] = useState<Record<string, ItemEditState>>({});

  // Add New Item Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    sectionId: "",
    description: "",
    materials: "",
    unit: "sqft",
    basicRate: "0",
    standardRate: "0",
    premiumRate: "0",
  });

  // Confirmation Alert Dialog state
  const [confirmModal, setConfirmModal] = useState<ConfirmationModalState>({
    open: false,
    title: "",
    message: "",
    actionText: "Confirm",
    onConfirm: () => {},
  });

  useEffect(() => {
    if (selectedCatalogKey) {
      loadOverrides();
    }
  }, [selectedCatalogKey]);

  const loadOverrides = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/quotation-settings?templateKey=${selectedCatalogKey}`,
      );
      const data = await res.json();
      if (data.success) {
        setOverrides(data.overrides);
        setItemEdits({});
      }
    } catch (err) {
      toast.error("Failed to load overrides");
    }
    setLoading(false);
  };

  const template = getQuotationTemplate(selectedCatalogKey);

  // Combine base template items with overrides
  const baseItems = template.items
    .map((item) => {
      const override = overrides.find((o) => o.itemId === item.id);
      if (override?.isDeleted) return null;
      return {
        ...item,
        description: override?.description ?? item.description,
        materials: override?.materials ?? item.materials,
        basicRate: override?.basicRate ?? item.basicRate,
        standardRate: override?.standardRate ?? item.standardRate,
        premiumRate: override?.premiumRate ?? item.premiumRate,
        unit: override?.unit ?? item.unit,
        sectionId: override?.sectionId ?? item.sectionId,
        isNewItem: false,
      };
    })
    .filter(Boolean) as (QuotationTemplateItem & { isNewItem: boolean })[];

  // Include new custom items created in settings
  const customItems = overrides
    .filter((o) => o.isNewItem && !o.isDeleted)
    .map((o) => ({
      id: o.itemId,
      sectionId: o.sectionId || template.sections[0]?.id || "general",
      description: o.description || "New Item",
      materials: o.materials || "",
      unit: (o.unit as any) || "sqft",
      priceMode: (o.priceMode as any) || "fixed",
      basicRate: o.basicRate ?? 0,
      standardRate: o.standardRate ?? 0,
      premiumRate: o.premiumRate ?? 0,
      isNewItem: true,
    })) as (QuotationTemplateItem & { isNewItem: boolean })[];

  const allItems = [...baseItems, ...customItems];

  const handleFieldChange = (
    itemId: string,
    field: keyof ItemEditState,
    value: any,
  ) => {
    setItemEdits((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  const promptSaveItem = (item: QuotationTemplateItem & { isNewItem: boolean }) => {
    const edits = itemEdits[item.id] || {};
    const hasChanges = Object.keys(edits).length > 0;
    if (!hasChanges) {
      toast.info("No changes to save for this item.");
      return;
    }

    setConfirmModal({
      open: true,
      title: "Save Confirmation",
      message: `Are you sure you want to save the updated data for "${edits.description ?? item.description}"?`,
      actionText: "Yes, Save Data",
      variant: "default",
      onConfirm: () => executeSaveItem(item.id, edits, item.isNewItem),
    });
  };

  const executeSaveItem = async (
    itemId: string,
    updates: ItemEditState,
    isNewItem = false,
  ) => {
    setSavingItemId(itemId);
    try {
      const res = await fetch("/api/quotation-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: selectedCatalogKey,
          itemId,
          isNewItem,
          ...updates,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Saved successfully");
        loadOverrides();
      } else {
        toast.error("Failed to save: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      toast.error("Failed to save updated data");
    } finally {
      setSavingItemId(null);
    }
  };

  const promptDeleteItem = (itemId: string, description: string) => {
    setConfirmModal({
      open: true,
      title: "Delete Item Confirmation",
      message: `Are you sure you want to delete "${description}" from this quotation catalog?`,
      actionText: "Yes, Delete Item",
      variant: "destructive",
      onConfirm: () => executeDeleteItem(itemId),
    });
  };

  const executeDeleteItem = async (itemId: string) => {
    setSavingItemId(itemId);
    try {
      const res = await fetch("/api/quotation-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: selectedCatalogKey,
          itemId,
          isDeleted: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Item deleted successfully");
        loadOverrides();
      } else {
        toast.error("Failed to delete item");
      }
    } catch (err) {
      toast.error("Failed to delete item");
    } finally {
      setSavingItemId(null);
    }
  };

  const handleOpenAddModal = () => {
    setNewItem({
      sectionId: template.sections[0]?.id || "",
      description: "",
      materials: "",
      unit: "sqft",
      basicRate: "0",
      standardRate: "0",
      premiumRate: "0",
    });
    setIsAddModalOpen(true);
  };

  const promptCreateNewItem = () => {
    if (!newItem.description.trim()) {
      toast.error("Description / Item Name is required.");
      return;
    }

    setConfirmModal({
      open: true,
      title: "Add New Item Confirmation",
      message: `Are you sure you want to add "${newItem.description.trim()}" to the ${template.name} catalog?`,
      actionText: "Yes, Add Item",
      variant: "default",
      onConfirm: () => executeCreateNewItem(),
    });
  };

  const executeCreateNewItem = async () => {
    const newItemId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    try {
      const res = await fetch("/api/quotation-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: selectedCatalogKey,
          itemId: newItemId,
          sectionId: newItem.sectionId,
          description: newItem.description.trim(),
          materials: newItem.materials.trim(),
          unit: newItem.unit,
          basicRate: parseFloat(newItem.basicRate) || 0,
          standardRate: parseFloat(newItem.standardRate) || 0,
          premiumRate: parseFloat(newItem.premiumRate) || 0,
          isNewItem: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("New saved item added successfully");
        setIsAddModalOpen(false);
        loadOverrides();
      } else {
        toast.error("Failed to add new item: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      toast.error("Failed to add new item");
    }
  };

  const modifiedCount = Object.keys(itemEdits).filter(
    (key) => Object.keys(itemEdits[key] || {}).length > 0,
  ).length;

  const promptSaveAll = () => {
    if (modifiedCount === 0) {
      toast.info("No updated data to save.");
      return;
    }

    setConfirmModal({
      open: true,
      title: "Save All Confirmation",
      message: `Are you sure you want to save the updated data for ${modifiedCount} item(s)?`,
      actionText: "Yes, Save All",
      variant: "default",
      onConfirm: async () => {
        setLoading(true);
        try {
          for (const itemId of Object.keys(itemEdits)) {
            const updates = itemEdits[itemId];
            if (updates && Object.keys(updates).length > 0) {
              const item = allItems.find((i) => i.id === itemId);
              await fetch("/api/quotation-settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  templateKey: selectedCatalogKey,
                  itemId,
                  isNewItem: item?.isNewItem ?? false,
                  ...updates,
                }),
              });
            }
          }
          toast.success("All updated data saved successfully");
          loadOverrides();
        } catch (err) {
          toast.error("Failed to save some updated data");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-5xl mx-auto space-y-6 pb-24">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quotation Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage and add saved items for Detail Quotation templates.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleOpenAddModal} className="gap-2">
            <Plus className="w-4 h-4" />
            Add New Saved Item
          </Button>
        </div>
      </div>

      {/* Catalog Switcher */}
      <div className="flex items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold">Select Catalog:</label>
          <div className="w-72">
            <Select
              value={selectedCatalogKey}
              onValueChange={setSelectedCatalogKey}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {catalogs.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {allItems.length} Saved Item(s)
        </Badge>
      </div>

      {/* Item Cards List */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : allItems.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No saved items found for this catalog. Click "Add New Saved Item" to create one.
        </Card>
      ) : (
        <div className="space-y-4">
          {allItems.map((item) => {
            const edits = itemEdits[item.id] || {};
            const currentDesc = edits.description ?? item.description;
            const currentUnit = edits.unit ?? item.unit;
            const currentMaterials = edits.materials ?? item.materials;
            const currentBasicRate = edits.basicRate ?? item.basicRate;
            const currentStandardRate = edits.standardRate ?? item.standardRate;
            const currentPremiumRate = edits.premiumRate ?? item.premiumRate;
            const currentSectionId = edits.sectionId ?? item.sectionId;

            const isModified = Object.keys(edits).length > 0;
            const sectionName =
              template.sections.find((s) => s.id === currentSectionId)?.name ||
              currentSectionId;

            return (
              <Card key={item.id} className={isModified ? "border-primary/50 shadow-sm" : ""}>
                <CardHeader className="py-4 border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {currentDesc || "Untitled Item"}
                        {item.isNewItem && (
                          <Badge variant="secondary" className="text-[10px]">
                            Custom Saved Item
                          </Badge>
                        )}
                        {isModified && (
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                            Unsaved Changes
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Section: {sectionName} • ID: {item.id}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description / Item Name</label>
                      <Input
                        value={currentDesc}
                        onChange={(e) =>
                          handleFieldChange(item.id, "description", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Unit</label>
                      <Select
                        value={currentUnit}
                        onValueChange={(val) =>
                          handleFieldChange(item.id, "unit", val)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sqft">sqft</SelectItem>
                          <SelectItem value="nos">nos</SelectItem>
                          <SelectItem value="ls">ls (Lump Sum)</SelectItem>
                          <SelectItem value="rmt">rmt</SelectItem>
                          <SelectItem value="rft">rft</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Materials & Specifications</label>
                      <Textarea
                        value={currentMaterials}
                        className="min-h-[90px] text-sm"
                        onChange={(e) =>
                          handleFieldChange(item.id, "materials", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Basic Rate (৳)</label>
                      <Input
                        type="number"
                        value={currentBasicRate}
                        onChange={(e) =>
                          handleFieldChange(
                            item.id,
                            "basicRate",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Standard Rate (৳)</label>
                      <Input
                        type="number"
                        value={currentStandardRate}
                        onChange={(e) =>
                          handleFieldChange(
                            item.id,
                            "standardRate",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Premium Rate (৳)</label>
                      <Input
                        type="number"
                        value={currentPremiumRate}
                        onChange={(e) =>
                          handleFieldChange(
                            item.id,
                            "premiumRate",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => promptDeleteItem(item.id, currentDesc)}
                      disabled={savingItemId === item.id}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete Item
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => promptSaveItem(item)}
                      disabled={savingItemId === item.id || !isModified}
                    >
                      {savingItemId === item.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-1" />
                      )}
                      Save Updated Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bottom Sticky Action Bar */}
      {modifiedCount > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-background/95 backdrop-blur border shadow-xl rounded-2xl px-6 py-3 flex items-center justify-between gap-6 min-w-[360px]">
          <span className="text-sm font-medium">
            {modifiedCount} item(s) with unsaved changes
          </span>
          <Button onClick={promptSaveAll} size="sm" className="gap-2">
            <Save className="w-4 h-4" />
            Save All Updated Data
          </Button>
        </div>
      )}

      {/* Add New Saved Item Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Saved Item</DialogTitle>
            <DialogDescription>
              Create a new item to be saved in the "{template.name}" catalog.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Section</label>
              <Select
                value={newItem.sectionId}
                onValueChange={(val) =>
                  setNewItem((prev) => ({ ...prev, sectionId: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section..." />
                </SelectTrigger>
                <SelectContent>
                  {template.sections.map((sec) => (
                    <SelectItem key={sec.id} value={sec.id}>
                      {sec.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Item Name / Description</label>
              <Input
                placeholder="e.g. Custom Decorative Wall Paneling"
                value={newItem.description}
                onChange={(e) =>
                  setNewItem((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Unit</label>
              <Select
                value={newItem.unit}
                onValueChange={(val) =>
                  setNewItem((prev) => ({ ...prev, unit: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sqft">sqft</SelectItem>
                  <SelectItem value="nos">nos</SelectItem>
                  <SelectItem value="ls">ls (Lump Sum)</SelectItem>
                  <SelectItem value="rmt">rmt</SelectItem>
                  <SelectItem value="rft">rft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Materials & Specifications</label>
              <Textarea
                placeholder="Specify materials, board type, finish, etc."
                className="min-h-[80px] text-sm"
                value={newItem.materials}
                onChange={(e) =>
                  setNewItem((prev) => ({ ...prev, materials: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Basic Rate (৳)</label>
                <Input
                  type="number"
                  value={newItem.basicRate}
                  onChange={(e) =>
                    setNewItem((prev) => ({ ...prev, basicRate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Standard Rate (৳)</label>
                <Input
                  type="number"
                  value={newItem.standardRate}
                  onChange={(e) =>
                    setNewItem((prev) => ({ ...prev, standardRate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Premium Rate (৳)</label>
                <Input
                  type="number"
                  value={newItem.premiumRate}
                  onChange={(e) =>
                    setNewItem((prev) => ({ ...prev, premiumRate: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={promptCreateNewItem}>
              Add Saved Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Universal Confirmation Alert Dialog */}
      <Dialog
        open={confirmModal.open}
        onOpenChange={(open) =>
          setConfirmModal((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              {confirmModal.title}
            </DialogTitle>
            <DialogDescription className="pt-2 text-foreground/90">
              {confirmModal.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setConfirmModal((prev) => ({ ...prev, open: false }))
              }
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={confirmModal.variant || "default"}
              onClick={() => {
                const action = confirmModal.onConfirm;
                setConfirmModal((prev) => ({ ...prev, open: false }));
                action();
              }}
            >
              {confirmModal.actionText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
