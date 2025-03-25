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
        this.ovalWidth = 300;
        this.ovalHeight = 400;

        this.setup();
    }

    setup() {
        // Ensure everything starts after DOM is ready
        window.addEventListener('load', () => {
            this.initCamera();
            this.initWebSocket();
            this.addEventListeners();
        });
    }

    async initCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.video.srcObject = stream;
            this.video.play();
            console.log("✅ Camera started successfully");
        } catch (err) {
            console.error('❌ Camera access failed:', err);
            alert("Camera access failed: " + err.message);
        }
    }

    initWebSocket() {
        this.ws = new WebSocket('ws://127.0.0.1:9090/image');
        this.ws.onopen = () => console.log('✅ Connected to Unity WebSocket server');
        this.ws.onerror = () => console.warn('⚠️ WebSocket connection to Unity failed');
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
        this.ctx.ellipse(cw / 2, ch / 2, this.ovalWidth / 2, this.ovalHeight / 2, 0, 0, Math.PI * 2);
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

// Initialize the app
new BackgroundRemovalApp();
