import React, { useEffect, useRef } from 'react';
import { Map } from 'ol';
import { Draw } from 'ol/interaction';
import { getArea, getLength } from 'ol/sphere';
import Overlay from 'ol/Overlay';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { LineString, Polygon } from 'ol/geom';
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import { unByKey } from 'ol/Observable';
import { useMapStore } from '@/store/useMapStore';

interface MeasureLogicProps {
  map: Map;
  activeTool: string;
}

export const MeasureLogic: React.FC<MeasureLogicProps> = ({ map, activeTool }) => {
  const drawRef = useRef<Draw | null>(null);
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const helpTooltipRef = useRef<Overlay | null>(null);
  const measureTooltipRef = useRef<Overlay | null>(null);
  const sketchRef = useRef<any>(null);
  const listenerRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;

    // Create measurement layer if it doesn't exist
    if (!layerRef.current) {
      const source = new VectorSource();
      layerRef.current = new VectorLayer({
        source: source,
        style: new Style({
          fill: new Fill({
            color: 'rgba(255, 255, 255, 0.2)',
          }),
          stroke: new Stroke({
            color: '#ffcc33',
            width: 2,
          }),
          image: new CircleStyle({
            radius: 7,
            fill: new Fill({
              color: '#ffcc33',
            }),
          }),
        }),
      });
      map.addLayer(layerRef.current);
    }

    const isActive = activeTool === 'measure-distance' || activeTool === 'measure-area';

    if (isActive) {
      addInteraction();
    } else {
      removeInteraction();
    }

    return () => {
      removeInteraction();
    };
  }, [activeTool, map]);

  // Handle Clear Command
  const currentCommand = useMapStore(state => state.currentCommand);
  useEffect(() => {
    if (currentCommand?.id === 'clear-measurements' && layerRef.current && map) {
      // Clear features
      layerRef.current.getSource()?.clear();
      
      // Clear all measure tooltips
      const overlays = map.getOverlays().getArray();
      const tooltips = overlays.filter(o => {
        const el = o.getElement();
        return el && (el.classList.contains('ol-tooltip-static') || el.classList.contains('ol-tooltip-measure'));
      });
      
      tooltips.forEach(t => map.removeOverlay(t));
      
      // Recreate the active measure tooltip if we are currently drawing
      if (activeTool === 'measure-distance' || activeTool === 'measure-area') {
        createMeasureTooltip();
      }
    }
  }, [currentCommand, map, activeTool]);

  const addInteraction = () => {
    const type = activeTool === 'measure-area' ? 'Polygon' : 'LineString';
    
    const draw = new Draw({
      source: layerRef.current!.getSource()!,
      type: type,
      style: new Style({
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.2)',
        }),
        stroke: new Stroke({
          color: 'rgba(0, 0, 0, 0.5)',
          lineDash: [10, 10],
          width: 2,
        }),
        image: new CircleStyle({
          radius: 5,
          stroke: new Stroke({
            color: 'rgba(0, 0, 0, 0.7)',
          }),
          fill: new Fill({
            color: 'rgba(255, 255, 255, 0.2)',
          }),
        }),
      }),
    });
    
    map.addInteraction(draw);
    drawRef.current = draw;

    createHelpTooltip();
    createMeasureTooltip();

    let listener: any;
    draw.on('drawstart', (evt) => {
      // set sketch
      sketchRef.current = evt.feature;

      /** @type {import("ol/coordinate").Coordinate|undefined} */
      let tooltipCoord = (evt as any).coordinate;

      listener = sketchRef.current.getGeometry().on('change', (evt: any) => {
        const geom = evt.target;
        let output;
        if (geom instanceof Polygon) {
          output = formatArea(geom);
          tooltipCoord = geom.getInteriorPoint().getCoordinates();
        } else if (geom instanceof LineString) {
          output = formatLength(geom);
          tooltipCoord = geom.getLastCoordinate();
        }
        measureTooltipRef.current!.getElement()!.innerHTML = output || '';
        measureTooltipRef.current!.setPosition(tooltipCoord);
      });
      listenerRef.current = listener;
    });

    draw.on('drawend', () => {
      measureTooltipRef.current!.getElement()!.className = 'ol-tooltip ol-tooltip-static';
      measureTooltipRef.current!.setOffset([0, -7]);
      // unset sketch
      sketchRef.current = null;
      // unset tooltip so that a new one can be created
      measureTooltipRef.current = null;
      createMeasureTooltip();
      unByKey(listenerRef.current);
    });

    map.on('pointermove', pointerMoveHandler);
  };

  const removeInteraction = () => {
    if (drawRef.current) {
      map.removeInteraction(drawRef.current);
      drawRef.current = null;
    }
    map.un('pointermove', pointerMoveHandler);
    
    if (helpTooltipRef.current) {
      map.removeOverlay(helpTooltipRef.current);
      helpTooltipRef.current = null;
    }
    
    // Note: We don't remove existing measurement tooltips as they are "static" now
  };

  const pointerMoveHandler = (evt: any) => {
    if (evt.dragging) return;
    
    let helpMsg = 'Click to start drawing';
    if (sketchRef.current) {
      helpMsg = 'Double click to finish';
    }

    const helpTooltipElement = helpTooltipRef.current?.getElement();
    if (helpTooltipElement) {
      helpTooltipElement.innerHTML = helpMsg;
      helpTooltipRef.current?.setPosition(evt.coordinate);
      helpTooltipElement.classList.remove('hidden');
    }
  };

  const createHelpTooltip = () => {
    if (helpTooltipRef.current) map.removeOverlay(helpTooltipRef.current);
    
    const element = document.createElement('div');
    element.className = 'ol-tooltip hidden bg-black/80 text-white px-2 py-1 rounded text-xs pointer-events-none whitespace-nowrap';
    
    const overlay = new Overlay({
      element: element,
      offset: [15, 0],
      positioning: 'center-left',
    });
    map.addOverlay(overlay);
    helpTooltipRef.current = overlay;
  };

  const createMeasureTooltip = () => {
    const element = document.createElement('div');
    element.className = 'ol-tooltip ol-tooltip-measure bg-white text-black px-2 py-1 rounded text-xs font-bold border border-black/20 pointer-events-none whitespace-nowrap shadow-sm';
    
    const overlay = new Overlay({
      element: element,
      offset: [0, -15],
      positioning: 'bottom-center',
      stopEvent: false,
      insertFirst: false,
    });
    map.addOverlay(overlay);
    measureTooltipRef.current = overlay;
  };

  const formatLength = (line: LineString) => {
    const length = getLength(line);
    let output;
    if (length > 100) {
      output = Math.round((length / 1000) * 100) / 100 + ' ' + 'km';
    } else {
      output = Math.round(length * 100) / 100 + ' ' + 'm';
    }
    return output;
  };

  const formatArea = (polygon: Polygon) => {
    const area = getArea(polygon);
    let output;
    if (area > 10000) {
      output = Math.round((area / 1000000) * 100) / 100 + ' ' + 'km²';
    } else {
      output = Math.round(area * 100) / 100 + ' ' + 'm²';
    }
    return output;
  };

  return null;
};
