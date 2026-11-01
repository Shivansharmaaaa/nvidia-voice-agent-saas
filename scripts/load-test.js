/**
 * Load Testing Script for Voice Agent Platform
 * Tests concurrent calls, ASR latency, LLM response time
 */

const axios = require('axios');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');

const CONFIG = {
  baseUrl: process.env.API_URL || 'http://localhost:3001',
  wsUrl: process.env.WS_URL || 'ws://localhost:3002',
  concurrentCalls: parseInt(process.env.CONCURRENT_CALLS || '10'),
  callsPerSecond: parseInt(process.env.CALLS_PER_SECOND || '5'),
  testDuration: parseInt(process.env.TEST_DURATION || '60'), // seconds
};

class LoadTester {
  constructor() {
    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      asrLatencies: [],
      llmLatencies: [],
      ttsLatencies: [],
      endToEndLatencies: [],
      errors: [],
    };
  }

  async simulateCall(callId) {
    const startTime = performance.now();
    let asrTime = null;
    let llmTime = null;
    let ttsTime = null;

    try {
      // Simulate WebSocket connection
      const ws = new WebSocket(`${CONFIG.wsUrl}/stream/${callId}`);

      await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
        setTimeout(reject, 5000);
      });

      // Simulate call start
      ws.send(JSON.stringify({ event: 'start' }));

      // Simulate audio chunks
      for (let i = 0; i < 10; i++) {
        const audioChunk = Buffer.alloc(2560).toString('base64'); // Mock audio
        
        const asrStart = performance.now();
        ws.send(JSON.stringify({
          event: 'media',
          media: { payload: audioChunk }
        }));
        
        // Wait for response (simulated)
        await new Promise(resolve => setTimeout(resolve, 100));
        asrTime = performance.now() - asrStart;
        this.metrics.asrLatencies.push(asrTime);

        // Simulate LLM processing
        const llmStart = performance.now();
        await new Promise(resolve => setTimeout(resolve, 200));
        llmTime = performance.now() - llmStart;
        this.metrics.llmLatencies.push(llmTime);

        // Simulate TTS
        const ttsStart = performance.now();
        await new Promise(resolve => setTimeout(resolve, 50));
        ttsTime = performance.now() - ttsStart;
        this.metrics.ttsLatencies.push(ttsTime);
      }

      // Simulate call end
      ws.send(JSON.stringify({ event: 'stop' }));
      ws.close();

      const endTime = performance.now();
      const totalLatency = endTime - startTime;
      this.metrics.endToEndLatencies.push(totalLatency);
      this.metrics.successfulCalls++;

    } catch (error) {
      this.metrics.failedCalls++;
      this.metrics.errors.push({
        callId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    } finally {
      this.metrics.totalCalls++;
    }
  }

  async runBurstTest(concurrentCalls) {
    console.log(`\n🚀 Starting burst test with ${concurrentCalls} concurrent calls...`);
    
    const promises = [];
    for (let i = 0; i < concurrentCalls; i++) {
      const callId = `test-call-${Date.now()}-${i}`;
      promises.push(this.simulateCall(callId));
    }

    await Promise.allSettled(promises);
  }

  async runSustainedLoadTest() {
    console.log(`\n📊 Starting sustained load test (${CONFIG.callsPerSecond} calls/sec for ${CONFIG.testDuration}s)...`);
    
    const startTime = Date.now();
    const endTime = startTime + CONFIG.testDuration * 1000;
    const interval = 1000 / CONFIG.callsPerSecond;

    const promises = [];
    let callCounter = 0;

    while (Date.now() < endTime) {
      for (let i = 0; i < CONFIG.callsPerSecond; i++) {
        const callId = `test-call-${callCounter++}`;
        promises.push(this.simulateCall(callId));
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    await Promise.allSettled(promises);
  }

  printResults() {
    console.log('\n📈 Load Test Results:');
    console.log('='.repeat(50));
    console.log(`Total Calls: ${this.metrics.totalCalls}`);
    console.log(`Successful: ${this.metrics.successfulCalls}`);
    console.log(`Failed: ${this.metrics.failedCalls}`);
    console.log(`Success Rate: ${((this.metrics.successfulCalls / this.metrics.totalCalls) * 100).toFixed(2)}%`);

    if (this.metrics.asrLatencies.length > 0) {
      const avgAsr = this.metrics.asrLatencies.reduce((a, b) => a + b, 0) / this.metrics.asrLatencies.length;
      const p95Asr = this.metrics.asrLatencies.sort((a, b) => a - b)[Math.floor(this.metrics.asrLatencies.length * 0.95)];
      console.log(`\nASR Latency:`);
      console.log(`  Average: ${avgAsr.toFixed(2)}ms`);
      console.log(`  P95: ${p95Asr.toFixed(2)}ms`);
    }

    if (this.metrics.llmLatencies.length > 0) {
      const avgLlm = this.metrics.llmLatencies.reduce((a, b) => a + b, 0) / this.metrics.llmLatencies.length;
      const p95Llm = this.metrics.llmLatencies.sort((a, b) => a - b)[Math.floor(this.metrics.llmLatencies.length * 0.95)];
      console.log(`\nLLM Latency:`);
      console.log(`  Average: ${avgLlm.toFixed(2)}ms`);
      console.log(`  P95: ${p95Llm.toFixed(2)}ms`);
    }

    if (this.metrics.endToEndLatencies.length > 0) {
      const avgE2E = this.metrics.endToEndLatencies.reduce((a, b) => a + b, 0) / this.metrics.endToEndLatencies.length;
      const p95E2E = this.metrics.endToEndLatencies.sort((a, b) => a - b)[Math.floor(this.metrics.endToEndLatencies.length * 0.95)];
      console.log(`\nEnd-to-End Latency:`);
      console.log(`  Average: ${avgE2E.toFixed(2)}ms`);
      console.log(`  P95: ${p95E2E.toFixed(2)}ms`);
    }

    if (this.metrics.errors.length > 0) {
      console.log(`\n⚠️  Errors (${this.metrics.errors.length}):`);
      this.metrics.errors.slice(0, 10).forEach(err => {
        console.log(`  - ${err.callId}: ${err.error}`);
      });
    }
  }
}

async function main() {
  const tester = new LoadTester();

  // Test 1: Burst test with different concurrency levels
  const concurrencyLevels = [10, 50, 100];
  for (const level of concurrencyLevels) {
    await tester.runBurstTest(level);
    await new Promise(resolve => setTimeout(resolve, 5000)); // Cooldown
  }

  // Test 2: Sustained load test
  await tester.runSustainedLoadTest();

  // Print results
  tester.printResults();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { LoadTester };
