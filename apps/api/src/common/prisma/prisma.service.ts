import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const baseUrl = process.env.DATABASE_URL || '';
    const separator = baseUrl.includes('?') ? '&' : '?';

    // Detect Neon (pooler) vs local/Docker Postgres
    const isNeon = baseUrl.includes('neon.tech');

    // Neon pooler: lower connection_limit (pooler handles pooling),
    // longer connect_timeout (cold start can take 5-10s on free tier),
    // pgbouncer=true for compatibility with Neon's connection pooler
    const params = isNeon
      ? 'connection_limit=5&connect_timeout=30&pool_timeout=30&pgbouncer=true&sslmode=require'
      : 'connection_limit=15&pool_timeout=30';

    super({
      datasources: {
        db: { url: `${baseUrl}${separator}${params}` },
      },
    });

    if (isNeon) {
      this.logger.log('Prisma configured for Neon (pooler mode, connect_timeout=30s)');
    }
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Connect with retry and exponential backoff.
   * Critical for Neon free tier where cold starts can cause initial connection failures.
   */
  private async connectWithRetry(maxRetries = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Database connected successfully');
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (attempt === maxRetries) {
          this.logger.error(`Database connection failed after ${maxRetries} attempts: ${message}`);
          throw error;
        }
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
        this.logger.warn(`Database connection attempt ${attempt}/${maxRetries} failed: ${message}. Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  /**
   * Execute a DB operation with automatic retry on transient connection errors.
   * Use this for critical operations that should survive brief Neon suspensions.
   */
  async executeWithRetry<T>(operation: () => Promise<T>, maxRetries = 2): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        const isTransient = this.isTransientError(error);
        if (!isTransient || attempt > maxRetries) throw error;

        const delay = 2000 * attempt;
        this.logger.warn(`Transient DB error (attempt ${attempt}/${maxRetries + 1}): ${error.message}. Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw new Error('executeWithRetry: unreachable');
  }

  private isTransientError(error: any): boolean {
    const msg = (error.message || '').toLowerCase();
    return (
      msg.includes("can't reach database server") ||
      msg.includes('connection timed out') ||
      msg.includes('connection refused') ||
      msg.includes('econnreset') ||
      msg.includes('econnrefused') ||
      msg.includes('prepared statement') ||
      error.code === 'P1001' || // Can't reach DB
      error.code === 'P1002' || // DB server timed out
      error.code === 'P2024'    // Timed out fetching connection from pool
    );
  }
}
