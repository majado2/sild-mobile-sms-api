import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Button, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import SendSMS from 'react-native-send-sms';

type PendingSms = {
  id: number;
  to: string;
  message: string;
};

// Hard-coded backend base URL for PoC; change only if backend address differs.
const BASE_URL = 'https://slid.ethra2.com';
const POLL_INTERVAL = 3000;

const isAndroid = Platform.OS === 'android';
const STATUS_COLORS = {
  running: '#166534',
  idle: '#3f3f46',
  error: '#b91c1c',
};

export default function HomeScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastStatus, setLastStatus] = useState<string>('Agent stopped');
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef(false);

  const sendSms = useCallback((sms: PendingSms) => {
    return new Promise<string>((resolve, reject) => {
      SendSMS.send(sms.to, sms.message, (msg: string) => {
        if (msg === 'SMS sent') {
          resolve(msg);
        } else {
          reject(new Error(msg || 'SMS failed'));
        }
      });
    });
  }, []);

  const markSent = useCallback(async (id: number) => {
    await fetch(`${BASE_URL}/sms/${id}/sent`, { method: 'POST' });
  }, []);

  const pollOnce = useCallback(async () => {
    if (!runningRef.current) return;

    try {
      setIsSending(true);
      setLastStatus('Checking for pending SMS…');
      setError(null);

      const response = await fetch(`${BASE_URL}/sms/pending`);
      if (!response.ok) {
        throw new Error(`Pending SMS request failed (${response.status})`);
      }

      const sms = (await response.json()) as Partial<PendingSms>;
      if (!sms?.id || !sms.to || !sms.message) {
        setLastStatus('No pending SMS');
        return;
      }

      setLastStatus(`Sending to ${sms.to}`);
      await sendSms({ id: sms.id, to: sms.to, message: sms.message });
      setLastStatus('Updating server status…');
      await markSent(sms.id);
      setLastStatus('SMS sent and status updated');
      setLastMessage(`To ${sms.to}: ${sms.message}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setLastStatus('Agent encountered an error');
    } finally {
      setIsSending(false);
    }
  }, [markSent, sendSms]);

  const startAgent = useCallback(() => {
    if (isRunning) return;
    if (!isAndroid) {
      setError('SMS sending is Android-only.');
      return;
    }

    setIsRunning(true);
    runningRef.current = true;
    setLastStatus('Agent running');
    pollOnce();
    intervalRef.current = setInterval(pollOnce, POLL_INTERVAL);
  }, [isRunning, pollOnce]);

  const stopAgent = useCallback(() => {
    setIsRunning(false);
    runningRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setLastStatus('Agent stopped');
  }, []);

  useEffect(() => {
    return () => {
      stopAgent();
    };
  }, [stopAgent]);

  const statusColor = useMemo(() => {
    if (error) return STATUS_COLORS.error;
    if (isRunning) return STATUS_COLORS.running;
    return STATUS_COLORS.idle;
  }, [error, isRunning]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>SMS Agent Running</Text>
      <Text style={[styles.status, { color: statusColor }]}>{lastStatus}</Text>
      {lastMessage ? <Text style={styles.detail}>{lastMessage}</Text> : null}
      {error ? <Text style={styles.error}>Error: {error}</Text> : null}

      <View style={styles.buttonRow}>
        <View style={styles.button}>
          <Button title="Start" onPress={startAgent} disabled={isRunning} />
        </View>
        <View style={styles.button}>
          <Button title="Stop" onPress={stopAgent} disabled={!isRunning} color="#b91c1c" />
        </View>
      </View>

      {isSending ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" />
          <Text style={styles.detail}>Working…</Text>
        </View>
      ) : null}

      <Text style={styles.footer}>Polling every {POLL_INTERVAL / 1000} seconds from {BASE_URL}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  status: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  detail: {
    fontSize: 14,
    color: '#334155',
    textAlign: 'center',
  },
  error: {
    fontSize: 14,
    color: '#b91c1c',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    minWidth: 120,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  footer: {
    marginTop: 24,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});
