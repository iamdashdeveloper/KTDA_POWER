from fastapi import FastAPI, HTTPException
from pyswmm import Simulation, Nodes
import os

app = FastAPI(title="KTDA Hydro Modeling Service")

# Standard SWMM Sample path
MODEL_PATH = "models/Site_Drainage_Model.inp"

@app.get("/simulate/node/{node_id}")
def get_node_status(node_id: str):
    if not os.path.exists(MODEL_PATH):
        raise HTTPException(status_code=404, detail="SWMM .inp file not found")

    try:
        max_depth = 0.0
        last_status = {}

        with Simulation(MODEL_PATH) as sim:
            # Check if the requested node exists in the model
            nodes = Nodes(sim)
            if node_id not in nodes:
                return {"status": "error", "message": f"Node '{node_id}' not found in model."}
            
            target_node = nodes[node_id]
            
            # Efficiently step through the simulation
            for _ in sim:
                current_depth = round(target_node.depth, 3)
                if current_depth > max_depth:
                    max_depth = current_depth
                
                # Update the 'latest' status
                last_status = {
                    "time": str(sim.current_time),
                    "depth_meters": current_depth,
                    "flooding": round(target_node.flooding, 4)
                }
        
        return {
            "node_id": node_id,
            "max_depth_observed": max_depth,
            "final_state": last_status
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}