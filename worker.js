/* eslint-disable no-console */
const net = require('net');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yrydrbaduuezsvluppdg.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyeWRyYmFkdXVlenN2bHVwcGRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE4MTE3NywiZXhwIjoyMDg2NzU3MTc3fQ.2zXt9iCiRXR1VuLAsLQuy0flG3cxeUlt2Y3FRfrIYSg';
const PRINTER_IP = '192.168.0.31';
const PRINTER_PORT = 9100;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PRINTER_IP || !PRINTER_PORT) {
  console.error('Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PRINTER_IP, PRINTER_PORT');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let isPolling = false;

function buildEscPosPayload(content) {
  return Buffer.concat([
    Buffer.from([0x1b, 0x40]), // ESC @ initialize
    Buffer.from(`${content}\n\n`, 'utf8'),
    Buffer.from([0x1d, 0x56, 0x00]), // GS V 0 full cut
  ]);
}

function sendToPrinter(content) {
  const data = buildEscPosPayload(content);
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error('Printer timeout'));
    }, 8000);

    client.connect(PRINTER_PORT, PRINTER_IP, () => {
      client.write(data, (err) => {
        if (err) {
          clearTimeout(timeout);
          client.destroy();
          reject(err);
          return;
        }
        client.end();
      });
    });

    client.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    client.on('close', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function claimJob(jobId) {
  const { data, error } = await supabase
    .from('print_jobs')
    .update({ status: 'printing', error_message: null })
    .eq('id', jobId)
    .eq('status', 'pending')
    .select('id, table_number, content')
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function markPrinted(jobId) {
  const { error } = await supabase
    .from('print_jobs')
    .update({ status: 'printed', printed_at: new Date().toISOString(), error_message: null })
    .eq('id', jobId);
  if (error) throw error;
}

async function markFailed(jobId, message) {
  const { error } = await supabase
    .from('print_jobs')
    .update({
      status: 'failed',
      error_message: String(message || 'Unknown print error').slice(0, 500),
    })
    .eq('id', jobId);
  if (error) throw error;
}

async function processJob(job) {
  const claimed = await claimJob(job.id);
  if (!claimed) return;

  try {
    await sendToPrinter(claimed.content);
    await markPrinted(claimed.id);
    console.log(`Printed job ${claimed.id} for table ${claimed.table_number}`);
  } catch (error) {
    await markFailed(claimed.id, error && error.message ? error.message : String(error));
    console.error(`Failed job ${claimed.id}:`, error);
  }
}

async function poll() {
  if (isPolling) return;
  isPolling = true;
  try {
    const { data, error } = await supabase
      .from('print_jobs')
      .select('id')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Poll error:', error.message);
      return;
    }

    for (const job of data || []) {
      await processJob(job);
    }
  } catch (error) {
    console.error('Worker error:', error);
  } finally {
    isPolling = false;
  }
}

console.log(`Print worker started. Polling every 2s. Printer ${PRINTER_IP}:${PRINTER_PORT}`);
void poll();
setInterval(() => {
  void poll();
}, 2000);
