import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Settings from '@/models/Settings';
import { DEFAULT_SETTINGS } from '@/lib/constants';

export async function GET() {
  try {
    await connectDB();
    let settings = await Settings.findOne({ key: 'store_settings' }).lean();

    if (!settings) {
      settings = await Settings.create({ key: 'store_settings', ...DEFAULT_SETTINGS });
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ success: false, error: error.message, settings: DEFAULT_SETTINGS }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await connectDB();
    const body = await req.json();

    const updatedSettings = await Settings.findOneAndUpdate(
      { key: 'store_settings' },
      { ...body },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, settings: updatedSettings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  return PUT(req);
}
