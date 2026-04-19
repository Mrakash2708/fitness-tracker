import { NextResponse } from 'next/server';
import { adminDb } from '../../../lib/firebase-admin';

export async function POST(request) {
  try {
    const { uid, steps, secret } = await request.json();

    // Verify a simple secret token so random people can't spam the endpoint
    if (secret !== process.env.SYNC_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!uid || typeof steps !== 'number') {
      return NextResponse.json({ error: 'Missing uid or steps' }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 500 });
    }

    // Update the steps for today in the user's progress document
    // We only update the 'steps' and 'updatedAt' fields to avoid overwriting other data
    const today = new Date().toISOString().split('T')[0];
    
    // We also need to make sure we don't accidentally overwrite a newer date's data
    // if the user hasn't opened the app today.
    // It's safer to just set the `steps`, `date`, and `updatedAt`.
    await adminDb.collection('trackers').doc(uid).set({
      steps: steps,
      date: today,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return NextResponse.json({ success: true, steps });
  } catch (error) {
    console.error('Apple Watch sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
