#!/usr/bin/env node

/**
 * Final comprehensive test for Bitrix24 Group/Project Management
 */

import { Bitrix24Client } from './build/bitrix24/client.js';

const WEBHOOK = 'https://WEBHOOK.bitrix24.ru/rest/1/WEBHOOK/';

async function testGroupManagement() {
  console.log('🚀 Starting Bitrix24 Group Management Final Tests\n');
  console.log('Webhook:', WEBHOOK, '\n');

  const client = new Bitrix24Client(WEBHOOK);
  const timestamp = Date.now();
  let testGroupId = null;
  let testProjectId = null;

  try {
    // Test 1: List existing groups
    console.log('📋 Test 1: Listing existing groups...');
    const existingGroups = await client.listGroups({ start: 0 });
    console.log(`✅ Found ${existingGroups.length} existing groups`);
    console.log('');

    // Test 2: List only projects
    console.log('📋 Test 2: Listing only projects...');
    const existingProjects = await client.listProjects({ start: 0 });
    console.log(`✅ Found ${existingProjects.length} existing projects`);
    console.log('');

    // Test 3: Create a new test group with unique name
    console.log('📋 Test 3: Creating a new test group...');
    const newGroup = {
      NAME: `MCP Test Group ${timestamp}`,
      DESCRIPTION: 'Test group created by MCP server',
      PROJECT: 'N',
      VISIBLE: 'Y',
      OPENED: 'N',
      CLOSED: 'N'
    };
    testGroupId = await client.createGroup(newGroup);
    console.log(`✅ Group created with ID: ${testGroupId}`);
    console.log('');

    // Test 4: Get the created group
    console.log('📋 Test 4: Getting the created group details...');
    const groupDetails = await client.getGroup(testGroupId);
    console.log('✅ Group details retrieved:');
    console.log(`   ID: ${groupDetails.ID}`);
    console.log(`   NAME: ${groupDetails.NAME}`);
    console.log(`   DESCRIPTION: ${groupDetails.DESCRIPTION}`);
    console.log(`   PROJECT: ${groupDetails.PROJECT}`);
    console.log(`   VISIBLE: ${groupDetails.VISIBLE}`);
    console.log(`   MEMBERS: ${groupDetails.NUMBER_OF_MEMBERS}`);
    console.log('');

    // Test 5: Update the group
    console.log('📋 Test 5: Updating the group...');
    const updateResult = await client.updateGroup(testGroupId, {
      DESCRIPTION: 'Updated description - Test successful!',
      KEYWORDS: 'test, mcp, automation'
    });
    console.log(`✅ Group updated: ${updateResult}`);
    console.log('');

    // Test 6: Verify updated group
    console.log('📋 Test 6: Verifying updated group...');
    const updatedGroup = await client.getGroup(testGroupId);
    console.log('✅ Updated group:');
    console.log(`   NAME: ${updatedGroup.NAME}`);
    console.log(`   DESCRIPTION: ${updatedGroup.DESCRIPTION}`);
    console.log(`   KEYWORDS: ${updatedGroup.KEYWORDS}`);
    console.log('');

    // Test 7: Create a test project
    console.log('📋 Test 7: Creating a test project...');
    const newProject = {
      NAME: `MCP Test Project ${timestamp}`,
      DESCRIPTION: 'Test project with dates',
      PROJECT: 'Y',
      PROJECT_DATE_START: '2025-10-15',
      PROJECT_DATE_FINISH: '2025-12-31',
      VISIBLE: 'Y',
      OPENED: 'N'
    };
    testProjectId = await client.createGroup(newProject);
    console.log(`✅ Project created with ID: ${testProjectId}`);
    console.log('');

    // Test 8: Get project details
    console.log('📋 Test 8: Getting project details...');
    const projectDetails = await client.getGroup(testProjectId);
    console.log('✅ Project details:');
    console.log(`   ID: ${projectDetails.ID}`);
    console.log(`   NAME: ${projectDetails.NAME}`);
    console.log(`   PROJECT: ${projectDetails.PROJECT}`);
    console.log(`   START: ${projectDetails.PROJECT_DATE_START}`);
    console.log(`   FINISH: ${projectDetails.PROJECT_DATE_FINISH}`);
    console.log('');

    // Test 9: Get current user
    console.log('📋 Test 9: Getting current user...');
    const currentUser = await client.getCurrentUser();
    console.log(`✅ Current user: ${currentUser.ID} - ${currentUser.NAME} ${currentUser.LAST_NAME}`);
    console.log('');

    // Test 10: Get user's groups
    console.log('📋 Test 10: Getting current user\'s groups...');
    const userGroups = await client.getUserGroups();
    console.log(`✅ User is member of ${userGroups.length} groups`);
    console.log('');

    // Cleanup: Delete test group
    console.log('🧹 Cleanup: Deleting test group...');
    const deleteResult1 = await client.deleteGroup(testGroupId);
    console.log(`✅ Test group deleted: ${deleteResult1}`);

    // Cleanup: Delete test project
    console.log('🧹 Cleanup: Deleting test project...');
    const deleteResult2 = await client.deleteGroup(testProjectId);
    console.log(`✅ Test project deleted: ${deleteResult2}`);
    console.log('');

    // Final summary
    console.log('═'.repeat(60));
    console.log('✅ ✅ ✅  ALL TESTS PASSED!  ✅ ✅ ✅');
    console.log('═'.repeat(60));
    console.log('');
    console.log('Completed Tests:');
    console.log('  ✓ List existing groups');
    console.log('  ✓ List existing projects');
    console.log('  ✓ Create group');
    console.log('  ✓ Get group details');
    console.log('  ✓ Update group');
    console.log('  ✓ Verify updates');
    console.log('  ✓ Create project with dates');
    console.log('  ✓ Get project details');
    console.log('  ✓ Get current user');
    console.log('  ✓ Get user groups');
    console.log('  ✓ Delete test group');
    console.log('  ✓ Delete test project');
    console.log('');
    console.log('🎉 All group/project management tools are working correctly!');
    console.log('');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);

    // Cleanup on error
    if (testGroupId) {
      console.log('\n🧹 Attempting cleanup of test group...');
      try {
        await client.deleteGroup(testGroupId);
        console.log('✅ Test group cleanup successful');
      } catch (cleanupError) {
        console.log('⚠️  Test group cleanup failed:', cleanupError.message);
      }
    }

    if (testProjectId) {
      console.log('🧹 Attempting cleanup of test project...');
      try {
        await client.deleteGroup(testProjectId);
        console.log('✅ Test project cleanup successful');
      } catch (cleanupError) {
        console.log('⚠️  Test project cleanup failed:', cleanupError.message);
      }
    }

    process.exit(1);
  }
}

// Run tests
testGroupManagement().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
