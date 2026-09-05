import os
from PIL import Image
import math

try:
    from rembg import remove
except ImportError:
    print("rembg is not installed. Please install it.")
    exit(1)

# Base config
CANVAS_SIZE = 2048
BASE_DIR = r"c:\Users\Joshua Jomon\OneDrive\Desktop\dragon fruit\homefarm\assets\images\varieties"
OUTPUT_DIR = r"c:\Users\Joshua Jomon\OneDrive\Desktop\dragon fruit\homefarm\assets\dragon-fruit"

# Define the 15 frames
# scale, tx, ty, rotation (degrees counter-clockwise in PIL)
# Simulating a roll from left to right (-x to +x)
FRAMES = [
    (0.65, -700, 0,  45), # 001 Far Entry
    (0.70, -550, 0,  35), # 002 Entry
    (0.75, -400, 0,  25), # 003 Early Roll
    (0.85, -250, 0,  15), # 004 Roll-in
    (0.92, -120, 0,   7), # 005 Approach
    (0.97,  -50, 0,   3), # 006 Hero Approach
    (0.99,  -10, 0,   1), # 007 Center Arrival
    (1.00,    0, 0,   0), # 008 Hero
    (1.00,    0, 0,   0), # 009 Hero Hold
    (1.00,    5, 0,   0), # 010 Hero Settle
    (0.98,   25, 0,  -1), # 011 Exit Prep
    (0.90,  120, 0,  -7), # 012 Roll-out
    (0.80,  300, 0, -18), # 013 Exit
    (0.70,  550, 0, -32), # 014 Far Exit
    (0.60,  800, 0, -45), # 015 Off-screen
]

cultivars = [
    "01-american-beauty",
    "02-costa-rican-white",
    "03-ecuador-palora-yellow",
    "04-israel-yellow",
    "05-makisupa-red",
    "06-malaysian-red",
    "07-mexican-red",
    "08-moroccan-red",
    "09-natural-mystic",
    "10-purple-haze",
    "11-super-nova",
    "12-thompson",
    "13-voodoo-child"
]

def map_name(name):
    # the directories in varieties are just name without prefix.
    # e.g. "01-american-beauty" -> "american-beauty"
    return name.split("-", 1)[1]

def process():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    for cult in cultivars:
        base_name = map_name(cult)
        source_file = os.path.join(BASE_DIR, f"{base_name}-cut.jpg")
        
        if not os.path.exists(source_file):
            print(f"Missing source file: {source_file}")
            continue
            
        print(f"Processing {cult}...")
        
        # 1. Load image and remove background
        try:
            img = Image.open(source_file).convert("RGBA")
            cutout = remove(img)
            
            # Crop to bounding box to center the fruit perfectly
            bbox = cutout.getbbox()
            if bbox:
                cutout = cutout.crop(bbox)
            
            # 2. Prepare output dir
            out_frames_dir = os.path.join(OUTPUT_DIR, cult, "frames")
            os.makedirs(out_frames_dir, exist_ok=True)
            
            # We need a base size to fit within 2048x2048 at scale 1.0.
            # 1400px gives it a nice premium look on a 2048 canvas.
            max_dim = max(cutout.width, cutout.height)
            target_hero_dim = 1400
            hero_scale = target_hero_dim / max_dim
            new_size = (int(cutout.width * hero_scale), int(cutout.height * hero_scale))
            cutout = cutout.resize(new_size, Image.Resampling.LANCZOS)
            
            # 3. Generate 15 frames
            for frame_idx, (scale, tx, ty, rot) in enumerate(FRAMES):
                frame_num = frame_idx + 1
                
                # Create transparent 2048x2048 canvas
                canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
                
                # Rotate first, then scale
                frame_fruit = cutout.rotate(rot, resample=Image.Resampling.BICUBIC, expand=True)
                f_w, f_h = frame_fruit.size
                
                # Apply scale
                s_w, s_h = int(f_w * scale), int(f_h * scale)
                if s_w > 0 and s_h > 0:
                    frame_fruit = frame_fruit.resize((s_w, s_h), Image.Resampling.LANCZOS)
                    
                    # Calculate placement to center it, then translate
                    paste_x = (CANVAS_SIZE - s_w) // 2 + tx
                    paste_y = (CANVAS_SIZE - s_h) // 2 + ty
                    
                    canvas.paste(frame_fruit, (paste_x, paste_y), mask=frame_fruit)
                
                # Save frame
                out_file = os.path.join(out_frames_dir, f"frame-{frame_num:03d}.png")
                canvas.save(out_file, "PNG")
                
            print(f"  Finished {cult}: generated 15 frames.")
        except Exception as e:
            print(f"  Failed {cult}: {e}")

if __name__ == "__main__":
    process()
