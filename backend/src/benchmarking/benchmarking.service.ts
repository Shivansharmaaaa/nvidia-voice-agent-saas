import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Agent Performance Benchmarking Service
 * Tracks agent performance metrics and compares to industry benchmarks
 */

interface BenchmarkMetrics {
  completionRate: number;
  averageLatency: number;
  escalationRate: number;
  customerSatisfaction: number;
  costPerCall: number;
}

@Injectable()
export class BenchmarkingService {
  // Industry benchmarks
  private readonly BENCHMARKS = {
    completionRate: 0.85, // 85% target
    averageLatency: 500, // 500ms target
    escalationRate: 0.05, // 5% target
    customerSatisfaction: 4.0, // 4.0/5.0 target
    costPerCall: 0.50, // $0.50 target
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Calculate agent performance metrics
   */
  async calculateAgentMetrics(agentId: string, periodDays: number = 30) {
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const [calls, completedCalls, escalatedCalls, usageRecords] = await Promise.all([
      this.prisma.callSession.findMany({
        where: {
          agentId,
          startTime: { gte: startDate },
        },
      }),
      this.prisma.callSession.count({
        where: {
          agentId,
          status: 'completed',
          startTime: { gte: startDate },
        },
      }),
      this.prisma.callSession.count({
        where: {
          agentId,
          escalations: { gt: 0 },
          startTime: { gte: startDate },
        },
      }),
      this.prisma.usageRecord.findMany({
        where: {
          agentId,
          date: { gte: startDate },
        },
      }),
    ]);

    const totalCalls = calls.length;
    const completionRate = totalCalls > 0 ? completedCalls / totalCalls : 0;
    const escalationRate = totalCalls > 0 ? escalatedCalls / totalCalls : 0;

    // Calculate average latency
    const latencies = calls
      .map((c) => (c.latency as any)?.avg_asr_latency_ms || 0)
      .filter((l) => l > 0);
    const averageLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;

    // Calculate cost per call
    const totalCost = usageRecords.reduce((sum, r) => sum + r.cost, 0);
    const costPerCall = totalCalls > 0 ? totalCost / totalCalls : 0;

    // Customer satisfaction (would come from surveys)
    const customerSatisfaction = 4.2; // Placeholder

    return {
      agentId,
      period: { startDate, days: periodDays },
      metrics: {
        completionRate,
        averageLatency,
        escalationRate,
        customerSatisfaction,
        costPerCall,
      },
      benchmarks: this.BENCHMARKS,
      performance: this.calculatePerformance({
        completionRate,
        averageLatency,
        escalationRate,
        customerSatisfaction,
        costPerCall,
      }),
    };
  }

  /**
   * Compare agent to benchmarks
   */
  private calculatePerformance(metrics: BenchmarkMetrics) {
    return {
      completionRate: {
        value: metrics.completionRate,
        benchmark: this.BENCHMARKS.completionRate,
        status: metrics.completionRate >= this.BENCHMARKS.completionRate ? 'exceeds' : 'below',
        improvement: metrics.completionRate - this.BENCHMARKS.completionRate,
      },
      averageLatency: {
        value: metrics.averageLatency,
        benchmark: this.BENCHMARKS.averageLatency,
        status: metrics.averageLatency <= this.BENCHMARKS.averageLatency ? 'exceeds' : 'below',
        improvement: this.BENCHMARKS.averageLatency - metrics.averageLatency,
      },
      escalationRate: {
        value: metrics.escalationRate,
        benchmark: this.BENCHMARKS.escalationRate,
        status: metrics.escalationRate <= this.BENCHMARKS.escalationRate ? 'exceeds' : 'below',
        improvement: this.BENCHMARKS.escalationRate - metrics.escalationRate,
      },
      customerSatisfaction: {
        value: metrics.customerSatisfaction,
        benchmark: this.BENCHMARKS.customerSatisfaction,
        status: metrics.customerSatisfaction >= this.BENCHMARKS.customerSatisfaction ? 'exceeds' : 'below',
        improvement: metrics.customerSatisfaction - this.BENCHMARKS.customerSatisfaction,
      },
      costPerCall: {
        value: metrics.costPerCall,
        benchmark: this.BENCHMARKS.costPerCall,
        status: metrics.costPerCall <= this.BENCHMARKS.costPerCall ? 'exceeds' : 'below',
        improvement: this.BENCHMARKS.costPerCall - metrics.costPerCall,
      },
    };
  }

  /**
   * Get industry benchmarks for vertical
   */
  getVerticalBenchmarks(vertical: string): BenchmarkMetrics {
    const verticalBenchmarks: Record<string, BenchmarkMetrics> = {
      healthcare: {
        completionRate: 0.90,
        averageLatency: 400,
        escalationRate: 0.03,
        customerSatisfaction: 4.5,
        costPerCall: 0.60,
      },
      'real-estate': {
        completionRate: 0.80,
        averageLatency: 600,
        escalationRate: 0.10,
        customerSatisfaction: 4.0,
        costPerCall: 0.45,
      },
      logistics: {
        completionRate: 0.85,
        averageLatency: 500,
        escalationRate: 0.05,
        customerSatisfaction: 4.2,
        costPerCall: 0.40,
      },
      default: this.BENCHMARKS,
    };

    return verticalBenchmarks[vertical] || verticalBenchmarks.default;
  }
}
