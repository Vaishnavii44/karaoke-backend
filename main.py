from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import subprocess
import sys
import shutil

from effects import apply_studio_effects 
BASE_URL = "https://karaoke-backend-xbr1.onrender.com"

app = FastAPI(title="AI Karaoke API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Create a public folder for React to access files
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Helper function to create a video from audio + background.jpg
def create_video_export(audio_path, output_video_path):
    image_path = "background.jpg"
    if not os.path.exists(image_path):
        print("Warning: background.jpg not found. Skipping video export.")
        return False
    
    try:
        # FFmpeg command to loop image and merge with audio
        command = [
            "ffmpeg", "-y",
            "-loop", "1", "-i", image_path,
            "-i", audio_path,
            "-c:v", "libx264", "-tune", "stillimage",
            "-c:a", "aac", "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-shortest", output_video_path
        ]
        subprocess.run(command, check=True)
        return True
    except Exception as e:
        print(f"Video export failed: {e}")
        return False

@app.post("/api/edit-audio")
async def edit_audio(
    file: UploadFile = File(...),
    pitch: int = Form(0),
    volume: float = Form(0.0),
    reverb: float = Form(0.0),
    remove_vocals: str = Form("false") # Changed to str to fix the 422 error
):
    # Fix: Convert the string "true"/"false" from React back to a Python boolean
    is_vocal_task = remove_vocals.lower() == "true"
    
    print(f"Received file: {file.filename} | Task: {'Vocal Removal' if is_vocal_task else 'Studio Effects'}")
    
    input_path = f"temp_{file.filename}"
    clean_name = os.path.splitext(file.filename)[0]
    
    with open(input_path, "wb") as buffer:
        buffer.write(await file.read())

    if is_vocal_task:
        print("--- Running AI Vocal Removal... ---")
        try:
            command = [sys.executable, "-m", "demucs", "--two-stems=vocals", input_path, "-o", "output"]
            subprocess.run(command, check=True)
            
            folder_name = os.path.splitext(input_path)[0]
            demucs_inst = os.path.join("output", "htdemucs", folder_name, "no_vocals.wav")
            demucs_voc = os.path.join("output", "htdemucs", folder_name, "vocals.wav")
            
            final_inst = f"static/inst_{clean_name}.wav"
            final_voc = f"static/voc_{clean_name}.wav"
            final_video = f"static/video_{clean_name}.mp4"
            
            shutil.copy(demucs_voc, final_voc) 
            
            print("--- Applying Studio Effects to Instrumental ---")
            apply_studio_effects(
                input_file=demucs_inst,
                output_file=final_inst,
                pitch=pitch,
                volume_db=volume,
                reverb_amount=reverb
            )
            
            # Mission 2: Generate Video for the Instrumental
            create_video_export(final_inst, final_video)
            
            return {
                "instrumental_url": f"{BASE_URL}/{final_inst}",
                "vocals_url": f"{BASE_URL}/{final_voc}",
                "video_url": f"{BASE_URL}/{final_video}"
            }
            
        except Exception as e:
            return {"error": f"Vocal separation failed: {str(e)}"}

    else:
        print("--- Applying Studio Effects ---")
        try:
            final_edited = f"static/edited_{clean_name}.wav"
            final_video = f"static/video_edited_{clean_name}.mp4"

            apply_studio_effects(
                input_file=input_path,
                output_file=final_edited,
                pitch=pitch,
                volume_db=volume,
                reverb_amount=reverb
            )

            # Mission 2: Generate Video for the Edited Audio
            create_video_export(final_edited, final_video)

            return {
                "edited_url": f"{BASE_URL}/{final_edited}",
                "video_url": f"{BASE_URL}/{final_video}"
            }
        except Exception as e:
            return {"error": f"Failed to apply effects: {str(e)}"}