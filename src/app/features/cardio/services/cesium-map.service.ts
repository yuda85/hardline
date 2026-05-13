import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import {
  CardioBounds,
  RawTrackPoint,
  TelemetrySample,
} from '../../../core/models/cardio-session.model';
import { RouteEncodingService } from './route-encoding.service';

// Cesium is loaded dynamically. Use a wide structural type for the bits we touch
// so we don't pull in @types from the bundle.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CesiumNamespace = any;

interface LiveViewerHandle {
  /** Append a freshly recorded point. */
  push(point: { lat: number; lng: number; ele: number | null }): void;
  /** Destroy the viewer and release the WebGL context. */
  destroy(): void;
}

interface ReplayViewerHandle {
  destroy(): void;
  /** Start the timed fly-through animation. */
  play(): void;
  /** Pause the animation. */
  pause(): void;
  /** Reset the camera/playhead to the start of the track. */
  reset(): void;
}

/**
 * Owns the lifecycle of Cesium viewers — both the lightweight live tracking
 * map and the full-quality post-activity 3D fly-through.
 *
 * Cesium itself is dynamically imported the first time a viewer is mounted,
 * so the ~3MB bundle stays out of the initial app shell.
 */
@Injectable({ providedIn: 'root' })
export class CesiumMapService {
  private cesiumPromise: Promise<CesiumNamespace> | null = null;

  constructor(private readonly encoder: RouteEncodingService) {}

  async loadCesium(): Promise<CesiumNamespace> {
    if (!this.cesiumPromise) {
      this.cesiumPromise = (async () => {
        // The asset glob copies Cesium's static workers/widgets here.
        (window as unknown as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = '/cesium/';
        // Cesium ships its CSS as a static asset rather than re-exporting it.
        this.injectStylesheet('/cesium/Widgets/widgets.css');
        const C = await import('cesium');
        if (environment.cesiumIonToken) {
          C.Ion.defaultAccessToken = environment.cesiumIonToken;
        }
        return C as unknown as CesiumNamespace;
      })();
    }
    return this.cesiumPromise;
  }

  /**
   * Mount a battery-friendly live tracking viewer: 2D scene, ellipsoid terrain,
   * Bing aerial via Ion, render-on-demand, no widgets.
   */
  async mountLive(container: HTMLElement): Promise<LiveViewerHandle> {
    const C = await this.loadCesium();

    // Wait until the container has a real layout box. Without this Cesium
    // can initialise into a 0×0 canvas and stay invisible.
    await this.waitForLayout(container);

    let imagery: unknown;
    try {
      imagery = await C.IonImageryProvider.fromAssetId(2); // Bing Maps Aerial
    } catch {
      imagery = new C.UrlTemplateImageryProvider({
        url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c'],
        maximumLevel: 19,
      });
    }

    const viewer = new C.Viewer(container, {
      terrainProvider: new C.EllipsoidTerrainProvider(),
      baseLayer: new C.ImageryLayer(imagery, {}),
      sceneMode: C.SceneMode.SCENE2D,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      baseLayerPicker: false,
      navigationHelpButton: false,
      requestRenderMode: true,
      maximumRenderTimeChange: Infinity,
    });

    viewer.scene.fog.enabled = false;
    viewer.scene.skyAtmosphere.show = false;
    viewer.scene.globe.enableLighting = false;
    viewer.scene.backgroundColor = C.Color.fromCssColorString('#050a0c');
    viewer.scene.screenSpaceCameraController.enableTilt = false;
    viewer.scene.screenSpaceCameraController.enableLook = false;
    this.hideCesiumCredits(viewer);

    // Sensible default view (world-ish) so the canvas is never blank.
    viewer.camera.setView({
      destination: C.Rectangle.fromDegrees(-30, 25, 50, 70),
    });
    viewer.scene.requestRender();

    // Track container size changes (CSS transitions, orientation, etc.) and
    // tell Cesium to resize so the canvas always fills its parent.
    const ro = new ResizeObserver(() => {
      viewer.resize();
      viewer.scene.requestRender();
    });
    ro.observe(container);

    const positions: Array<{ lon: number; lat: number; alt: number }> = [];
    let cartesians: unknown[] = [];

    viewer.entities.add({
      polyline: {
        positions: new C.CallbackProperty(() => cartesians, false),
        width: 5,
        material: new C.PolylineGlowMaterialProperty({
          glowPower: 0.25,
          color: C.Color.fromCssColorString('#3cd7ff'),
        }),
        clampToGround: true,
      },
    });

    const playerPositionProp = new C.CallbackProperty(() => {
      if (positions.length === 0) return undefined;
      const last = positions[positions.length - 1];
      return C.Cartesian3.fromDegrees(last.lon, last.lat, last.alt);
    }, false);

    // Soft cyan halo around the player position.
    viewer.entities.add({
      position: playerPositionProp,
      point: {
        pixelSize: 36,
        color: C.Color.fromCssColorString('#3cd7ff').withAlpha(0.18),
      },
    });

    // Solid player dot.
    viewer.entities.add({
      position: playerPositionProp,
      point: {
        pixelSize: 16,
        color: C.Color.fromCssColorString('#3cd7ff'),
        outlineColor: C.Color.fromCssColorString('#003642'),
        outlineWidth: 3,
      },
    });

    let initialized = false;
    const ZOOM_M = 1200;

    return {
      push: ({ lat, lng, ele }) => {
        positions.push({ lon: lng, lat, alt: ele ?? 0 });
        cartesians = positions.map(p => C.Cartesian3.fromDegrees(p.lon, p.lat, p.alt));

        if (!initialized) {
          viewer.camera.flyTo({
            destination: C.Cartesian3.fromDegrees(lng, lat, ZOOM_M),
            duration: 0.6,
          });
          initialized = true;
        } else if (positions.length % 3 === 0) {
          // Keep camera roughly centred on the user without fighting a manual pan
          // on every single tick.
          viewer.camera.setView({
            destination: C.Cartesian3.fromDegrees(lng, lat, ZOOM_M),
          });
        }
        viewer.scene.requestRender();
      },
      destroy: () => {
        try {
          ro.disconnect();
        } catch {
          /* noop */
        }
        try {
          viewer.destroy();
        } catch {
          /* noop */
        }
      },
    };
  }

  /**
   * Resolve once the element has a non-zero box, with a bail-out timeout. This
   * is the most common cause of "Cesium renders into a 0×0 canvas and stays
   * blank" — the viewer is created before flex/layout has placed its parent.
   */
  private waitForLayout(el: HTMLElement, timeoutMs = 1500): Promise<void> {
    return new Promise(resolve => {
      const start = performance.now();
      const tick = () => {
        if (el.clientWidth > 0 && el.clientHeight > 0) {
          resolve();
          return;
        }
        if (performance.now() - start > timeoutMs) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  private hideCesiumCredits(viewer: { creditDisplay?: { container?: HTMLElement } }): void {
    try {
      const credits = viewer.creditDisplay?.container;
      if (credits) credits.style.display = 'none';
    } catch {
      /* noop */
    }
  }

  /**
   * Mount a high-fidelity replay viewer with terrain + 3D imagery and play
   * a timed fly-through along the recorded route.
   */
  async mountReplay(
    container: HTMLElement,
    polyline: string,
    telemetry: TelemetrySample[] | undefined,
    bounds: CardioBounds,
  ): Promise<ReplayViewerHandle> {
    const C = await this.loadCesium();

    let imageryProvider;
    try {
      imageryProvider = await C.IonImageryProvider.fromAssetId(2);
    } catch {
      imageryProvider = new C.UrlTemplateImageryProvider({
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        maximumLevel: 19,
      });
    }

    let terrainProvider;
    try {
      terrainProvider = await C.createWorldTerrainAsync();
    } catch {
      terrainProvider = new C.EllipsoidTerrainProvider();
    }

    const viewer = new C.Viewer(container, {
      terrainProvider,
      baseLayer: new C.ImageryLayer(imageryProvider, {}),
      animation: true,
      timeline: true,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      baseLayerPicker: false,
      navigationHelpButton: false,
    });

    viewer.scene.globe.enableLighting = true;
    viewer.scene.skyAtmosphere.show = true;

    const points = this.encoder.decodePolyline(polyline);
    if (points.length === 0) {
      return {
        destroy: () => viewer.destroy(),
        play: () => {},
        pause: () => {},
        reset: () => {},
      };
    }

    // Build a position property timed against the telemetry samples.
    const start = C.JulianDate.now();
    const stop = C.JulianDate.addSeconds(
      start,
      Math.max(60, telemetry?.[telemetry.length - 1]?.t ?? points.length),
      new C.JulianDate(),
    );
    viewer.clock.startTime = start.clone();
    viewer.clock.stopTime = stop.clone();
    viewer.clock.currentTime = start.clone();
    viewer.clock.clockRange = C.ClockRange.CLAMPED;
    viewer.clock.multiplier = 10;

    const positionProperty = new C.SampledPositionProperty();
    positionProperty.setInterpolationOptions({
      interpolationDegree: 2,
      interpolationAlgorithm: C.LagrangePolynomialApproximation,
    });

    const samples = telemetry && telemetry.length >= 2 ? telemetry : null;
    if (samples) {
      // Distribute polyline points proportionally across telemetry timestamps.
      const totalDist = samples[samples.length - 1].d || 1;
      let acc = 0;
      let pi = 1;
      positionProperty.addSample(start, C.Cartesian3.fromDegrees(points[0].lng, points[0].lat));
      for (let si = 1; si < samples.length; si++) {
        const sample = samples[si];
        const targetDist = sample.d;
        while (pi < points.length - 1 && acc < targetDist) {
          acc += this.encoder.haversineMeters(points[pi - 1], points[pi]);
          pi++;
        }
        const t = C.JulianDate.addSeconds(start, sample.t, new C.JulianDate());
        const p = points[Math.min(pi, points.length - 1)];
        const elev = sample.ele ?? 0;
        positionProperty.addSample(t, C.Cartesian3.fromDegrees(p.lng, p.lat, elev));
        if (acc >= totalDist) break;
      }
    } else {
      const totalSec = points.length;
      points.forEach((p, i) => {
        const t = C.JulianDate.addSeconds(start, (i / points.length) * totalSec, new C.JulianDate());
        positionProperty.addSample(t, C.Cartesian3.fromDegrees(p.lng, p.lat));
      });
    }

    const cartesians = points.map(p => C.Cartesian3.fromDegrees(p.lng, p.lat));

    viewer.entities.add({
      polyline: {
        positions: cartesians,
        width: 6,
        material: new C.PolylineGlowMaterialProperty({
          glowPower: 0.3,
          color: C.Color.fromCssColorString('#3cd7ff'),
        }),
        clampToGround: true,
      },
    });

    const rider = viewer.entities.add({
      position: positionProperty,
      point: {
        pixelSize: 14,
        color: C.Color.fromCssColorString('#3cd7ff'),
        outlineColor: C.Color.fromCssColorString('#003642'),
        outlineWidth: 3,
      },
      path: {
        leadTime: 0,
        trailTime: 60,
        width: 4,
        material: new C.PolylineGlowMaterialProperty({
          glowPower: 0.4,
          color: C.Color.fromCssColorString('#ffb595'),
        }),
      },
    });
    viewer.trackedEntity = rider;

    // Fit camera to the route's bounding rectangle so users see the whole loop initially.
    const rect = C.Rectangle.fromDegrees(
      bounds.minLng,
      bounds.minLat,
      bounds.maxLng,
      bounds.maxLat,
    );
    viewer.camera.flyTo({
      destination: rect,
      duration: 1.5,
    });

    viewer.clock.shouldAnimate = false;

    return {
      destroy: () => {
        try {
          viewer.destroy();
        } catch {
          /* noop */
        }
      },
      play: () => {
        viewer.trackedEntity = rider;
        viewer.clock.shouldAnimate = true;
      },
      pause: () => {
        viewer.clock.shouldAnimate = false;
      },
      reset: () => {
        viewer.clock.currentTime = viewer.clock.startTime.clone();
        viewer.trackedEntity = undefined;
        viewer.camera.flyTo({ destination: rect, duration: 1.2 });
      },
    };
  }

  private injectStylesheet(href: string): void {
    if (typeof document === 'undefined') return;
    const id = `cesium-css-${href}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }
}

export type { LiveViewerHandle, ReplayViewerHandle };
