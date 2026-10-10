/**
 * videoRecorderService.ts
 * SAMVARTAKA AI — High-Definition 1080p 60 FPS Simulation Video Capture Service
 * 
 * Implements Supreme Master Plan 2 video export engine:
 * Captures WebGL canvas output at 60 FPS using MediaRecorder API, muxes optional
 * spatial Web Audio streams, and produces hardware-accelerated video downloads.
 */

export interface VideoRecordingOptions {
  fps?: number;
  mimeType?: string;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
  audioStream?: MediaStream | null;
  onTimeUpdate?: (secondsElapsed: number) => void;
  onStatusChange?: (status: 'idle' | 'recording' | 'processing' | 'finished' | 'error', errorMsg?: string) => void;
}

export class VideoRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingTimer: NodeJS.Timeout | null = null;
  private elapsedSeconds = 0;
  private status: 'idle' | 'recording' | 'processing' | 'finished' | 'error' = 'idle';

  /**
   * Determine best supported MIME type for video recording
   */
  public static getSupportedMimeType(): string {
    if (typeof MediaRecorder === 'undefined') return 'video/webm';

    const preferredTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4;codecs=avc1',
      'video/mp4',
    ];

    for (const type of preferredTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'video/webm';
  }

  /**
   * Check if client browser supports canvas capture stream
   */
  public static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof HTMLCanvasElement !== 'undefined' &&
      'captureStream' in HTMLCanvasElement.prototype &&
      typeof MediaRecorder !== 'undefined'
    );
  }

  /**
   * Start recording from an HTML5 Canvas element
   */
  public startRecording(
    canvas: HTMLCanvasElement,
    options: VideoRecordingOptions = {}
  ): boolean {
    if (!VideoRecorderService.isSupported()) {
      options.onStatusChange?.('error', 'Browser does not support canvas video capture.');
      return false;
    }

    try {
      const fps = options.fps || 60;
      const canvasStream = canvas.captureStream(fps);

      // Merge audio tracks if provided
      let combinedStream = canvasStream;
      if (options.audioStream && options.audioStream.getAudioTracks().length > 0) {
        combinedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...options.audioStream.getAudioTracks(),
        ]);
      }

      const mimeType = options.mimeType || VideoRecorderService.getSupportedMimeType();
      const recorderOptions: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: options.videoBitsPerSecond || 8_000_000, // 8 Mbps for high quality 1080p
      };

      if (options.audioBitsPerSecond) {
        recorderOptions.audioBitsPerSecond = options.audioBitsPerSecond;
      }

      this.recordedChunks = [];
      this.elapsedSeconds = 0;
      this.mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.status = 'finished';
        options.onStatusChange?.('finished');
      };

      this.mediaRecorder.onerror = (e: Event) => {
        this.status = 'error';
        options.onStatusChange?.('error', 'MediaRecorder recording error occurred');
      };

      // Request data in 1000ms slices for resilience
      this.mediaRecorder.start(1000);
      this.status = 'recording';
      options.onStatusChange?.('recording');

      // Setup countdown/elapsed timer
      this.recordingTimer = setInterval(() => {
        this.elapsedSeconds += 1;
        options.onTimeUpdate?.(this.elapsedSeconds);
      }, 1000);

      return true;
    } catch (err: unknown) {
      this.status = 'error';
      const msg = err instanceof Error ? err.message : 'Unknown recording error';
      options.onStatusChange?.('error', msg);
      return false;
    }
  }

  /**
   * Stop recording and retrieve Blob
   */
  public async stopRecording(): Promise<Blob | null> {
    if (!this.mediaRecorder || this.status !== 'recording') {
      return null;
    }

    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }

    return new Promise((resolve) => {
      this.status = 'processing';

      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        this.status = 'finished';
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Stop recording and automatically trigger browser download
   */
  public async stopAndDownload(filename: string = 'SAMVARTAKA_3D_SIM_1080p_60fps.webm'): Promise<boolean> {
    const blob = await this.stopRecording();
    if (!blob) return false;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);

    return true;
  }

  /**
   * Cancel and cleanup recording
   */
  public cancel(): void {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
    if (this.mediaRecorder && this.status === 'recording') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.recordedChunks = [];
    this.status = 'idle';
  }

  public getStatus() {
    return this.status;
  }

  public getElapsedSeconds() {
    return this.elapsedSeconds;
  }
}

export const videoRecorder = new VideoRecorderService();
