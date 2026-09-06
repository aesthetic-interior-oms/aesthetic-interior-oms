import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { MainLayout } from "@/components/layout/mainlayout";

export const metadata = {
  title: "Visit Scheduler | CRM",
  description: "Manage and track visits",
};

const CRM_DASHBOARD = "/crm/jr/dashboard";
const SR_CRM_DASHBOARD = "/crm/sr/dashboard";

export const runtime = "nodejs";
export const preferredRegion = "sin1";

export default async function VisitsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      id: true,
      userDepartments: {
        select: {
          department: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!user || user.userDepartments.length === 0) {
    redirect("/onboarding");
  }

  const departmentNames = new Set(
    user.userDepartments.map((row) => row.department.name.toUpperCase().replace(/\s+/g, '_')),
  );

  const isVisitAllowed =
    departmentNames.has("VISIT_TEAM") ||
    departmentNames.has("ADMIN") ||
    departmentNames.has("PROJECT_COORDINATOR");

  if (isVisitAllowed) {
    return <MainLayout role="Visit Team">{children}</MainLayout>;
  }

  if (departmentNames.has("PROJECT_COORDINATOR")) {
    redirect("/crm/pc/dashboard");
  }

  if (departmentNames.has("JR_CRM")) {
    redirect(CRM_DASHBOARD);
  }

  if (departmentNames.has("SR_CRM")) {
    redirect(SR_CRM_DASHBOARD);
  }

  redirect("/onboarding");
}
