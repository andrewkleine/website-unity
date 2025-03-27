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
      video: {
        width: { ideal: 640 },
        height: { ideal: 900 }
      }
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
      this.captureBtn.addEventListener('click', () => this.captureImage());
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

 captureImage() {
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    this.ctx.clearRect(0, 0, cw, ch);
    this.ctx.save();

    this.ctx.beginPath();

    // Head
    this.ctx.ellipse(cw / 2, 180, 75, 100, 0, 0, 2 * Math.PI);

    // Torso
    this.ctx.rect(cw / 2 - 75, 250, 150, 400);

    // Arms (as a wide bar)
    this.ctx.rect(cw / 2 - 500, 300, 1000, 60);

    // Hands
    this.ctx.arc(cw / 2 - 500 - 35, 330, 35, 0, 2 * Math.PI);
    this.ctx.arc(cw / 2 + 500 + 35 - 1000, 330, 35, 0, 2 * Math.PI); // right hand

    // Legs (adjusted height and position)
    this.ctx.rect(cw / 2 - 90, 670, 70, 200);
    this.ctx.rect(cw / 2 + 20, 670, 70, 200);

    this.ctx.clip();
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
