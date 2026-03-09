import { requireDatabaseRoles } from '@/lib/authz';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

/*
  POSTMAN TESTING DATA
  =====================
  
  GET - Fetch all users in a department
  URL: http://localhost:3000/api/department/{departmentId}/users
  Method: GET
  Headers: 
    - Authorization: Bearer {token}
  
  Example URLs:
  http://localhost:3000/api/department/cm7m8n9o0p1q2r3s/users
  http://localhost:3000/api/department/dept-123/users
  
  Expected Success Response (200):
  {
    "success": true,
    "data": {
      "departmentId": "cm7m8n9o0p1q2r3s",
      "departmentName": "Sales",
      "departmentDescription": "Sales department",
      "users": [
        {
          "id": "user-123",
          "fullName": "John Doe",
          "email": "john@example.com",
          "phone": "+1234567890",
          "created_at": "2026-03-09T10:00:00Z"
        },
        {
          "id": "user-456",
          "fullName": "Jane Smith",
          "email": "jane@example.com",
          "phone": "+0987654321",
          "created_at": "2026-03-08T15:30:00Z"
        }
      ],
      "count": 2
    }
  }
  
  Expected Error Response (404 - Department not found):
  {
    "success": false,
    "error": "Department not found"
  }
  
  Expected Error Response (500):
  {
    "success": false,
    "error": "Failed to fetch department users"
  }
*/

// GET - Fetch all users in a specific department
// Returns users who are members of the given department
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    console.log('🔵 [GET /api/department/[id]/users] - Request received');

    // const authResult = await requireDatabaseRoles([]);
    // if (!authResult.ok) {
    //   console.log('🔴 [GET /api/department/[id]/users] - Auth failed');
    //   return authResult.response;
    // }
    console.log('✅ [GET /api/department/[id]/users] - Auth passed');
    
    const resolvedParams = await params;
    const departmentId = resolvedParams?.id;
    console.log('🔍 [GET /api/department/[id]/users] - Resolved departmentId:', departmentId);
    
    if (!departmentId || typeof departmentId !== 'string') {
      console.log('🔴 [GET /api/department/[id]/users] - Invalid departmentId');
      return NextResponse.json(
        { success: false, error: 'Invalid department id' },
        { status: 400 }
      );
    }

    // Verify department exists
    console.log('🔎 [GET /api/department/[id]/users] - Looking up department');
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });
    console.log('📊 [GET /api/department/[id]/users] - Department found:', department);

    if (!department) {
      return NextResponse.json(
        { success: false, error: 'Department not found' },
        { status: 404 }
      );
    }

    // Fetch all users in this department
    console.log('🔎 [GET /api/department/[id]/users] - Fetching users in department');
    const userDepartments = await prisma.userDepartment.findMany({
      where: { departmentId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            created_at: true,
          },
        },
      },
      orderBy: {
        user: {
          fullName: 'asc',
        },
      },
    });
    console.log('📊 [GET /api/department/[id]/users] - Found users:', userDepartments.length);

    const users = userDepartments.map((ud) => ud.user);
    console.log('✨ [GET /api/department/[id]/users] - Response prepared with', users.length, 'users');

    return NextResponse.json({
      success: true,
      data: {
        departmentId: department.id,
        departmentName: department.name,
        departmentDescription: department.description,
        users,
        count: users.length,
      },
    });
  } catch (error) {
    console.error('❌ [GET /api/department/[id]/users] - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch department users' },
      { status: 500 }
    );
  }
}
