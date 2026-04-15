import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// ── CORS helper ──────────────────────────────────────────────────────
function cors(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

// ── OPTIONS (pre-flight) ─────────────────────────────────────────────
export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 200 }));
}

// ── Demo user data ──────────────────────────────────────────────────
const demoUsers = {
  buyer: {
    id: 'b1',
    name: 'Bengaluru Fresh Foods',
    email: 'buyer@farmbid.in',
    role: 'buyer',
    walletBalance: 0,
    did: 'did:farmbid:buyer:0x1a2b3c4d5e6f',
    profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
  },
  farmer: {
    id: 'f1',
    name: 'Ramappa Gowda',
    email: 'farmer@farmbid.in',
    role: 'farmer',
    walletBalance: 0,
    did: 'did:farmbid:farmer:0x7a8b9c0d1e2f',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  },
  admin: {
    id: 'a1',
    name: 'Admin User',
    email: 'admin@farmbid.in',
    role: 'admin',
    walletBalance: 0,
    did: 'did:farmbid:admin:0x3e4f5a6b7c8d',
    profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  },
};

// ── Auth route handlers ─────────────────────────────────────────────
async function handleAuth(subPath, request) {
  if (subPath === '/auth/demo-login' && request.method === 'POST') {
    const { role } = await request.json();
    const user = demoUsers[role] || demoUsers.buyer;
    return cors(
      NextResponse.json({
        success: true,
        token: `demo_token_${uuidv4()}`,
        user,
      })
    );
  }

  if (subPath === '/auth/login' && request.method === 'POST') {
    const { email, password } = await request.json();
    // Demo: accept any credentials, match by email or default to buyer
    const matched =
      Object.values(demoUsers).find((u) => u.email === email) || demoUsers.buyer;
    return cors(
      NextResponse.json({
        success: true,
        token: `token_${uuidv4()}`,
        user: matched,
      })
    );
  }

  if (subPath === '/auth/signup' && request.method === 'POST') {
    const body = await request.json();
    const newUser = {
      id: uuidv4(),
      name: body.name || 'New User',
      email: body.email,
      role: body.userType || 'buyer',
      walletBalance: 0,
      did: `did:farmbid:${body.userType || 'buyer'}:0x${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      profileImage:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    };

    const credential = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential', 'FarmBidIdentity'],
      issuer: 'did:farmbid:issuer:polygon',
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: newUser.did,
        name: newUser.name,
        role: newUser.role,
      },
    };

    return cors(
      NextResponse.json({
        success: true,
        token: `token_${uuidv4()}`,
        user: newUser,
        credential,
      })
    );
  }

  return null; // not an auth route
}

// ── Generic handler (routes everything) ─────────────────────────────
async function handler(request, { params }) {
  const { path = [] } = await params;
  const subPath = `/${path.join('/')}`;

  try {
    // 1. Handle auth routes locally (no backend needed)
    /* Disable local auth mock - forwarding to real backend
    if (subPath.startsWith('/auth')) {
      const authResponse = await handleAuth(subPath, request);
      if (authResponse) return authResponse;
      return cors(NextResponse.json({ error: 'Unknown auth route' }, { status: 404 }));
    }
    */

    // 2. Proxy everything else to the backend
    const backendUrl =
      process.env.BACKEND_URL || 'http://localhost:3001/api';
    const targetUrl = `${backendUrl}${subPath}`;
    const url = new URL(request.url);
    const queryString = url.search;

    const fetchOptions = {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('authorization') || '',
      },
    };

    // Forward body for methods that have one
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        fetchOptions.body = await request.text();
      } catch {
        // no body
      }
    }

    const backendRes = await fetch(`${targetUrl}${queryString}`, fetchOptions);
    const data = await backendRes.json();

    return cors(NextResponse.json(data, { status: backendRes.status }));
  } catch (error) {
    console.error('API Proxy Error:', error);
    return cors(
      NextResponse.json(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      )
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
