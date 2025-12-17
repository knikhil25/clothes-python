
const colorSelect = document.getElementById('color-select');
const typeSelect = document.getElementById('type-select');
const patternInput = document.getElementById('pattern-input');
const patternColorInput = document.getElementById('pattern-color-input');
const genderSelect = document.getElementById('gender-select');
const resultArea = document.getElementById('result-area');
const resultText = document.getElementById('result-text');
const imageContainer = document.getElementById('result-image-container');
const submitBtn = document.getElementById('submit-btn');
const loadingDiv = document.getElementById('loading');
const placeholder = document.getElementById('placeholder');

async function getStyleAdvice() {
    const selectedColor = colorSelect.value;
    const selectedType = typeSelect.value;
    const selectedPattern = patternInput.value;
    const selectedPatternColor = patternColorInput.value;
    const selectedGender = genderSelect.value;

    if (!selectedColor || !selectedType || !selectedGender) {
        alert('Please answer all questions marked with a red asterisk (*): Color, Clothing Type, and Gender.');
        return;
    }

    // UI Loading State
    submitBtn.disabled = true;
    loadingDiv.classList.remove('hidden');
    resultArea.classList.add('hidden');
    placeholder.classList.add('hidden');
    imageContainer.innerHTML = ''; // Clear previous image on new request

    let userDescription = "I am";
    if (selectedGender && selectedGender !== "Unspecified") {
        userDescription += ` a ${selectedGender} `;
    }

    let itemDescription = `${selectedColor} `;
    if (selectedPattern) {
        itemDescription += ` ${selectedPattern} `;
    }
    itemDescription += ` ${selectedType} `;

    if (selectedPatternColor) {
        itemDescription += ` with ${selectedPatternColor} details`;
    }

    const prompt = `${userDescription} wearing a ${itemDescription}. Suggest a stylish, well-coordinated outfit to pair with this item by providing one specific recommendation for matching pants (or a top if pants were selected), one specific shoe choice, and optional accessories with colors and style; keep the tone concise, friendly, and fashion-forward.`


    try {
        // Removed artificial delay for speed
        const fetchRequest = fetch('/api/text-generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-oss:20b',
                prompt: prompt
            })
        });

        const response = await fetchRequest; // No minDelay wait

        if (!response.ok) {
            throw new Error(`Text API Error: ${response.statusText} `);
        }

        const data = await response.json();
        let advice = data.response;

        // Post-processing: Replace "chinos" with "Trousers"
        advice = advice.replace(/chinos/gi, "Trousers");

        // Display Text Result immediately
        resultText.textContent = advice;
        resultArea.classList.remove('hidden');

        // Hide global loading spinner immediately so user can read text
        loadingDiv.classList.add('hidden');
        // submitBtn.disabled = false; // Enable button early if preferred, or keep disabled until image done? 
        // Let's keep button disabled until everything is done, but hide spinner.
        // Actually best UX: keep button disabled, hide overlay spinner.

        // --- Image Generation Integration ---
        // Show local loading state for image
        imageContainer.innerHTML = '<div class="local-loader" style="text-align:center; padding: 20px; color: #6b7280;">Generating outfit image...</div>';

        try {
            // Construct a highly specific prompt for the image
            const fullBodyPrompt = `Full body shot, wide angle, showing legs and shoes. A ${selectedGender} wearing ${itemDescription}. The face is blurred or headless. High quality, fashion photography, photorealistic, neutral background. Use specific clothing details: ${advice.substring(0, 100)}...`;

            // Clean up prompt to avoid excessively long text from advice
            const cleanAdvice = advice.replace(/[\r\n]+/g, " ").substring(0, 200);
            const imagePrompt = `Full body outfit shot, showing entire look from head to toe including shoes. A ${selectedGender} model wearing ${itemDescription}. Style details: ${cleanAdvice}. Photorealistic, 8k, studio lighting, fashion catalog style. Headless or blurred face.`;

            const imageResponse = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: imagePrompt,
                    width: 512,
                    height: 768, // Portrait aspect ratio for full body
                    steps: 25 // Slightly higher quality
                })
            });

            if (!imageResponse.ok) {
                const errorData = await imageResponse.json().catch(() => ({}));
                const errorMessage = errorData.detail || imageResponse.statusText;
                throw new Error(`Image API Error: ${errorMessage}`);
            }

            const imageData = await imageResponse.json();

            // Check if there is an existing image and remove it
            imageContainer.innerHTML = ''; // Clear local loader

            if (imageData.image) {
                const imgElement = document.createElement('img');
                imgElement.src = `data:image/png;base64,${imageData.image}`;
                imgElement.alt = "Generated Outfit";
                imgElement.style.maxWidth = "100%";
                imgElement.style.borderRadius = "8px";
                // imgElement.style.marginTop = "10px"; // No longer needed with flex layout

                imageContainer.appendChild(imgElement);

                // Show text container if it was hidden (though we stopped hiding it)
                // resultText.classList.remove('hidden'); 
            } else {
                imageContainer.innerHTML = '<div style="color:orange">Image generation returned no data.</div>';
                console.warn("No image data found in response:", imageData);
            }

        } catch (imageError) {
            console.error('Image generation failed:', imageError);
            imageContainer.innerHTML = ''; // Clear loader

            // Non-blocking error: just append a small warning or log it
            const warning = document.createElement('div');
            warning.style.color = 'orange';
            warning.style.fontSize = '0.8em';
            warning.style.marginTop = '5px';

            // Show the actual error message if possible
            const userMessage = imageError.message.includes("No model loaded")
                ? "Image generation failed: No model loaded (Please run 'pull flux.1-schnell' with your token)"
                : `Image generation unavailable: ${imageError.message}`;

            warning.textContent = userMessage;
            imageContainer.appendChild(warning); // Append to image container, not resultArea
        } finally {
            submitBtn.disabled = false; // Re-enable button finally
        }

    } catch (error) {
        console.error('Error fetching style advice:', error);
        resultText.classList.remove('hidden');
        resultText.textContent = `Error: ${error.message}. Please make sure Ollama (port 11434) is running.`;
        resultArea.classList.remove('hidden');

        // Ensure to hide loading if we hit the outer catch
        loadingDiv.classList.add('hidden');
        submitBtn.disabled = false;
    }
}

// Event Listeners
submitBtn.addEventListener('click', getStyleAdvice);

// Reset to placeholder if selection changes
function resetUI() {
    resultArea.classList.add('hidden');
    placeholder.classList.remove('hidden');
    imageContainer.innerHTML = '';
}

colorSelect.addEventListener('input', resetUI);
typeSelect.addEventListener('input', resetUI);
genderSelect.addEventListener('change', resetUI);
