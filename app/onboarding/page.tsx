"use client"

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SignInButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const DEFAULT_REDIRECT = "/";
const DEPARTMENT_ROUTES: Record<string, string> = {
  JR_CRM: "/crm/jr/dashboard",
  VISIT_TEAM: "/visit-team/visit-dashboard",
};

type Department = {
  id: string;
  name: string;
  description?: string | null;
};

type MeResponse = {
  id: string;
  fullName?: string;
  needsOnboarding?: boolean;
  userDepartments?: Array<{ department: { id: string; name: string } }>;
  clerkDepartment?: { id: string | null; name: string | null };
};

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedDepartment = useMemo(
    () => departments.find((dept) => dept.id === selectedDepartmentId) ?? null,
    [departments, selectedDepartmentId],
  );

  const resolveRedirect = (departmentName?: string | null) => {
    if (!departmentName) return DEFAULT_REDIRECT;
    return DEPARTMENT_ROUTES[departmentName] ?? DEFAULT_REDIRECT;
  };

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setError(null);
      try {
        const [meRes, departmentsRes] = await Promise.all([
          fetch("/api/me", { cache: "no-store" }),
          fetch("/api/department", { cache: "no-store" }),
        ]);

        if (!meRes.ok) {
          throw new Error("Unable to load your profile.");
        }

        const me = (await meRes.json()) as MeResponse;
        const existingDepartmentName =
          me.userDepartments?.[0]?.department?.name ?? me.clerkDepartment?.name ?? null;

        if (me.needsOnboarding === false && existingDepartmentName) {
          router.replace(resolveRedirect(existingDepartmentName));
          return;
        }

        if (!departmentsRes.ok) {
          throw new Error("Unable to load departments.");
        }

        const payload = await departmentsRes.json();
        if (!payload?.success || !Array.isArray(payload.data)) {
          throw new Error("Unable to load departments.");
        }

        setDepartments(payload.data as Department[]);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isLoaded, isSignedIn, router]);

  const handleSubmit = async () => {
    if (!selectedDepartmentId) {
      setError("Please select a department to continue.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId: selectedDepartmentId }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const message = payload?.error || "Unable to save your department.";
        throw new Error(message);
      }

      router.replace(resolveRedirect(selectedDepartment?.name ?? null));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-muted/30 px-6 py-12">
        <Card className="w-full max-w-xl border-border">
          <CardHeader>
            <CardTitle>Setting up your workspace</CardTitle>
            <CardDescription>Loading your profile and available departments...</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-muted/30 px-6 py-12">
        <Card className="w-full max-w-xl border-border">
          <CardHeader>
            <CardTitle>Sign in to continue</CardTitle>
            <CardDescription>Your onboarding is waiting for you.</CardDescription>
          </CardHeader>
          <CardFooter>
            <SignInButton>
              <Button className="w-full">Sign in</Button>
            </SignInButton>
          </CardFooter>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-muted/30 px-6 py-12">
      <Card className="w-full max-w-xl border-border">
        <CardHeader>
          <CardTitle>Welcome{user?.firstName ? `, ${user.firstName}` : ""}</CardTitle>
          <CardDescription>
            Choose the department you work with so we can personalize your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select your department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDepartment?.description ? (
              <p className="text-xs text-muted-foreground">{selectedDepartment.description}</p>
            ) : null}
          </div>

          {departments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No departments are available yet. Please contact an administrator.
            </p>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={saving || !selectedDepartmentId || departments.length === 0}
          >
            {saving ? "Saving..." : "Continue"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            You can update your department later from settings.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
