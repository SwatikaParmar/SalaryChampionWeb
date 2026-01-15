import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Camera } from '@mediapipe/camera_utils';
import { FaceDetection } from '@mediapipe/face_detection';
import { ContentService } from '../../../service/content.service';

@Component({
  selector: 'app-selfie',
  templateUrl: './selfie.component.html',
  styleUrl: './selfie.component.css',
})
export class SelfieComponent implements OnDestroy {
  @ViewChild('video', { static: false }) video!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas', { static: false })
  canvas!: ElementRef<HTMLCanvasElement>;

  camera!: Camera;
  faceDetected = false;
  cameraStarted = false;

  capturedBlob: Blob | null = null;
  previewUrl: string | null = null;

  fileError = '';

  constructor(private contentService: ContentService, private router: Router) {}

  /** 📸 OPEN CAMERA */
  startCamera() {
    this.resetCapture();
    this.cameraStarted = true;

    setTimeout(() => {
      if (!this.video?.nativeElement) return;

      const faceDetection = new FaceDetection({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
      });

      faceDetection.setOptions({
        model: 'short',
        minDetectionConfidence: 0.7,
      });

      faceDetection.onResults((results) => {
        this.faceDetected = !!results.detections?.length;
      });

      this.camera = new Camera(this.video.nativeElement, {
        onFrame: async () => {
          await faceDetection.send({ image: this.video.nativeElement });
        },
        width: 640,
        height: 480,
      });

      this.camera.start();
    });
  }

  /** 📸 CAPTURE (NO UPLOAD HERE) */
  captureSelfie() {
    if (!this.faceDetected || !this.video?.nativeElement) return;

    const videoEl = this.video.nativeElement;

    const width = videoEl.videoWidth;
    const height = videoEl.videoHeight;

    const canvasEl = this.canvas.nativeElement;
    canvasEl.width = width;
    canvasEl.height = height;

    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoEl, 0, 0, width, height);

    canvasEl.toBlob(
      (blob) => {
        if (!blob) return;

        this.capturedBlob = blob;
        this.previewUrl = URL.createObjectURL(blob);

        this.stopCamera();
      },
      'image/jpeg',
      0.9
    );
  }

  /** ☁️ UPLOAD ONLY WHEN USER CONFIRMS */
  async uploadCapturedImage(): Promise<void> {
    if (!this.capturedBlob) return;

    try {
      // 1️⃣ Get upload intent
      const metaPayload = {
        type: 'PhotoProfile',
        accessLevel: 'Private',
        fileName: 'avatar.jpg',
        contentType: 'image/jpeg',
      };

      const res: any = await this.contentService
        .imageUploadMeta(metaPayload)
        .toPromise();

      if (!res?.success || !res?.data?.upload?.url || !res?.data?.fileId) {
        throw new Error('Failed to get upload metadata');
      }

      const upload = res.data.upload;
      const fileId = res.data.fileId; // ✅ IMPORTANT

      // 2️⃣ Upload to S3
      const s3Response = await fetch(upload.url, {
        method: upload.method || 'PUT',
        headers: {
          'Content-Type': metaPayload.contentType,
          ...(upload.headers || {}),
        },
        body: this.capturedBlob,
      });

      if (!s3Response.ok) {
        throw new Error(`S3 upload failed: ${s3Response.status}`);
      }

      // 3️⃣ Tell backend upload is complete
      await this.contentService.completeUpload(fileId).toPromise();

      // ✅ FINAL SUCCESS
      alert('Selfie uploaded successfully ✅');
      this.router.navigateByUrl('/dashboard/profile');
    } catch (err: any) {
      console.error('Selfie upload failed', err);
      alert(err?.message || 'Image upload failed');
    }
  }

  /** 🔁 RETAKE */
  retake() {
    this.startCamera();
  }

  /** 🛑 STOP CAMERA */
  stopCamera() {
    if (this.camera) {
      this.camera.stop();
      this.camera = undefined as any;
    }

    const videoEl = this.video?.nativeElement;
    if (videoEl?.srcObject) {
      const tracks = (videoEl.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoEl.srcObject = null;
    }

    this.faceDetected = false;
    this.cameraStarted = false;
  }

  resetCapture() {
    this.capturedBlob = null;
    this.previewUrl = null;
  }

  ngOnDestroy() {
    this.stopCamera();
  }
}
