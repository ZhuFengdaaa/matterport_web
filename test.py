import MatterSim
import math
import json

GRAPHS = 'connectivity/'
WIDTH=640
HEIGHT=480
VFOV=60
VIEWPOINT_SIZE = 36

def load_viewpointids():
    viewpointIds = []
    with open(GRAPHS+'scans.txt') as f:
        scans = [scan.strip() for scan in f.readlines()]
        for scan in scans:
            with open(GRAPHS+scan+'_connectivity.json')  as j:
                data = json.load(j)
                for item in data:
                    if item['included']:
                        viewpointIds.append((scan, item['image_id']))
    print('Loaded %d viewpoints' % len(viewpointIds))
    return viewpointIds

viewpointIds = load_viewpointids()

scanId, viewpointId = viewpointIds[0]

sim = MatterSim.Simulator()
sim.setCameraResolution(WIDTH, HEIGHT)
sim.setCameraVFOV(math.radians(VFOV))
sim.setDiscretizedViewingAngles(True)
sim.setBatchSize(1)
sim.initialize()

sim.newEpisode([scanId], [viewpointId], [0], [math.radians(-30)])

state = sim.getState()[0]

print(state)
print(state.rgb)
