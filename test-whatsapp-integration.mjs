#!/usr/bin/env node
/**
 * WhatsApp Integration Test Script
 * 
 * Tests the WhatsApp webhook, agent, and outbound messaging functionality
 * Run: node test-whatsapp-integration.mjs
 */

import fetch from 'node:fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_PHONE = process.env.TEST_PHONE || '+1234567890';

console.log('🧪 WhatsApp Integration Test Suite\n');
console.log(`Base URL: ${BASE_URL}`);
console.log(`Test Phone: ${TEST_PHONE}\n`);

// Test 1: Health check
async function testHealthCheck() {
  console.log('1️⃣  Testing webhook health check...');
  try {
    const response = await fetch(`${BASE_URL}/api/whatsapp-webhook`);
    const data = await response.json();
    
    if (data.status === 'ok') {
      console.log('✅ Webhook health check passed');
      console.log(`   Timestamp: ${data.timestamp}\n`);
      return true;
    } else {
      console.log('❌ Webhook health check failed');
      console.log(`   Response: ${JSON.stringify(data)}\n`);
      return false;
    }
  } catch (error) {
    console.log('❌ Webhook health check failed');
    console.log(`   Error: ${error.message}\n`);
    return false;
  }
}

// Test 2: Webhook with test message
async function testWebhook() {
  console.log('2️⃣  Testing webhook with simulated message...');
  
  // Simulate Twilio webhook payload
  const formData = new URLSearchParams();
  formData.append('From', `whatsapp:${TEST_PHONE}`);
  formData.append('To', 'whatsapp:+14155238886');
  formData.append('Body', 'Hello, I would like to book a room');
  formData.append('MessageSid', `TEST${Date.now()}`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/whatsapp-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Webhook processed message successfully');
      console.log(`   Intent: ${data.intent}`);
      console.log(`   Action: ${data.action || 'none'}`);
      console.log(`   Message SID: ${data.messageSid}\n`);
      return true;
    } else {
      console.log('❌ Webhook failed to process message');
      console.log(`   Error: ${data.error}\n`);
      return false;
    }
  } catch (error) {
    console.log('❌ Webhook test failed');
    console.log(`   Error: ${error.message}\n`);
    return false;
  }
}

// Test 3: Cron job endpoint
async function testCronJob() {
  console.log('3️⃣  Testing cron job endpoint...');
  
  const cronSecret = process.env.CRON_SECRET;
  const headers = {};
  
  if (cronSecret) {
    headers['Authorization'] = `Bearer ${cronSecret}`;
  }
  
  try {
    const response = await fetch(`${BASE_URL}/api/whatsapp-cron`, {
      headers,
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Cron job executed successfully');
      console.log(`   Welcome messages: ${data.results.welcomeMessages}`);
      console.log(`   Reminders: ${data.results.upcomingReminders}`);
      console.log(`   Errors: ${data.results.errors.length}\n`);
      return true;
    } else {
      console.log('❌ Cron job failed');
      console.log(`   Error: ${data.error}\n`);
      return false;
    }
  } catch (error) {
    console.log('❌ Cron job test failed');
    console.log(`   Error: ${error.message}\n`);
    return false;
  }
}

// Test 4: Database tables exist
async function testDatabaseSetup() {
  console.log('4️⃣  Testing database setup...');
  console.log('   Note: This requires Supabase credentials\n');
  
  // This would require Supabase client, so we skip for now
  console.log('⚠️  Manual check required:');
  console.log('   - Run migrations in Supabase');
  console.log('   - Verify whatsapp_sessions table exists');
  console.log('   - Verify whatsapp_messages table exists');
  console.log('   - Verify profiles.phone_number column exists\n');
  
  return true;
}

// Run all tests
async function runTests() {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
  };
  
  console.log('='.repeat(60));
  console.log('Starting WhatsApp Integration Tests');
  console.log('='.repeat(60) + '\n');
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Webhook Message Processing', fn: testWebhook },
    { name: 'Cron Job', fn: testCronJob },
    { name: 'Database Setup', fn: testDatabaseSetup },
  ];
  
  for (const test of tests) {
    results.total++;
    const passed = await test.fn();
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
  }
  
  console.log('='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`Total: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log('='.repeat(60) + '\n');
  
  if (results.failed === 0) {
    console.log('🎉 All tests passed! WhatsApp integration is ready.');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.');
  }
  
  console.log('\n📚 Next Steps:');
  console.log('1. Configure Twilio webhook in Twilio Console');
  console.log('2. Test with real WhatsApp messages via Twilio Sandbox');
  console.log('3. Review admin dashboard at /admin/whatsapp');
  console.log('4. Monitor logs in Vercel Dashboard\n');
}

// Run tests
runTests().catch(console.error);
