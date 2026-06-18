import bpy, sys

bpy.ops.wm.read_factory_settings(use_empty=True)

glb = r"c:\Users\owgue\OneDrive\Desktop\AA-About-Us-master\AA-About-Us-master\assets\3D\Acclimation-Animation.glb"
bpy.ops.import_scene.gltf(filepath=glb)

print("\n=== MESH OBJECTS ===")
for obj in sorted(bpy.context.scene.objects, key=lambda o: o.name):
    if obj.type == 'MESH':
        l = obj.location
        d = obj.dimensions
        print(f"{obj.name:50s} loc=({l.x:7.2f},{l.y:7.2f},{l.z:7.2f})  dims=({d.x:.2f},{d.y:.2f},{d.z:.2f})")

print("\n=== ANIMATIONS ===")
for a in bpy.data.actions:
    print(f"  Action: {a.name}  frames={a.frame_range[0]:.0f}-{a.frame_range[1]:.0f}")
print("Done.")
