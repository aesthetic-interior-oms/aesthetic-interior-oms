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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import {
  listQuotationTemplates,
  getQuotationTemplate,
} from "@/lib/quotation-templates";
import { QuotationTemplateItem } from "@/lib/quotation-types";
import { Loader2 } from "lucide-react";

export default function QuotationSettingsPage() {
  const catalogs = listQuotationTemplates();
  const [selectedCatalogKey, setSelectedCatalogKey] = useState(
    catalogs[0]?.key || "",
  );
  const [overrides, setOverrides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      }
    } catch (err) {
      toast.error("Failed to load overrides");
    }
    setLoading(false);
  };

  const handleSave = async (itemId: string, updates: any) => {
    try {
      const res = await fetch("/api/quotation-settings", {
        method: "PUT",
        body: JSON.stringify({
          templateKey: selectedCatalogKey,
          itemId,
          ...updates,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Saved successfully");
        loadOverrides();
      } else {
        toast.error("Failed to save");
      }
    } catch (err) {
      toast.error("Failed to save");
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("Are you sure you want to mark this item as deleted?")) return;
    try {
      const res = await fetch("/api/quotation-settings", {
        method: "PUT",
        body: JSON.stringify({
          templateKey: selectedCatalogKey,
          itemId,
          isDeleted: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Item deleted");
        loadOverrides();
      } else {
        toast.error("Failed to delete");
      }
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const template = getQuotationTemplate(selectedCatalogKey);
  const items = template.items
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
      };
    })
    .filter(Boolean) as QuotationTemplateItem[];

  return (
    <div className="min-h-screen bg-background p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Quotation Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage and override saved items for Detail Quotation.
        </p>
      </div>

      <div className="flex items-center gap-4">
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

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="py-4">
                <CardTitle className="text-lg">{item.description}</CardTitle>
                <CardDescription>ID: {item.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      defaultValue={item.description}
                      onBlur={(e) => {
                        if (e.target.value !== item.description) {
                          handleSave(item.id, { description: e.target.value });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Unit</label>
                    <Input
                      defaultValue={item.unit}
                      onBlur={(e) => {
                        if (e.target.value !== item.unit) {
                          handleSave(item.id, { unit: e.target.value });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Materials</label>
                    <Textarea
                      defaultValue={item.materials}
                      className="min-h-[100px]"
                      onBlur={(e) => {
                        if (e.target.value !== item.materials) {
                          handleSave(item.id, { materials: e.target.value });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Basic Rate</label>
                    <Input
                      type="number"
                      defaultValue={item.basicRate}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val !== item.basicRate) {
                          handleSave(item.id, { basicRate: val });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Standard Rate</label>
                    <Input
                      type="number"
                      defaultValue={item.standardRate}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val !== item.standardRate) {
                          handleSave(item.id, { standardRate: val });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Premium Rate</label>
                    <Input
                      type="number"
                      defaultValue={item.premiumRate}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val !== item.premiumRate) {
                          handleSave(item.id, { premiumRate: val });
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2 border-t">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                  >
                    Delete Item
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
