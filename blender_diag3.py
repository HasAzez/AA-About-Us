import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
glb = r"c:\Users\owgue\OneDrive\Desktop\AA-About-Us-master\AA-About-Us-master\assets\3D\Acclimation-Animation2.glb"
bpy.ops.import_scene.gltf(filepath=glb)

print("\n=== ALL ANIMATION DURATIONS ===")
from collections import Counter
durations = []
for a in bpy.data.actions:
    frames = int(a.frame_range[1] - a.frame_range[0])
    durations.append(frames)
    print(f"  {a.name:50s}  frames={frames}")

print("\n=== SUMMARY ===")
c = Counter(durations)
for length, count in sorted(c.items()):
    print(f"  {length} frames: {count} action(s)")
print("Done.")
