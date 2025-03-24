class BackgroundRemovalApp {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.captureBtn = document.getElementById('captureBtn');
        this.removeBackgroundBtn = document.getElementById('removeBackgroundBtn');
        this.uploadBtn = document.getElementById('uploadBtn');
        
        this.ctx = this.canvas.getContext('2d');
        this.streaming = false;
        
        // Remove.bg API key
        this.apiKey = 'U3MKqqNUbieZ9bQhbKfGXBmM';
        
        // Add oval dimensions
        this.ovalWidth = 300;
        this.ovalHeight = 400;
        
        this.init();
    }

    async init() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: false 
            });
            this.video.srcObject = stream;
            this.video.play();
        } catch (err) {
            console.error('Error accessing camera:', err);
        }

        this.video.addEventListener('canplay', () => {
            if (!this.streaming) {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                this.streaming = true;
            }
        });

        this.captureBtn.addEventListener('click', () => this.captureImage());
        this.removeBackgroundBtn.addEventListener('click', () => this.removeBackground());
        this.uploadBtn.addEventListener('click', () => this.sendToUnity());
    }

    captureImage() {
        // Calculate the center position
        const videoWidth = this.video.videoWidth;
        const videoHeight = this.video.videoHeight;
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;

        // Calculate scaling factors
        const scaleX = canvasWidth / videoWidth;
        const scaleY = canvasHeight / videoHeight;

        // Calculate the centered crop area
        const cropX = (canvasWidth - this.ovalWidth) / 2;
        const cropY = (canvasHeight - this.ovalHeight) / 2;

        // Clear the canvas
        this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Draw the video frame
        this.ctx.drawImage(this.video, 0, 0, canvasWidth, canvasHeight);

        // Create a clipping path for oval shape
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.ellipse(
            canvasWidth / 2,
            canvasHeight / 2,
            this.ovalWidth / 2,
            this.ovalHeight / 2,
            0,
            0,
            Math.PI * 2
        );
        this.ctx.clip();

        // Draw the video frame again, but now with the oval clip
        this.ctx.drawImage(this.video, 0, 0, canvasWidth, canvasHeight);

        // Restore the context
        this.ctx.restore();
    }

    async removeBackground() {
        // Show loading state
        this.removeBackgroundBtn.disabled = true;
        this.removeBackgroundBtn.textContent = 'Processing...';

        try {
            // Convert canvas to blob
            const blob = await new Promise(resolve => this.canvas.toBlob(resolve, 'image/png'));
            
            // Create form data
            const formData = new FormData();
            formData.append('image_file', blob, 'image.png');
            formData.append('size', 'auto');

            // Make API request to remove.bg
            const response = await fetch('https://api.remove.bg/v1.0/removebg', {
                method: 'POST',
                headers: {
                    'X-Api-Key': this.apiKey
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Convert response to blob
            const processedImageBlob = await response.blob();
            
            // Create URL from blob and load into new image
            const img = new Image();
            img.src = URL.createObjectURL(processedImageBlob);
            
            // When image loads, draw it to canvas
            img.onload = () => {
                // Clear canvas
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                
                // Draw new image
                this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
                
                // Cleanup
                URL.revokeObjectURL(img.src);
            };

        } catch (error) {
            console.error('Error removing background:', error);
            alert('Error removing background. Please try again.');
        } finally {
            // Reset button state
            this.removeBackgroundBtn.disabled = false;
            this.removeBackgroundBtn.textContent = 'Remove Background';
        }
    }

    async sendToUnity() {
        try {
            console.log("Starting upload process...");
            
            // Convert canvas to blob
            const blob = await new Promise(resolve => this.canvas.toBlob(resolve, 'image/png'));
            
            // Create form data
            const formData = new FormData();
            const fileName = `image_${Date.now()}.png`;
            formData.append('image', blob, fileName);

            // Upload to your GitHub Pages
            const uploadUrl = 'https://andrewkleine.github.io/website-unity/uploads/';
            const response = await fetch(uploadUrl, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            // Show success message
            const uploadStatus = document.getElementById('uploadStatus');
            uploadStatus.textContent = 'Image uploaded successfully! Unity will load it.';
            uploadStatus.className = 'upload-status success';
            
            // Tell Unity to load the new image
            if (unityInstance) {
                unityInstance.SendMessage('TextureManager', 'LoadNewImage', fileName);
            }
            
        } catch (error) {
            console.error('Error uploading image:', error);
            
            // Show error message
            const uploadStatus = document.getElementById('uploadStatus');
            uploadStatus.textContent = 'Failed to upload image. Please try again.';
            uploadStatus.className = 'upload-status error';
        }
    }
}

// Initialize the app when the page loads
window.onload = () => {
    new BackgroundRemovalApp();
}; 