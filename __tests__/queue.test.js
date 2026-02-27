const { queue } = require('../index');

// ===== TEST CONFIGURATION =====
const TEST_CONFIG = {
  // Time tolerances (in milliseconds)
  TIME_TOLERANCE_MS: 100,           // ±100ms for timing checks
  INTERVAL_MIN_MS: 900,             // Minimum interval between messages
  INTERVAL_MAX_MS: 1200,            // Maximum interval between messages
  IMMEDIATE_MAX_MS: 50,             // Max time for immediate operations
  PARALLEL_MAX_MS: 100,             // Max time for parallel operations

  // Test 1: Non-group chat with RPS_CHAT=1
  TEST1_MESSAGE_COUNT: 5,
  TEST1_RPS: 30,
  TEST1_RPS_CHAT: 1,
  TEST1_EXPECTED_TOTAL_MIN_MS: 3800,
  TEST1_EXPECTED_TOTAL_MAX_MS: 5000,

  // Test 2: Group chat with RPM limit
  TEST2_MESSAGE_COUNT: 5,
  TEST2_RPS: 30,
  TEST2_RPS_CHAT: 1,
  TEST2_RPM_CHAT: 3,                // Max 3 messages per minute
  TEST2_FIRST_BATCH_MAX_MS: 3500,   // First 3 messages should be quick
  TEST2_RPM_WAIT_MIN_MS: 59000,     // 4th message should wait ~60s
  TEST2_RPM_WAIT_MIN_MS_LAST: 60000, // 5th message should wait ~61s
  TEST2_TIMEOUT_MS: 70000,          // Test timeout

  // Test 3: Multiple groups
  TEST3_RPS: 30,
  TEST3_RPS_CHAT: 1,
  TEST3_RPM_CHAT: 20,

  // Test 4: Mixed group and non-group
  TEST4_RPS: 30,
  TEST4_RPS_CHAT: 1,
  TEST4_RPM_CHAT: 20,

  // Test 5: Priority handling
  TEST5_MESSAGE_COUNT: 5,
  TEST5_RPS: 30,
  TEST5_RPS_CHAT: 10,              // Fast processing to focus on priority
  TEST5_PRIORITIES: [3, 1, 4, 2, 1], // Send order
  TEST5_EXPECTED_ORDER: [3, 1, 1, 2, 4], // Expected processing order (1st immediate, rest sorted)

  // Test 6: Positive numeric ID (not a group, RPM should not apply)
  TEST6_MESSAGE_COUNT: 4,
  TEST6_RPS: 30,
  TEST6_RPS_CHAT: 10,
  TEST6_RPM_CHAT: 3,               // Would block 4th message if treated as group
  TEST6_MAX_MS: 500,               // Should complete in <500ms (no RPM applied, only RPS_CHAT intervals)

  // Test 7: Negative numeric ID (group, RPM should apply)
  TEST7_MESSAGE_COUNT: 5,
  TEST7_RPS: 30,
  TEST7_RPS_CHAT: 1,
  TEST7_RPM_CHAT: 3,
  TEST7_FIRST_BATCH_MAX_MS: 3500,
  TEST7_RPM_WAIT_MIN_MS: 59000,
  TEST7_RPM_WAIT_MIN_MS_LAST: 60000,
  TEST7_TIMEOUT_MS: 70000,
};
// ===== END CONFIGURATION =====

describe('Queue - Basic RPS_CHAT limiting', () => {

  test('Test 1: Non-group chat with RPS_CHAT=1 (5 messages, ~1 second intervals)', async () => {
    const start = Date.now();
    const timestamps = [];

    // Send messages to same chat with RPS_CHAT=1
    for (let i = 0; i < TEST_CONFIG.TEST1_MESSAGE_COUNT; i++) {
      await queue({
        RPS: TEST_CONFIG.TEST1_RPS,
        qname: 'jest-test1',
        to: '123',
        RPS_CHAT: TEST_CONFIG.TEST1_RPS_CHAT
      });
      timestamps.push(Date.now() - start);
    }

    // Check that all messages were sent
    expect(timestamps).toHaveLength(TEST_CONFIG.TEST1_MESSAGE_COUNT);

    // First message should be immediate (queue creation)
    expect(timestamps[0]).toBeLessThan(TEST_CONFIG.IMMEDIATE_MAX_MS);

    // Messages 2-N should be ~1 second apart (RPS_CHAT=1)
    for (let i = 1; i < timestamps.length; i++) {
      const interval = timestamps[i] - timestamps[i - 1];
      expect(interval).toBeGreaterThanOrEqual(TEST_CONFIG.INTERVAL_MIN_MS);
      expect(interval).toBeLessThanOrEqual(TEST_CONFIG.INTERVAL_MAX_MS);
    }

    // Total time should be ~4 seconds (4 intervals between 5 messages)
    const totalTime = Date.now() - start;
    expect(totalTime).toBeGreaterThanOrEqual(TEST_CONFIG.TEST1_EXPECTED_TOTAL_MIN_MS);
    expect(totalTime).toBeLessThanOrEqual(TEST_CONFIG.TEST1_EXPECTED_TOTAL_MAX_MS);

    console.log('Timestamps:', timestamps.map(t => `${t}ms`).join(', '));
    console.log(`Total time: ${totalTime}ms`);
  });

  test('Test 2: Group chat with low RPM limit (should rate limit)', async () => {
    const start = Date.now();
    const timestamps = [];

    // Send messages to group with RPM_CHAT limit
    for (let i = 0; i < TEST_CONFIG.TEST2_MESSAGE_COUNT; i++) {
      await queue({
        RPS: TEST_CONFIG.TEST2_RPS,
        qname: 'jest-test2',
        to: '-123',
        RPS_CHAT: TEST_CONFIG.TEST2_RPS_CHAT,
        RPM_CHAT: TEST_CONFIG.TEST2_RPM_CHAT
      });
      const elapsed = Date.now() - start;
      timestamps.push(elapsed);
      console.log(`Group message ${i + 1} sent at ${(elapsed / 1000).toFixed(1)}s`);
    }

    // Check that all messages were sent
    expect(timestamps).toHaveLength(TEST_CONFIG.TEST2_MESSAGE_COUNT);

    // First RPM_CHAT messages should be relatively quick
    expect(timestamps[TEST_CONFIG.TEST2_RPM_CHAT - 1]).toBeLessThan(TEST_CONFIG.TEST2_FIRST_BATCH_MAX_MS);

    // Messages beyond RPM_CHAT should be delayed until 60s window allows them
    expect(timestamps[TEST_CONFIG.TEST2_RPM_CHAT]).toBeGreaterThanOrEqual(TEST_CONFIG.TEST2_RPM_WAIT_MIN_MS);
    expect(timestamps[TEST_CONFIG.TEST2_RPM_CHAT + 1]).toBeGreaterThanOrEqual(TEST_CONFIG.TEST2_RPM_WAIT_MIN_MS_LAST);

    console.log('Timestamps:', timestamps.map(t => `${(t / 1000).toFixed(1)}s`).join(', '));
  }, TEST_CONFIG.TEST2_TIMEOUT_MS);

  test('Test 3: Multiple groups (independent limits)', async () => {
    const start = Date.now();

    // Send messages to two different groups in parallel
    await Promise.all([
      queue({
        RPS: TEST_CONFIG.TEST3_RPS,
        qname: 'jest-test3',
        to: '-111',
        RPS_CHAT: TEST_CONFIG.TEST3_RPS_CHAT,
        RPM_CHAT: TEST_CONFIG.TEST3_RPM_CHAT
      }),
      queue({
        RPS: TEST_CONFIG.TEST3_RPS,
        qname: 'jest-test3',
        to: '-222',
        RPS_CHAT: TEST_CONFIG.TEST3_RPS_CHAT,
        RPM_CHAT: TEST_CONFIG.TEST3_RPM_CHAT
      })
    ]);

    const elapsed = Date.now() - start;

    // Both should complete quickly (independent counters)
    expect(elapsed).toBeLessThan(TEST_CONFIG.PARALLEL_MAX_MS);

    console.log(`Both groups sent at ${elapsed}ms (independent counters)`);
  });

  test('Test 4: Mixed group and non-group', async () => {
    const start = Date.now();

    // Send to regular chat and group in parallel
    await Promise.all([
      queue({
        RPS: TEST_CONFIG.TEST4_RPS,
        qname: 'jest-test4',
        to: '456',
        RPS_CHAT: TEST_CONFIG.TEST4_RPS_CHAT
      }),
      queue({
        RPS: TEST_CONFIG.TEST4_RPS,
        qname: 'jest-test4',
        to: '-789',
        RPS_CHAT: TEST_CONFIG.TEST4_RPS_CHAT,
        RPM_CHAT: TEST_CONFIG.TEST4_RPM_CHAT
      })
    ]);

    const elapsed = Date.now() - start;

    // Both should complete quickly (non-group not affected by group limits)
    expect(elapsed).toBeLessThan(TEST_CONFIG.PARALLEL_MAX_MS);

    console.log(`Both sent at ${elapsed}ms (non-group not affected by group limits)`);
  });

  test('Test 5: Priority handling (lower number = higher priority)', async () => {
    const processedOrder = [];
    const start = Date.now();

    // Send all messages to SAME chat so they queue up and get sorted by priority
    // First message will be processed immediately, rest will be queued and sorted
    const promises = TEST_CONFIG.TEST5_PRIORITIES.map((priority, index) => {
      return queue({
        RPS: TEST_CONFIG.TEST5_RPS,
        qname: 'jest-test5',
        to: 'priority-test-chat', // Same chat for all to force queuing
        priority: priority,
        RPS_CHAT: TEST_CONFIG.TEST5_RPS_CHAT
      }).then(() => {
        processedOrder.push(priority);
        console.log(`Message with priority ${priority} processed (sent as #${index + 1})`);
      });
    });

    // Wait for all messages to complete
    await Promise.all(promises);

    const elapsed = Date.now() - start;

    // Check that all messages were processed
    expect(processedOrder).toHaveLength(TEST_CONFIG.TEST5_MESSAGE_COUNT);

    // Check full processing order matches expected
    expect(processedOrder).toEqual(TEST_CONFIG.TEST5_EXPECTED_ORDER);

    console.log(`Send order: [${TEST_CONFIG.TEST5_PRIORITIES.join(', ')}]`);
    console.log(`Processed order: [${processedOrder.join(', ')}]`);
    console.log(`Expected order: [${TEST_CONFIG.TEST5_EXPECTED_ORDER.join(', ')}]`);
    console.log(`Total time: ${elapsed}ms`);
  });

  test('Test 6: Positive numeric ID is not treated as group (RPM does not apply)', async () => {
    const start = Date.now();

    // Send 4 messages with RPM_CHAT=3 to a positive numeric ID
    // If it were treated as a group, the 4th message would wait ~60s
    for (let i = 0; i < TEST_CONFIG.TEST6_MESSAGE_COUNT; i++) {
      await queue({
        RPS: TEST_CONFIG.TEST6_RPS,
        qname: 'jest-test6',
        to: 123456,               // Positive number — not a group
        RPS_CHAT: TEST_CONFIG.TEST6_RPS_CHAT,
        RPM_CHAT: TEST_CONFIG.TEST6_RPM_CHAT
      });
    }

    const elapsed = Date.now() - start;

    // All 4 messages should complete quickly (RPM limit not applied to non-groups)
    expect(elapsed).toBeLessThan(TEST_CONFIG.TEST6_MAX_MS);

    console.log(`All ${TEST_CONFIG.TEST6_MESSAGE_COUNT} messages sent in ${elapsed}ms (no RPM applied)`);
  });

  test('Test 7: Negative numeric ID is treated as group (RPM applies)', async () => {
    const start = Date.now();
    const timestamps = [];

    // Send messages to a negative numeric group ID (not a string)
    for (let i = 0; i < TEST_CONFIG.TEST7_MESSAGE_COUNT; i++) {
      await queue({
        RPS: TEST_CONFIG.TEST7_RPS,
        qname: 'jest-test7',
        to: -654321,              // Negative number — treated as group
        RPS_CHAT: TEST_CONFIG.TEST7_RPS_CHAT,
        RPM_CHAT: TEST_CONFIG.TEST7_RPM_CHAT
      });
      const elapsed = Date.now() - start;
      timestamps.push(elapsed);
      console.log(`Group message ${i + 1} sent at ${(elapsed / 1000).toFixed(1)}s`);
    }

    expect(timestamps).toHaveLength(TEST_CONFIG.TEST7_MESSAGE_COUNT);

    // First RPM_CHAT messages should be quick
    expect(timestamps[TEST_CONFIG.TEST7_RPM_CHAT - 1]).toBeLessThan(TEST_CONFIG.TEST7_FIRST_BATCH_MAX_MS);

    // Messages beyond RPM_CHAT should be delayed (same as string group ID)
    expect(timestamps[TEST_CONFIG.TEST7_RPM_CHAT]).toBeGreaterThanOrEqual(TEST_CONFIG.TEST7_RPM_WAIT_MIN_MS);
    expect(timestamps[TEST_CONFIG.TEST7_RPM_CHAT + 1]).toBeGreaterThanOrEqual(TEST_CONFIG.TEST7_RPM_WAIT_MIN_MS_LAST);

    console.log('Timestamps:', timestamps.map(t => `${(t / 1000).toFixed(1)}s`).join(', '));
  }, TEST_CONFIG.TEST7_TIMEOUT_MS);

});
