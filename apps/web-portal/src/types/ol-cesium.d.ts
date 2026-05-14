declare module 'ol-cesium' {
  import Map from 'ol/Map';
  import { Scene } from 'cesium';

  export default class OLCesium {
    constructor(options: { map: Map; target?: Element | string; sceneOptions?: any });
    setEnabled(enabled: boolean): any;
    getEnabled(): boolean;
    getCesiumScene(): Scene;
    getDataSourceDisplay(): any;
    enableAutoRenderLoop(): void;
  }
}

declare module 'ol-cesium/dist/olcesium.js' {
  export * from 'ol-cesium';
}
