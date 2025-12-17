import base64
import io
import torch
import os
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from diffusers import StableDiffusionPipeline
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Device configuration
device = "mps" if torch.backends.mps.is_available() else "cpu"
print(f"Using device: {device}")

model_id = "runwayml/stable-diffusion-v1-5"

# Load the pipeline
try:
    print(f"Loading model: {model_id}...")
    pipe = StableDiffusionPipeline.from_pretrained(model_id, torch_dtype=torch.float32)
    pipe = pipe.to(device)
    
    # Disable safety checker
    pipe.safety_checker = None
    pipe.feature_extractor = None 
    
    # Enable attention slicing
    pipe.enable_attention_slicing()
    
    print("Model loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    pipe = None

class GenerateRequest(BaseModel):
    prompt: str
    width: int = 512
    height: int = 512
    steps: int = 20
    guidance_scale: float = 7.5
    seed: int = None

@app.post("/api/generate")
async def generate_image(req: GenerateRequest):
    if pipe is None:
        raise HTTPException(status_code=500, detail="Model failed to load on server start.")

    try:
        generator = None
        if req.seed is not None:
            generator = torch.Generator(device).manual_seed(req.seed)
        
        # Run inference
        image = pipe(
            prompt=req.prompt,
            height=req.height,
            width=req.width,
            num_inference_steps=req.steps,
            guidance_scale=req.guidance_scale,
            generator=generator
        ).images[0]

        # Convert to base64
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        return {"image": img_str}

    except Exception as e:
        print(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class TextRequest(BaseModel):
    prompt: str
    model: str = "gpt-oss:20b"

@app.post("/api/text-generate")
async def generate_text(req: TextRequest):
    print(f"Received text generation request for model: {req.model}")
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": req.model,
                    "prompt": req.prompt,
                    "stream": False
                }
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        print(f"Text generation error: {e}")
        print("Falling back to mock advice due to error.")
        return {
            "response": "Here is a stylish outfit recommendation based on your selection. (Ollama connection failed, this is a placeholder)."
        }

# Mount static files (Frontend) - Must be last to avoid overriding API routes
app.mount("/", StaticFiles(directory=".", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
