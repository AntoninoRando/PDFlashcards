// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// Store PDF pages and their canvases for navigation
const pageCanvases = [];
let pdfDocument = null;

document.getElementById('pdf-upload').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        // Update file info
        document.getElementById('file-info').textContent = `File: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;

        // Clear previous preview
        const previewDiv = document.getElementById('pdf-preview');
        previewDiv.innerHTML = '';
        previewDiv.classList.remove('no-preview');

        // Clear previous links
        const linksContainer = document.getElementById('links-container');
        linksContainer.innerHTML = '<p>Scanning for links...</p>';

        // Reset page canvases array
        pageCanvases.length = 0;

        // Read the file
        const reader = new FileReader();
        reader.onload = function (event) {
            const typedArray = new Uint8Array(event.target.result);

            // Load PDF with PDF.js
            pdfjsLib.getDocument(typedArray).promise.then(function (pdf) {
                pdfDocument = pdf;

                // We'll display first 5 pages for preview (or fewer if the document has fewer pages)
                // const maxPagesToShow = 5;
                // const numPages = Math.min(pdf.numPages, maxPagesToShow);
                const numPages = pdf.numPages;

                // Add page count info
                const pageInfo = document.createElement('div');
                pageInfo.className = 'file-info';
                pageInfo.textContent = `Total pages: ${pdf.numPages} (showing first ${numPages})`;
                previewDiv.appendChild(pageInfo);

                // Render each page
                for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                    renderPage(pdf, pageNum, previewDiv);
                }

                // Extract links from all pages
                extractLinksFromPDF(pdf);
            }).catch(function (error) {
                previewDiv.innerHTML = `<div class="no-preview"><p>Error loading PDF: ${error.message}</p></div>`;
                document.getElementById('links-container').innerHTML = `<p class="no-links-message">Error extracting links: ${error.message}</p>`;
            });
        };
        reader.readAsArrayBuffer(file);
    } else {
        document.getElementById('file-info').textContent = 'Please select a valid PDF file';
        document.getElementById('pdf-preview').innerHTML = '<div class="no-preview"><p>Invalid file format. Please select a PDF.</p></div>';
        document.getElementById('links-container').innerHTML = '<p class="no-links-message">Links from the PDF will appear here after upload</p>';
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
        canvas.dataset.pageNum = pageNum;

        // Store canvas reference for navigation
        pageCanvases[pageNum] = canvas;

        // Add page number
        const pageLabel = document.createElement('div');
        pageLabel.textContent = `Page ${pageNum}`;
        pageLabel.style.marginBottom = '5px';
        pageLabel.style.fontWeight = 'bold';
        pageLabel.id = `page-label-${pageNum}`;

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

function extractLinksFromPDF(pdf) {
    const linksContainer = document.getElementById('links-container');
    linksContainer.innerHTML = ''; // Clear loading message

    let foundLinks = false;
    let pendingPages = pdf.numPages;
    let internalLinks = [];
    let externalLinks = [];

    // Extract links from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        pdf.getPage(pageNum).then(function (page) {
            // Get both annotations and text content for this page
            return Promise.all([
                page.getAnnotations(),
                page.getTextContent()
            ]);
        }).then(function ([annotations, textContent]) {
            // Create a mapping of text items by their position
            const textMap = createTextPositionMap(textContent);

            // Process link annotations
            annotations.forEach(function (annotation) {
                if (annotation.subtype === 'Link') {
                    foundLinks = true;
                    const linkInfo = {
                        pageNumber: pageNum,
                        title: `Link on page ${pageNum}`,
                        rect: annotation.rect // Keep the rectangle coordinates
                    };

                    // Find text content near or at the link position
                    const linkText = extractTextFromRect(textMap, annotation.rect);
                    if (linkText && linkText.trim()) {
                        linkInfo.linkText = linkText.trim();
                    }

                    // Check if it's an internal or external link
                    if (annotation.dest) {
                        // Internal link (to another page in the PDF)
                        linkInfo.type = 'internal';
                        linkInfo.dest = annotation.dest;

                        if (Array.isArray(annotation.dest)) {
                            // Sometimes dest is an array where the first element is the page reference
                            const destRef = annotation.dest[0];
                            // We'll resolve this page reference later
                            linkInfo.destRef = destRef;
                        } else if (typeof annotation.dest === 'string') {
                            // Named destinations need to be resolved
                            linkInfo.destName = annotation.dest;
                        }

                        internalLinks.push(linkInfo);
                    } else if (annotation.url) {
                        // External link (to a URL)
                        linkInfo.type = 'external';
                        linkInfo.url = annotation.url;
                        if (!linkInfo.linkText) {
                            linkInfo.linkText = annotation.url.substring(0, 50) + (annotation.url.length > 50 ? '...' : '');
                        }
                        externalLinks.push(linkInfo);
                    }
                }
            });

            pendingPages--;

            // If all pages have been processed, update the links container
            if (pendingPages === 0) {
                if (!foundLinks) {
                    linksContainer.innerHTML = '<p class="no-links-message">No links found in this PDF.</p>';
                } else {
                    displayLinks(internalLinks, externalLinks);
                }
            }
        }).catch(function (error) {
            console.error(`Error extracting links from page ${pageNum}:`, error);
            pendingPages--;

            // If all pages have been processed (including errors), update the links container
            if (pendingPages === 0 && linksContainer.innerHTML === '') {
                if (!foundLinks) {
                    linksContainer.innerHTML = '<p class="no-links-message">No links found in this PDF.</p>';
                } else {
                    displayLinks(internalLinks, externalLinks);
                }
            }
        });
    }
}

// Create a mapping of text items by their position on the page
function createTextPositionMap(textContent) {
    const textItems = textContent.items;
    const textMap = [];

    for (let i = 0; i < textItems.length; i++) {
        const item = textItems[i];
        const x = item.transform[4];
        const y = item.transform[5];

        textMap.push({
            x: x,
            y: y,
            width: item.width,
            height: item.height || 10, // Approximate height if not provided
            str: item.str
        });
    }

    return textMap;
}

// Extract text content from a rectangle area (link area)
function extractTextFromRect(textMap, rect) {
    if (!textMap || !rect) return null;

    // Expand the rectangle slightly to catch nearby text
    const [x1, y1, x2, y2] = rect;
    const expandedRect = [
        x1 - 5,
        y1 - 5,
        x2 + 5,
        y2 + 5
    ];

    // Find text items that intersect with the link rectangle
    const matchingItems = textMap.filter(item => {
        // Check if the text item overlaps with the expanded rectangle
        return (item.x >= expandedRect[0] && item.x <= expandedRect[2]) &&
            (item.y >= expandedRect[1] && item.y <= expandedRect[3]);
    });

    // If we don't find any text directly in the rectangle, look for the closest text
    if (matchingItems.length === 0) {
        // Find the closest text item to the center of the rectangle
        const centerX = (rect[0] + rect[2]) / 2;
        const centerY = (rect[1] + rect[3]) / 2;

        let closestItem = null;
        let closestDistance = Infinity;

        textMap.forEach(item => {
            const distance = Math.sqrt(
                Math.pow(item.x - centerX, 2) +
                Math.pow(item.y - centerY, 2)
            );

            if (distance < closestDistance) {
                closestDistance = distance;
                closestItem = item;
            }
        });

        // Use the closest item if it's reasonably close
        if (closestItem && closestDistance < 30) {
            return closestItem.str;
        }

        return null;
    }

    // Sort matching items by their y-position (top to bottom)
    // and then by their x-position (left to right)
    matchingItems.sort((a, b) => {
        const yDiff = b.y - a.y; // Reverse y-axis (PDF coordinates)
        if (Math.abs(yDiff) < 5) {
            return a.x - b.x; // Left to right
        }
        return yDiff;
    });

    // Combine the text items
    return matchingItems.map(item => item.str).join(' ');
}


function displayLinks(internalLinks, externalLinks) {
    const linksContainer = document.getElementById('links-container');
    linksContainer.innerHTML = ''; // Clear container

    // Process internal links if available
    if (internalLinks.length > 0) {
        const internalSection = document.createElement('div');
        internalSection.className = 'link-section';

        const internalTitle = document.createElement('h3');
        internalTitle.className = 'link-section-title';
        internalTitle.textContent = 'Internal Links';
        internalSection.appendChild(internalTitle);
        
        // Process each internal link

        internalLinks.forEach(function (linkInfo, index) {
            // Use the extracted link text if available, or fall back to default text
            const displayText = linkInfo.linkText || `Internal Link ${index + 1}`;
            let buttonText = `${displayText} (from page ${linkInfo.pageNumber})`;

            // Resolve page references for internal links
            if (linkInfo.destRef) {
                // Try to resolve the destination page
                pdfDocument.getPageIndex(linkInfo.destRef).then(function (pageIndex) {
                    // PageIndex is 0-based, convert to 1-based page number
                    const targetPage = pageIndex + 1;
                    buttonText = `${displayText} → Page ${targetPage}`;
                    createLinkButton(internalSection, buttonText, function () {
                        scrollToPage(targetPage);
                    });
                }).catch(function (error) {
                    console.error('Error resolving link destination:', error);
                    createLinkButton(internalSection, buttonText, function () {
                        // Fallback: just scroll to the source page
                        scrollToPage(linkInfo.pageNumber);
                    });
                });
            } else if (linkInfo.destName) {
                // Handle named destinations
                pdfDocument.getDestination(linkInfo.destName).then(function (dest) {
                    if (dest && Array.isArray(dest) && dest.length > 0) {
                        return pdfDocument.getPageIndex(dest[0]);
                    }
                    throw new Error('Invalid destination');
                }).then(function (pageIndex) {
                    // PageIndex is 0-based, convert to 1-based page number
                    const targetPage = pageIndex + 1;
                    buttonText = `${displayText} → Page ${targetPage}`;
                    createLinkButton(internalSection, buttonText, function () {
                        scrollToPage(targetPage);
                    });
                }).catch(function (error) {
                    console.error('Error resolving named destination:', error);
                    createLinkButton(internalSection, buttonText, function () {
                        // Fallback: just scroll to the source page
                        scrollToPage(linkInfo.pageNumber);
                    });
                });
            } else {
                // Generic internal link
                createLinkButton(internalSection, buttonText, function () {
                    scrollToPage(linkInfo.pageNumber);
                });
            }
        });

        linksContainer.appendChild(internalSection);
    }

    // Process external links if available
    if (externalLinks.length > 0) {
        const externalSection = document.createElement('div');
        externalSection.className = 'link-section';

        const externalTitle = document.createElement('h3');
        externalTitle.className = 'link-section-title';
        externalTitle.textContent = 'External Links';
        externalSection.appendChild(externalTitle);

        // Process each external link
        externalLinks.forEach(function (linkInfo) {
            // Use the extracted link text for the button
            const displayText = linkInfo.linkText || linkInfo.url.substring(0, 50) + (linkInfo.url.length > 50 ? '...' : '');
            const buttonText = `${displayText} (page ${linkInfo.pageNumber})`;

            createLinkButton(externalSection, buttonText, function () {
                // Scroll to the page where the link appears
                scrollToPage(linkInfo.pageNumber);
            });
        });

        linksContainer.appendChild(externalSection);
    }

    // If after resolution we still have no links
    if (linksContainer.children.length === 0) {
        linksContainer.innerHTML = '<p class="no-links-message">No usable links found in this PDF.</p>';
    }
}

function createLinkButton(container, text, onClick) {
    const button = document.createElement('button');
    button.className = 'link-button';
    button.textContent = text;
    button.addEventListener('click', onClick);
    container.appendChild(button);
    return button;
}


function scrollToPage(pageNumber) {
    const previewDiv = document.getElementById('pdf-preview');
    const pageLabel = document.getElementById(`page-label-${pageNumber}`);

    if (pageLabel) {
        // Scroll to the page if it's in the preview
        pageLabel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        // If the page is not in the preview (beyond the page limit)
        alert(`Page ${pageNumber} is not in the current preview. Only the first 5 pages are shown.`);
    }
}