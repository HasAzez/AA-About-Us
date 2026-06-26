import bpy, sys

bpy.ops.wm.read_factory_settings(use_empty=True)

glb = r"c:\Users\owgue\OneDrive\Desktop\AA-About-Us-master\AA-About-Us-master\assets\3D\Acclimation-Animation2.glb"
bpy.ops.import_scene.gltf(filepath=glb)

print("\n=== MESH OBJECTS ===")
all_objs = list(bpy.context.scene.objects)
mesh_objs = [o for o in all_objs if o.type == 'MESH']
print(f"Total mesh count: {len(mesh_objs)}")
for obj in sorted(mesh_objs, key=lambda o: o.name)[:30]:
    d = obj.dimensions
    print(f"  {obj.name:50s} dims=({d.x:.2f},{d.y:.2f},{d.z:.2f})")

print("\n=== ANIMATIONS ===")
print(f"Total actions: {len(bpy.data.actions)}")
for a in list(bpy.data.actions)[:10]:
    print(f"  {a.name}  frames={a.frame_range[0]:.0f}-{a.frame_range[1]:.0f}")

print("\n=== SCENE BOUNDING BOX ===")
import mathutils
min_co = mathutils.Vector((float('inf'),)*3)
max_co = mathutils.Vector((float('-inf'),)*3)
for obj in mesh_objs:
    for corner in obj.bound_box:
        world = obj.matrix_world @ mathutils.Vector(corner)
        min_co = mathutils.Vector(map(min, zip(min_co, world)))
        max_co = mathutils.Vector(map(max, zip(max_co, world)))
span = max(max_co.x - min_co.x, max_co.z - min_co.z)
print(f"  span XZ = {span:.2f}")
print(f"  threshold (span*0.6) = {span*0.6:.2f}")
for obj in sorted(mesh_objs, key=lambda o: o.name)[:20]:
    d = obj.dimensions
    footprint = max(d.x, d.z)
    hidden = footprint > span * 0.6
    print(f"  {'HIDDEN' if hidden else 'VISIBLE':7s} {obj.name:40s} footprint={footprint:.2f}")
print("Done.")
