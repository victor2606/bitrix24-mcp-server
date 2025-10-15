import { bitrix24Client } from '../build/bitrix24/client.js';

async function testGetAllUsers() {
  try {
    console.log('🚀 Testing getAllUsers method...\n');

    // Test 1: Get only active users (default behavior)
    console.log('1. Testing getAllUsers(false) - only active users...');
    const activeUsers = await bitrix24Client.getAllUsers(false);

    if (!Array.isArray(activeUsers)) {
      console.log('❌ getAllUsers(false) did not return an array');
      return;
    }

    // Verify all returned users are active
    const hasInactiveUsers = activeUsers.some(user => user.ACTIVE === false);
    if (hasInactiveUsers) {
      console.log('❌ getAllUsers(false) returned inactive users');
      return;
    }

    console.log(`✅ getAllUsers(false) returned ${activeUsers.length} active users`);
    if (activeUsers.length > 0) {
      const sampleUser = activeUsers[0];
      console.log(`   Sample user: ${sampleUser.NAME || ''} ${sampleUser.LAST_NAME || ''} (ID: ${sampleUser.ID}, ACTIVE: ${sampleUser.ACTIVE})`);
    }

    // Test 2: Get all users including inactive
    console.log('\n2. Testing getAllUsers(true) - all users including inactive...');
    const allUsers = await bitrix24Client.getAllUsers(true);

    if (!Array.isArray(allUsers)) {
      console.log('❌ getAllUsers(true) did not return an array');
      return;
    }

    console.log(`✅ getAllUsers(true) returned ${allUsers.length} total users`);

    // Count inactive users
    const inactiveCount = allUsers.filter(user => user.ACTIVE === false).length;
    const activeCount = allUsers.filter(user => user.ACTIVE !== false).length;

    console.log(`   Active users: ${activeCount}`);
    console.log(`   Inactive users: ${inactiveCount}`);

    // Verify that allUsers >= activeUsers
    if (allUsers.length < activeUsers.length) {
      console.log('❌ getAllUsers(true) returned fewer users than getAllUsers(false)');
      return;
    }

    console.log('✅ getAllUsers(true) returned >= getAllUsers(false) count');

    // Test 3: Test default parameter (should be same as false)
    console.log('\n3. Testing getAllUsers() - default parameter...');
    const defaultUsers = await bitrix24Client.getAllUsers();

    if (defaultUsers.length !== activeUsers.length) {
      console.log('❌ getAllUsers() default behavior differs from getAllUsers(false)');
      console.log(`   Default: ${defaultUsers.length} users, Explicit false: ${activeUsers.length} users`);
      return;
    }

    console.log(`✅ getAllUsers() default returns same count as getAllUsers(false): ${defaultUsers.length} users`);

    console.log('\n🎉 All getAllUsers tests passed!');
    console.log('\n📊 Summary:');
    console.log(`   Total users in system: ${allUsers.length}`);
    console.log(`   Active users: ${activeCount}`);
    console.log(`   Inactive users: ${inactiveCount}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testGetAllUsers();
}

export { testGetAllUsers };
