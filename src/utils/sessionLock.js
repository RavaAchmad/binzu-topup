// Menjaga satu folder session hanya dipakai oleh satu proses bot.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

function isProcessAlive(pid) {
  if (!pid || pid === process.pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function acquireSessionLock(sessionDir, logger) {
  await fs.mkdir(sessionDir, { recursive: true });
  const lockFile = path.join(sessionDir, '.session.lock');
  const token = crypto.randomBytes(8).toString('hex');
  const payload = {
    pid: process.pid,
    token,
    createdAt: new Date().toISOString()
  };

  try {
    const existingRaw = await fs.readFile(lockFile, 'utf8');
    const existing = JSON.parse(existingRaw);
    if (isProcessAlive(existing.pid)) {
      throw new Error(`Session sedang dipakai proses PID ${existing.pid}. Jalankan hanya satu instance bot untuk folder session ini.`);
    }
    logger.warn('Session lock lama dianggap stale, akan ditimpa.');
  } catch (error) {
    if (error.code !== 'ENOENT' && !error.message.includes('Unexpected')) throw error;
  }

  await fs.writeFile(lockFile, JSON.stringify(payload, null, 2));

  async function release() {
    try {
      const current = JSON.parse(await fs.readFile(lockFile, 'utf8'));
      if (current.token === token) await fs.unlink(lockFile);
    } catch {
      // Lock cleanup best-effort.
    }
  }

  process.once('exit', () => {
    fs.unlink(lockFile).catch(() => undefined);
  });
  process.once('SIGINT', async () => {
    await release();
    process.exit(130);
  });
  process.once('SIGTERM', async () => {
    await release();
    process.exit(143);
  });

  return release;
}
