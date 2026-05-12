import OLCesium from "ol-cesium"
import Map from "ol/Map"
import * as Cesium from "cesium"
import { CesiumFeatureStyler } from "./CesiumFeatureStyler"

/**
 * Manages the synchronization between an OpenLayers Map and a Cesium scene
 * using the ol-cesium bridge library.
 *
 * ol-cesium mirrors the OL view (pan, zoom, rotation) into the Cesium camera
 * and replicates OL tile/vector layers into the Cesium scene automatically.
 */
export class CesiumSyncManager {
  private olMap: Map
  private olcs: OLCesium | null = null

  constructor(olMap: Map) {
    this.olMap = olMap
  }

  /**
   * Initialize ol-cesium and mount the Cesium canvas into the given DOM element.
   */
  public initialize(_targetElement: HTMLDivElement): OLCesium {
    if (this.olcs) return this.olcs

    // ol-cesium often expects Cesium to be available on the global object
    if (typeof window !== "undefined" && !(window as any).Cesium) {
      ;(window as any).Cesium = Cesium
    }

    // Handle potential ESM/CJS interop issues with Vite
    const OLCesiumClass = (OLCesium as any).default || OLCesium

    this.olcs = new OLCesiumClass({
      map: this.olMap,
      target: "map3d",
    })

    const scene = this.olcs.getCesiumScene()
    this.configureScene(scene)

    // Listen for new entities to apply 3D styles/extrusion
    this.setupVectorStyling()

    // Enable sync — this starts the Cesium render loop and camera sync
    this.olcs
      .setEnabled(true)(
        // Enable auto render loop as per ol-cesium examples
        this.olcs as any
      )
      .enableAutoRenderLoop()

    // Enable shadows for vector layers
    this.olMap.getLayers().forEach((layer) => {
      if (
        layer instanceof (window as any).ol?.layer?.Vector ||
        (layer as any).getSource?.()?.getFeatures
      ) {
        layer.set("olcs_shadows", true)
        console.log(
          `[CesiumSyncManager] Enabled shadows for vector layer: ${layer.get("name") || "unnamed"}`
        )
      }
    })

    console.log(
      `[CesiumSyncManager] Synchronizing layers to 3D. Map has ${this.olMap.getLayers().getLength()} layers.`
    )

    return this.olcs
  }

  private setupVectorStyling() {
    if (!this.olcs) return

    const scene = this.olcs.getCesiumScene()

    // Periodically check for new entities in all data sources
    scene.preRender.addEventListener(() => {
      if (!this.olcs) return

      const dataSources = (this.olcs as any).getDataSources()
      if (!dataSources) return

      const length =
        typeof dataSources.length === "number"
          ? dataSources.length
          : dataSources.count
            ? dataSources.count()
            : 0
      for (let i = 0; i < length; i++) {
        const ds = dataSources.get ? dataSources.get(i) : dataSources[i]
        if (!ds || !ds.entities) continue

        const entities = ds.entities.values
        if (!entities) continue

        for (const entity of entities) {
          // Check if we've already styled this entity
          if (!(entity as any)._isStyled3D) {
            // Get the original OpenLayers feature
            // ol-cesium stores the original feature in entity.olFeature
            const olFeature = (entity as any).olFeature
            if (olFeature) {
              CesiumFeatureStyler.apply3DStyles(entity, olFeature)
              ;(entity as any)._isStyled3D = true
            }
          }
        }
      }
    })
  }

  private configureScene(scene: Cesium.Scene) {
    // Modern terrain API (Cesium 1.106+)
    Cesium.createWorldTerrainAsync()
      .then((terrainProvider) => {
        scene.terrainProvider = terrainProvider
      })
      .catch(() => {
        // Graceful fallback — ellipsoid terrain
        console.warn(
          "[CesiumSyncManager] World terrain unavailable, using ellipsoid fallback"
        )
      })

    // Visual quality
    scene.globe.enableLighting = true
    scene.globe.depthTestAgainstTerrain = false // Prevent features from being buried under terrain
    scene.verticalExaggeration = 1.5

    if (scene.shadowMap) {
      scene.shadowMap.enabled = true
    }

    // Remove default attribution credit (we have our own)
    if ((scene as any).frameState?.creditDisplay) {
      ;(scene as any).frameState.creditDisplay.beginFrame()
    }
  }

  public setEnabled(enabled: boolean) {
    this.olcs?.setEnabled(enabled)
  }

  public getOlCesium(): OLCesium | null {
    return this.olcs
  }

  public destroy() {
    if (this.olcs) {
      this.olcs.setEnabled(false)
      this.olcs = null
    }
  }
}
