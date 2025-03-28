window.addEventListener('load', () => {
  class BackgroundRemovalApp {
    constructor() {
      this.video = document.getElementById('video');
      this.canvas = document.getElementById('canvas');
      this.captureBtn = document.getElementById('captureBtn');
      this.removeBackgroundBtn = document.getElementById('removeBackgroundBtn');
      this.uploadBtn = document.getElementById('uploadBtn');
      this.statusBox = document.getElementById('uploadStatus');
      this.ctx = this.canvas.getContext('2d');
      this.streaming = false;
      this.ws = null;
      this.apiKey = 'U3MKqqNUbieZ9bQhbKfGXBmM';
      this.init();
    }

    async init() {
      await this.initCamera();
      this.initWebSocket();
      this.addEventListeners();
    }

    async initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1200 }, height: { ideal: 900 } }
        });
        this.video.srcObject = stream;
        this.video.play();
        console.log("✅ Camera initialized");
      } catch (err) {
        console.error('❌ Camera error:', err);
        alert("Camera error: " + err.message);
      }
    }

    initWebSocket() {
      this.ws = new WebSocket('ws://127.0.0.1:9090/image');
      this.ws.onopen = () => console.log('✅ Connected to Unity WebSocket');
      this.ws.onerror = () => console.warn('⚠️ WebSocket connection failed');
    }

    addEventListeners() {
      this.captureBtn.addEventListener('click', () => this.startCountdown());
      this.removeBackgroundBtn.addEventListener('click', () => this.removeBackground());
      this.uploadBtn.addEventListener('click', () => this.sendViaWebSocket());

      this.video.addEventListener('canplay', () => {
        if (!this.streaming) {
          this.canvas.width = this.video.videoWidth;
          this.canvas.height = this.video.videoHeight;
          this.streaming = true;
        }
      });
    }

    startCountdown() {
      const countdownEl = document.getElementById('countdown');
      let seconds = 10;

      countdownEl.style.display = 'block';
      countdownEl.textContent = seconds;

      const interval = setInterval(() => {
        seconds--;
        countdownEl.textContent = seconds;

        if (seconds <= 0) {
          clearInterval(interval);
          countdownEl.style.display = 'none';
          this.captureImage();
        }
      }, 1000);
    }

    captureImage() {
      const cw = this.canvas.width;
      const ch = this.canvas.height;
      const shiftY = -250;
    
      this.ctx.clearRect(0, 0, cw, ch);
      this.ctx.save();
      this.ctx.beginPath();
    
      // === Body: one tall rectangle (torso + legs)
      const bodyWidth = 150;
      const bodyHeight = 600;
      this.ctx.rect(cw / 2 - bodyWidth / 2, 250 + shiftY, bodyWidth, bodyHeight);
    
      // === Arms: one long horizontal rectangle
      const armWidth = 600;
      const armHeight = 60;
      this.ctx.rect(cw / 2 - armWidth / 2, 350 + shiftY, armWidth, armHeight);
    
      // === Head: circle
      this.ctx.moveTo(cw / 2 + 75, 175 + shiftY);
      this.ctx.arc(cw / 2, 175 + shiftY, 75, 0, Math.PI * 2);
    
      // === Hands: circles at both ends of the arms
      this.ctx.moveTo(cw / 2 - 300 + 30, 380 + shiftY);
      this.ctx.arc(cw / 2 - 300, 380 + shiftY, 30, 0, Math.PI * 2); // left hand
    
      this.ctx.moveTo(cw / 2 + 300 + 30, 380 + shiftY);
      this.ctx.arc(cw / 2 + 300, 380 + shiftY, 30, 0, Math.PI * 2); // right hand
    
      this.ctx.clip();
    
      this.ctx.strokeStyle = 'lime';
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
      this.ctx.drawImage(this.video, 0, 0, cw, ch);
      this.ctx.restore();
      this.statusBox.textContent = '';
    }
    
  

    async removeBackground() {
      this.removeBackgroundBtn.disabled = true;
      this.removeBackgroundBtn.textContent = 'Processing...';
      try {
        const blob = await new Promise(resolve => this.canvas.toBlob(resolve, 'image/png'));
        const formData = new FormData();
        formData.append('image_file', blob, 'image.png');
        formData.append('size', 'auto');

        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: { 'X-Api-Key': this.apiKey },
          body: formData
        });

        if (!response.ok) throw new Error(`Error: ${response.statusText}`);

        const resultBlob = await response.blob();
        const img = new Image();
        img.src = URL.createObjectURL(resultBlob);

        img.onload = () => {
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
          URL.revokeObjectURL(img.src);
        };

        this.statusBox.textContent = 'Background removed!';
        this.statusBox.className = 'upload-status success';

      } catch (error) {
        console.error(error);
        this.statusBox.textContent = 'Failed to remove background.';
        this.statusBox.className = 'upload-status error';
      } finally {
        this.removeBackgroundBtn.disabled = false;
        this.removeBackgroundBtn.textContent = 'Remove Background';
      }
    }

    sendViaWebSocket() {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const imageData = this.canvas.toDataURL('image/png');
        this.ws.send(imageData);
        this.statusBox.textContent = 'Image sent to Unity!';
        this.statusBox.className = 'upload-status success';
      } else {
        alert('WebSocket not connected!');
      }
    }
  }

  new BackgroundRemovalApp();
});
