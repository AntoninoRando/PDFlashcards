// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

document.getElementById('pdf-upload').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        // Update file info
        document.getElementById('file-info').textContent = `File: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;

        // Clear previous preview
        const previewDiv = document.getElementById('pdf-preview');
        previewDiv.innerHTML = '';
        previewDiv.classList.remove('no-preview');

        // Read the file
        const reader = new FileReader();
        reader.onload = function (event) {
            const typedArray = new Uint8Array(event.target.result);

            // Load PDF with PDF.js
            pdfjsLib.getDocument(typedArray).promise.then(function (pdf) {
                // We'll display first 5 pages for preview (or fewer if the document has fewer pages)
                const maxPagesToShow = 5;
                const numPages = Math.min(pdf.numPages, maxPagesToShow);

                // Add page count info
                const pageInfo = document.createElement('div');
                pageInfo.className = 'file-info';
                pageInfo.textContent = `Total pages: ${pdf.numPages} (showing first ${numPages})`;
                previewDiv.appendChild(pageInfo);

                // Render each page
                for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                    renderPage(pdf, pageNum, previewDiv);
                }
            }).catch(function (error) {
                previewDiv.innerHTML = `<div class="no-preview"><p>Error loading PDF: ${error.message}</p></div>`;
            });
        };
        reader.readAsArrayBuffer(file);
    } else {
        document.getElementById('file-info').textContent = 'Please select a valid PDF file';
        document.getElementById('pdf-preview').innerHTML = '<div class="no-preview"><p>Invalid file format. Please select a PDF.</p></div>';
    }
});

function renderPage(pdf, pageNum, container) {
    pdf.getPage(pageNum).then(function (page) {
        const viewport = page.getViewport({ scale: 1.5 });

        // Create canvas for this page
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Add page number
        const pageLabel = document.createElement('div');
        pageLabel.textContent = `Page ${pageNum}`;
        pageLabel.style.marginBottom = '5px';
        pageLabel.style.fontWeight = 'bold';

        container.appendChild(pageLabel);
        container.appendChild(canvas);

        // Render PDF page into canvas context
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        page.render(renderContext);
    });
}