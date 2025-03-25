const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const video = document.getElementById('video');
        const captureBtn = document.getElementById('captureBtn');
        const uploadBtn = document.getElementById('uploadBtn');
        let ws;

        // Connect to Unity WebSocket server
        function connectToUnity() {
            ws = new WebSocket('ws://localhost:9090/image');
            ws.onopen = () => console.log('Connected to Unity WebSocket server');
            ws.onerror = () => alert('Could not connect to Unity. Is it running?');
        }

        navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
            video.srcObject = stream;
            video.play();
        });

        captureBtn.addEventListener('click', () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        });

        uploadBtn.addEventListener('click', () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                const imageData = canvas.toDataURL('image/png');
                ws.send(imageData);
                document.getElementById('uploadStatus').textContent = 'Image sent to Unity!';
            } else {
                alert('WebSocket not connected!');
            }
        });

        window.onload = connectToUnity;

        document.getElementById('removeBackgroundBtn').addEventListener('click', async () => {
    const removeButton = document.getElementById('removeBackgroundBtn');
    removeButton.disabled = true;
    removeButton.textContent = 'Processing...';

    try {
        const canvas = document.getElementById('canvas');
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

        const formData = new FormData();
        formData.append('image_file', blob, 'image.png');
        formData.append('size', 'auto');

        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: {
                'X-Api-Key': 'U3MKqqNUbieZ9bQhbKfGXBmM'
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }

        const resultBlob = await response.blob();
        const img = new Image();
        img.src = URL.createObjectURL(resultBlob);

        img.onload = () => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(img.src);
        };

        document.getElementById('uploadStatus').textContent = 'Background removed!';
        document.getElementById('uploadStatus').className = 'upload-status success';

    } catch (error) {
        console.error(error);
        document.getElementById('uploadStatus').textContent = 'Failed to remove background.';
        document.getElementById('uploadStatus').className = 'upload-status error';
    } finally {
        removeButton.disabled = false;
        removeButton.textContent = 'Remove Background';
    }
                navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
    video.srcObject = stream;
    video.play();
}).catch(err => {
    alert("Camera access failed: " + err.message);
});
});
