import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import {
  getDepartmentNameAliases,
  normalizeDepartmentName,
} from '@/lib/department-normalization';

const VALID_DEPARTMENTS = [
  'ADMIN',
  'SR_CRM',
  'JR_CRM',
  'QUOTATION_TEAM',
  'VISIT_TEAM',
  'SPECIALIST_DESIGN_CONSULTANTS',
  'SDC',
  'JR_ARCHITECT',
  '3D_VISUALIZER',
  'VISUALIZER_3D',
  'ACCOUNTS',
  'PROJECT_COORDINATOR',
  'BOQ',
  'PROCUREMENT',
] as const;

function resolveDepartmentAliases(departmentName: string): string[] {
  if (departmentName === '3D_VISUALIZER' || departmentName === 'VISUALIZER_3D') {
    return ['3D_VISUALIZER', 'VISUALIZER_3D']
  }
  if (departmentName === 'QUOTATION_TEAM' || departmentName === 'QUOTATION') {
    return ['QUOTATION_TEAM', 'QUOTATION', 'SR_CRM']
  }
  if (departmentName === 'BOQ') {
    return ['BOQ', 'BOQ Team', 'BOQ Department', 'BOQ_TEAM', 'BOQ_DEPARTMENT']
  }
  return getDepartmentNameAliases(departmentName)
}

// GET - Fetch all users in a specific department (by name)
// Returns dropdown-ready list of all department members
// Next.js 15: params is always a Promise — destructure and await properly
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    let nameParam: string | undefined;

    // 1. Primary: await the route params (Next.js 15 standard)
    try {
      const resolved = await params;
      nameParam = resolved?.name;
    } catch {
      // params resolution failed — fall through to URL fallback
    }

    // 2. Fallback: extract from actual URL pathname
    if (!nameParam || nameParam === '[name]') {
      const pathSegments = request.nextUrl.pathname.split('/');
      const segment = pathSegments[pathSegments.length - 1];
      // Only use the segment if it's not a template literal placeholder
      if (segment && segment !== '[name]') {
        nameParam = segment;
      }
    }

    // 3. Last resort: Next.js internally passes dynamic segment as ?nxtPname
    if (!nameParam || nameParam === '[name]') {
      const nxtPname = request.nextUrl.searchParams.get('nxtPname');
      if (nxtPname) nameParam = nxtPname;
    }

    if (!nameParam) {
      return NextResponse.json(
        { success: false, error: 'Department name is required' },
        { status: 400 }
      );
    }

    const departmentName = normalizeDepartmentName(nameParam) ?? '';

    if (!VALID_DEPARTMENTS.includes(departmentName as (typeof VALID_DEPARTMENTS)[number])) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid department. Must be one of: ${VALID_DEPARTMENTS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const departmentNames = resolveDepartmentAliases(departmentName)

    // Fetch all active users in this department (including compatible aliases)
    const userDepartments = await prisma.userDepartment.findMany({
      where: {
        department: {
          name: {
            in: departmentNames,
            mode: 'insensitive',
          },
        },
        user: {
          isActive: true,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        user: {
          fullName: 'asc',
        },
      },
    });

    // console.log('[DEPT-API] UserDepartments count:', userDepartments.length);
    // console.log('[DEPT-API] UserDepartments data:', JSON.stringify(userDepartments, null, 2));

    let users = Array.from(
      new Map(
        userDepartments.map((ud) => [
          ud.user.id,
          {
            id: ud.user.id,
            fullName: ud.user.fullName,
            email: ud.user.email,
            phone: ud.user.phone,
          },
        ]),
      ).values(),
    );

    const response = NextResponse.json({
      success: true,
      users,
    });
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=90');
    return response;
  } catch (error) {
    console.error('[DEPT-API] Error fetching department users:', error);
    console.error('[DEPT-API] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch department users' },
      { status: 500 }
    );
  }
}
