import os
import sys  # <-- Add this import
os.add_dll_directory(r"C:\ffmpeg\bin")
import subprocess

def separate_audio(input_file):
    """
    Uses Demucs to separate vocals from the background music.
    """
    print(f"--- Starting separation for: {input_file} ---")
    
    # We replaced "python" with sys.executable so it stays inside your venv
    command = [
            sys.executable, "-m", "demucs", 
            "--two-stems=vocals", 
            input_file, 
            "-o", "output"
        ]
    
    try:
        subprocess.run(command, check=True)
        print("--- Separation Complete! Check the 'output' folder. ---")
    except Exception as e:
        print(f"Error during separation: {e}")

if __name__ == "__main__":
    your_test_file = "song.mp3" 
    
    if os.path.exists(your_test_file):
        separate_audio(your_test_file)
    else:
        print(f"Please put a file named '{your_test_file}' in this folder to test.")