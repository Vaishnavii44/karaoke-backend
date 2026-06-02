import librosa
import soundfile as sf
import os
from pedalboard import Pedalboard, PitchShift, Gain, Reverb

def apply_studio_effects(input_file, output_file, pitch=0, volume_db=0.0, reverb_amount=0.0, crop_start=0, crop_end=None):
    """
    Applies Pitch, Volume, Reverb, and Cropping to an audio file.
    """
    print(f"--- Loading {input_file} ---")
    
    # Load the audio in its original high quality
    y, sr = librosa.load(input_file, sr=None)

    # 1. CROP THE AUDIO
    if crop_end is not None:
        # Convert seconds to sample rate indices
        start_sample = int(crop_start * sr)
        end_sample = int(crop_end * sr)
        
        # Slice the audio array
        y = y[start_sample:end_sample]
        print(f"Cropped audio: keeping {crop_start}s to {crop_end}s.")

    # 2. SET UP THE EFFECTS BOARD
    print("Applying Pitch, Volume, and Reverb...")
    board = Pedalboard([
        PitchShift(semitones=pitch),         # Positive = higher pitch, Negative = lower
        Gain(gain_db=volume_db),             # 0 is normal. Positive = louder, Negative = quieter
        Reverb(room_size=reverb_amount)      # 0.0 is completely dry, 1.0 is a massive cave
    ])

    # Apply the effects to the audio array
    effected_audio = board(y, sr)

    # 3. SAVE THE FINAL FILE
    print(f"Saving final track to {output_file}...")
    sf.write(output_file, effected_audio, sr)
    print("--- Studio Effects Applied Successfully! ---")

if __name__ == "__main__":
    # 1. Put the name of ANY audio file you have in your folder here
    source_audio = "song.mp3" 
    
    if os.path.exists(source_audio):
        apply_studio_effects(
            input_file=source_audio,
            output_file="my_edited_song.wav", # The new file it will create
            pitch=2,                 # Shift UP 2 semitones
            volume_db=3.0,           # Make it 3 decibels louder
            reverb_amount=0.4,       # Add a nice, medium room echo
            crop_start=15,           # Skip the first 15 seconds
            crop_end=45              # Stop at the 45-second mark
        )
    else:
        print(f"Could not find '{source_audio}'. Make sure the file is in your ai-karaoke-maker folder!")