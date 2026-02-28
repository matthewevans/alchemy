import { compressSDP, decompressSDP } from './codec';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const ICE_TIMEOUT_MS = 15_000;
const CHANNEL_TIMEOUT_MS = 30_000;

export interface PeerConnection {
  pc: RTCPeerConnection;
  channel: RTCDataChannel;
}

/** Wait for ICE gathering to complete, with timeout. */
function waitForICEComplete(pc: RTCPeerConnection): Promise<void> {
  return new Promise((resolve, reject) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error('ICE gathering timed out. Your network may be blocking peer-to-peer connections.'));
    }, ICE_TIMEOUT_MS);

    pc.addEventListener('icegatheringstatechange', () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
}

/** Decode a compressed SDP code, with user-friendly error messages. */
async function decodeSDP(code: string, label: string): Promise<RTCSessionDescriptionInit> {
  let sdpJson: string;
  try {
    sdpJson = await decompressSDP(code);
  } catch {
    throw new Error(`Invalid ${label} code. Please check that you copied the full code and try again.`);
  }

  try {
    return JSON.parse(sdpJson) as RTCSessionDescriptionInit;
  } catch {
    throw new Error(`Invalid ${label} code. The code appears to be corrupted.`);
  }
}

/**
 * Host creates an offer. Returns compressed invite code and a function
 * to complete the connection with the guest's answer code.
 */
export async function createHostOffer(): Promise<{
  inviteCode: string;
  completeConnection: (answerCode: string) => Promise<PeerConnection>;
}> {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const channel = pc.createDataChannel('game', { ordered: true });

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForICEComplete(pc);

  const inviteCode = await compressSDP(JSON.stringify(pc.localDescription));

  const completeConnection = async (answerCode: string): Promise<PeerConnection> => {
    const answerSDP = await decodeSDP(answerCode, 'answer');
    await pc.setRemoteDescription(answerSDP);

    // Wait for data channel to open
    await new Promise<void>((resolve, reject) => {
      if (channel.readyState === 'open') {
        resolve();
        return;
      }
      channel.addEventListener('open', () => resolve(), { once: true });
      channel.addEventListener('error', (e) => reject(e), { once: true });
      setTimeout(() => reject(new Error('Data channel open timeout')), CHANNEL_TIMEOUT_MS);
    });

    return { pc, channel };
  };

  return { inviteCode, completeConnection };
}

/**
 * Guest joins with the host's invite code. Returns compressed answer code
 * and the PeerConnection (data channel opens after host applies answer).
 */
export async function joinWithOffer(inviteCode: string): Promise<{
  answerCode: string;
  waitForConnection: () => Promise<PeerConnection>;
}> {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  const offerSDP = await decodeSDP(inviteCode, 'invite');
  await pc.setRemoteDescription(offerSDP);

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitForICEComplete(pc);

  const answerCode = await compressSDP(JSON.stringify(pc.localDescription));

  const waitForConnection = (): Promise<PeerConnection> => {
    return new Promise((resolve, reject) => {
      pc.addEventListener('datachannel', (event) => {
        const channel = event.channel;
        if (channel.readyState === 'open') {
          resolve({ pc, channel });
          return;
        }
        channel.addEventListener('open', () => resolve({ pc, channel }), { once: true });
        channel.addEventListener('error', (e) => reject(e), { once: true });
      }, { once: true });

      setTimeout(() => reject(new Error('Data channel timeout')), CHANNEL_TIMEOUT_MS);
    });
  };

  return { answerCode, waitForConnection };
}
